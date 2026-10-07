const InsertPendaftaran = {
  sheetName: 'Insert Pendaftaran',
  
  getTransactions: function() {
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.error('NOT_FOUND', 'Sheet Insert Pendaftaran tidak ditemukan');
    
    const data = sheet.getDataRange().getValues();
    const transactions = [];
    
    // Headers: No(0), Tanggal(1), ID(2), Nama(3), Kategori(4), Nominal(5), Bank(6), PJ(7)
    for (let i = 1; i < data.length; i++) {
      if (data[i][2]) { // Cek ID Pendaftaran
        transactions.push({
          no: data[i][0],
          tanggal: data[i][1],
          trx_id: data[i][2],
          nama: data[i][3],
          kategori: data[i][4],
          nominal: data[i][5],
          bank: data[i][6],
          penanggung_jawab: data[i][7]
        });
      }
    }
    
    // Urutkan dari yang terbaru
    transactions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    
    return Response.success('Data pendaftaran berhasil diambil', transactions);
  },
  
  addTransaction: function(body, user) {
    const allowedRoles = ['ROLE-001', 'ROLE-002', 'ROLE-006'];
    if (!user || !allowedRoles.includes(user.role_id)) {
      return Response.error('FORBIDDEN', 'Hanya Bendahara, SC, dan Super Admin yang dapat mencatat pendaftaran.');
    }
    
    if (!body.tanggal || !body.nama || !body.kategori || !body.nominal || !body.bank) {
      return Response.error('BAD_REQUEST', 'Semua form (Tanggal, Nama, Kategori, Nominal, Bank) wajib diisi.');
    }
    
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.error('NOT_FOUND', 'Sheet Insert Pendaftaran tidak ditemukan di Spreadsheet.');
    
    const trxId = Utils.generateSequentialId(this.sheetName, 'REG');
    
    // Hitung Nomor
    const lastRow = sheet.getLastRow();
    let lastNo = 0;
    
    if (lastRow > 1) {
      const lastRowData = sheet.getRange(lastRow, 1, 1, 1).getValues()[0];
      lastNo = Number(lastRowData[0]) || 0;
    }
    
    const no = lastNo + 1;
    const nominal = Number(body.nominal);
    
    sheet.appendRow([
      no,
      body.tanggal,
      trxId,
      body.nama,
      body.kategori,
      nominal,
      body.bank,
      body.penanggung_jawab || user.name
    ]);
    
    let logBody = { ...body };
    delete logBody.token;

    ActivityLogs.log(
      user.user_id, 
      null, 
      user.role_id, 
      'PENDAFTARAN', 
      'ADD_TRANSACTION', 
      `Menambahkan pendaftaran ${body.nama} (${body.kategori})`,
      null,
      logBody
    );
    
    return Response.success('Pendaftaran berhasil ditambahkan.', { trx_id: trxId });
  },
  
  deleteTransaction: function(body, user) {
    const allowedRoles = ['ROLE-001', 'ROLE-002', 'ROLE-006'];
    if (!user || !allowedRoles.includes(user.role_id)) {
      return Response.error('FORBIDDEN', 'Hanya Bendahara, SC, dan Super Admin yang dapat menghapus pendaftaran.');
    }
    
    if (!body.trx_id) {
      return Response.error('BAD_REQUEST', 'ID Pendaftaran wajib diisi.');
    }
    
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.error('NOT_FOUND', 'Sheet Insert Pendaftaran tidak ditemukan.');
    const data = sheet.getDataRange().getValues();
    
    let deletedRowIndex = -1;
    let deletedData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === body.trx_id) { 
        deletedRowIndex = i + 1;
        deletedData = {
          nama: data[i][3],
          kategori: data[i][4],
          nominal: data[i][5]
        };
        break;
      }
    }
    
    if (deletedRowIndex !== -1) {
      sheet.deleteRow(deletedRowIndex);
      
      // Hitung ulang No
      const lastRow = sheet.getLastRow();
      if (lastRow >= deletedRowIndex) {
        const remainingData = sheet.getRange(deletedRowIndex, 1, lastRow - deletedRowIndex + 1, 1).getValues();
        
        for (let j = 0; j < remainingData.length; j++) {
          remainingData[j][0] = deletedRowIndex - 1 + j; 
        }
        
        sheet.getRange(deletedRowIndex, 1, remainingData.length, 1).setValues(remainingData);
      }
      
      ActivityLogs.log(
        user.user_id, 
        null, 
        user.role_id, 
        'PENDAFTARAN', 
        'DELETE_TRANSACTION', 
        `Menghapus pendaftaran ${deletedData.nama}`,
        deletedData,
        null
      );
      
      return Response.success('Pendaftaran berhasil dihapus.');
    }
    
    return Response.error('NOT_FOUND', 'Pendaftaran tidak ditemukan.');
  },

  editTransaction: function(body, user) {
    const allowedRoles = ['ROLE-001', 'ROLE-002', 'ROLE-006'];
    if (!user || !allowedRoles.includes(user.role_id)) {
      return Response.error('FORBIDDEN', 'Hanya Bendahara, SC, dan Super Admin yang dapat mengedit pendaftaran.');
    }
    
    if (!body.trx_id || !body.tanggal || !body.nama || !body.kategori || !body.nominal || !body.bank) {
      return Response.error('BAD_REQUEST', 'Data tidak lengkap.');
    }
    
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.error('NOT_FOUND', 'Sheet Insert Pendaftaran tidak ditemukan.');
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let oldData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === body.trx_id) {
        rowIndex = i + 1;
        oldData = {
          nama: data[i][3],
          kategori: data[i][4],
          nominal: data[i][5]
        };
        break;
      }
    }
    
    if (rowIndex === -1) {
      return Response.error('NOT_FOUND', 'Pendaftaran tidak ditemukan.');
    }
    
    const nominal = Number(body.nominal);
    const no = data[rowIndex - 1][0]; 
    
    sheet.getRange(rowIndex, 1, 1, 8).setValues([[
      no,
      body.tanggal,
      body.trx_id,
      body.nama,
      body.kategori,
      nominal,
      body.bank,
      body.penanggung_jawab || user.name
    ]]);
    
    let logBody = { ...body };
    delete logBody.token;

    ActivityLogs.log(
      user.user_id, 
      null, 
      user.role_id, 
      'PENDAFTARAN', 
      'EDIT_TRANSACTION', 
      `Mengubah pendaftaran ${body.trx_id}`,
      oldData,
      logBody
    );
    
    return Response.success('Pendaftaran berhasil diubah.');
  }
};
