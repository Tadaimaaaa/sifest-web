const KeuanganTerkini = {
  sheetName: 'Keuangan Terkini',
  
  _deleteDriveFile: function(url) {
    if (!url || url === '-' || url.indexOf('drive.google.com') === -1) return;
    try {
      let fileId = null;
      const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchD && matchD[1]) {
        fileId = matchD[1];
      } else {
        const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (matchId && matchId[1]) {
          fileId = matchId[1];
        }
      }
      
      if (fileId) {
        DriveApp.getFileById(fileId).setTrashed(true);
      }
    } catch(e) {
      // Ignore errors silently
    }
  },
  
  getTransactions: function() {
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.error('NOT_FOUND', 'Sheet Keuangan Terkini tidak ditemukan');
    
    const data = sheet.getDataRange().getValues();
    const transactions = [];
    
    // Headers: No(0), Tanggal(1), ID(2), Kategori(3), Debit(4), Kredit(5), Saldo(6), PJ(7)
    for (let i = 1; i < data.length; i++) {
      if (data[i][2]) { // Cek ID Transaksi
        const debit = Number(data[i][4]) || 0;
        const kredit = Number(data[i][5]) || 0;
        transactions.push({
          no: data[i][0],
          tanggal: data[i][1],
          trx_id: data[i][2],
          kategori: data[i][3],
          jenis: debit > 0 ? 'INCOME' : 'EXPENSE',
          nominal: debit > 0 ? debit : kredit,
          saldo_akhir: data[i][6],
          penanggung_jawab: data[i][7]
        });
      }
    }
    
    // Urutkan dari yang terbaru untuk UI (spreadsheet tetap berurutan)
    transactions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    
    return Response.success('Data keuangan terkini berhasil diambil', transactions);
  },
  
  addTransaction: function(body, user) {
    const allowedRoles = ['ROLE-001', 'ROLE-002', 'ROLE-006'];
    if (!user || !allowedRoles.includes(user.role_id)) {
      return Response.error('FORBIDDEN', 'Hanya Bendahara, SC, dan Super Admin yang dapat mencatat keuangan.');
    }
    
    if (!body.tanggal || !body.jenis || !body.nominal) {
      return Response.error('BAD_REQUEST', 'Tanggal, jenis, dan nominal wajib diisi.');
    }
    
    const sheet = Utils.getSheet(this.sheetName);
    const trxId = Utils.generateSequentialId(this.sheetName, 'MUT');
    
    // Hitung Nomor, Masuk, Keluar, dan Saldo Akhir
    const lastRow = sheet.getLastRow();
    let lastNo = 0;
    let lastSaldo = 0;
    
    if (lastRow > 1) {
      const lastRowData = sheet.getRange(lastRow, 1, 1, 8).getValues()[0];
      lastNo = Number(lastRowData[0]) || 0;
      lastSaldo = Number(lastRowData[6]) || 0;
    }
    
    const no = lastNo + 1;
    const nominal = Number(body.nominal);
    const masuk = body.jenis === 'INCOME' ? nominal : 0;
    const keluar = body.jenis === 'EXPENSE' ? nominal : 0;
    const saldoAkhir = lastSaldo + masuk - keluar;
    const jenisText = body.jenis === 'INCOME' ? 'Debit' : 'Kredit';
    
    sheet.appendRow([
      no,
      body.tanggal,
      trxId,
      body.kategori || 'Lainnya',
      masuk,
      keluar,
      saldoAkhir,
      body.penanggung_jawab || user.name
    ]);
    
    let logBody = { ...body };
    delete logBody.fileData;
    delete logBody.token;

    ActivityLogs.log(
      user.user_id, 
      null, 
      user.role_id, 
      'KEUANGAN', 
      'ADD_TRANSACTION', 
      `Menambahkan ${jenisText} sebesar Rp${nominal} untuk ${body.kategori}`,
      null,
      logBody
    );
    
    return Response.success('Transaksi berhasil ditambahkan.', { trx_id: trxId });
  },
  
  deleteTransaction: function(body, user) {
    const allowedRoles = ['ROLE-001', 'ROLE-002', 'ROLE-006'];
    if (!user || !allowedRoles.includes(user.role_id)) {
      return Response.error('FORBIDDEN', 'Hanya Bendahara, SC, dan Super Admin yang dapat menghapus keuangan.');
    }
    
    if (!body.trx_id) {
      return Response.error('BAD_REQUEST', 'ID Transaksi wajib diisi.');
    }
    
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    let deletedRowIndex = -1;
    let deletedData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === body.trx_id) { // Kolom ID Transaksi (index 2)
        deletedRowIndex = i + 1;
        deletedData = {
          jenis: data[i][5],
          kategori: data[i][3],
          nominal: data[i][5] === 'Masuk' ? data[i][8] : data[i][9]
        };
        break;
      }
    }
    
    if (deletedRowIndex !== -1) {
      sheet.deleteRow(deletedRowIndex);
      
      // Hapus foto bukti di Google Drive jika ada
      if (deletedData.bukti_url) {
        this._deleteDriveFile(deletedData.bukti_url);
      }
      
      // Hitung ulang No dan Saldo Akhir untuk baris-baris setelahnya
      const lastRow = sheet.getLastRow();
      if (lastRow >= deletedRowIndex) {
        const remainingData = sheet.getRange(deletedRowIndex, 1, lastRow - deletedRowIndex + 1, 8).getValues();
        let prevSaldo = 0;
        
        if (deletedRowIndex > 2) {
          prevSaldo = Number(sheet.getRange(deletedRowIndex - 1, 7).getValue()) || 0; // Kolom Saldo (7) dari 1-index
        }
        
        for (let j = 0; j < remainingData.length; j++) {
          remainingData[j][0] = deletedRowIndex - 1 + j; // Update No
          
          const masuk = Number(remainingData[j][4]) || 0; // Debit
          const keluar = Number(remainingData[j][5]) || 0; // Kredit
          prevSaldo = prevSaldo + masuk - keluar;
          
          remainingData[j][6] = prevSaldo; // Update Saldo Akhir
        }
        
        // Write back
        sheet.getRange(deletedRowIndex, 1, remainingData.length, 8).setValues(remainingData);
      }
      
      ActivityLogs.log(
        user.user_id, 
        null, 
        user.role_id, 
        'KEUANGAN', 
        'DELETE_TRANSACTION', 
        `Menghapus transaksi ${deletedData.jenis} sebesar Rp${deletedData.nominal}`,
        deletedData,
        null
      );
      
      return Response.success('Transaksi berhasil dihapus dan saldo akhir disesuaikan ulang.');
    }
    
    return Response.error('NOT_FOUND', 'Transaksi tidak ditemukan.');
  },

  editTransaction: function(body, user) {
    const allowedRoles = ['ROLE-001', 'ROLE-002', 'ROLE-006'];
    if (!user || !allowedRoles.includes(user.role_id)) {
      return Response.error('FORBIDDEN', 'Hanya Bendahara, SC, dan Super Admin yang dapat mengedit keuangan.');
    }
    
    if (!body.trx_id || !body.tanggal || !body.jenis || !body.nominal) {
      return Response.error('BAD_REQUEST', 'Data tidak lengkap (ID Transaksi, Tanggal, Jenis, Nominal wajib diisi).');
    }
    
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let oldData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === body.trx_id) {
        rowIndex = i + 1;
        const debit = Number(data[i][4]) || 0;
        const kredit = Number(data[i][5]) || 0;
        oldData = {
          jenis: debit > 0 ? 'INCOME' : 'EXPENSE',
          kategori: data[i][3],
          nominal: debit > 0 ? debit : kredit
        };
        break;
      }
    }
    
    if (rowIndex === -1) {
      return Response.error('NOT_FOUND', 'Transaksi tidak ditemukan.');
    }
    
    const nominal = Number(body.nominal);
    const masuk = body.jenis === 'INCOME' ? nominal : 0;
    const keluar = body.jenis === 'EXPENSE' ? nominal : 0;
    const no = data[rowIndex - 1][0]; // Pertahankan Nomor
    
    // Perbarui baris yang diedit
    sheet.getRange(rowIndex, 1, 1, 8).setValues([[
      no,
      body.tanggal,
      body.trx_id,
      body.kategori || 'Lainnya',
      masuk,
      keluar,
      0, // Saldo Akhir akan dihitung ulang di bawah
      body.penanggung_jawab || user.name
    ]]);
    
    // Cascading Update Saldo
    const lastRow = sheet.getLastRow();
    if (lastRow >= rowIndex) {
      const remainingData = sheet.getRange(rowIndex, 1, lastRow - rowIndex + 1, 8).getValues();
      let prevSaldo = 0;
      
      if (rowIndex > 2) {
        prevSaldo = Number(sheet.getRange(rowIndex - 1, 7).getValue()) || 0; 
      }
      
      for (let j = 0; j < remainingData.length; j++) {
        const currentMasuk = Number(remainingData[j][4]) || 0;
        const currentKeluar = Number(remainingData[j][5]) || 0;
        prevSaldo = prevSaldo + currentMasuk - currentKeluar;
        remainingData[j][6] = prevSaldo; // Update Saldo Akhir
      }
      
      sheet.getRange(rowIndex, 1, remainingData.length, 8).setValues(remainingData);
    }
    
    let logBody = { ...body };
    delete logBody.token;

    ActivityLogs.log(
      user.user_id, 
      null, 
      user.role_id, 
      'KEUANGAN', 
      'EDIT_TRANSACTION', 
      `Mengubah transaksi ${body.trx_id} (Sebelumnya: Rp${oldData.nominal}, Sekarang: Rp${nominal})`,
      oldData,
      logBody
    );
    
    return Response.success('Transaksi berhasil diubah dan Saldo Akhir disesuaikan.');
  }
};
