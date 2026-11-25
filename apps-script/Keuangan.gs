const Keuangan = {
  sheetName: 'Keuangan',
  
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
  
  // Kolom Bukti bisa berisi banyak link (dipisah baris baru)
  _splitUrls: function(raw) {
    if (!raw || typeof raw !== 'string') return [];
    return raw.split(/[\s|,]+/).filter(function(u) { return /^https?:\/\//i.test(u); });
  },

  // Upload semua file (body.files[] + dukungan lama body.fileData) ke Drive.
  // Return { urls: [...], error: string|null }. Jika gagal, file yang sudah terunggah dibersihkan.
  _uploadFiles: function(body, prefix) {
    const list = [];
    if (Array.isArray(body.files)) {
      body.files.forEach(function(f) {
        if (f && f.fileData && f.fileName) list.push(f);
      });
    }
    if (body.fileData && body.fileName) {
      list.push({ fileData: body.fileData, fileName: body.fileName, mimeType: body.mimeType });
    }
    if (list.length === 0) return { urls: [], error: null };

    const created = [];
    try {
      const folderName = 'SIFEST_Bukti_Keuangan';
      const folderIter = DriveApp.getFoldersByName(folderName);
      let folder;
      if (folderIter.hasNext()) {
        folder = folderIter.next();
      } else {
        folder = DriveApp.createFolder(folderName);
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }

      const urls = [];
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const base64Data = f.fileData.split(',')[1] || f.fileData;
        const blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          f.mimeType || 'image/jpeg',
          prefix + '_' + (i + 1) + '_' + f.fileName
        );
        const file = folder.createFile(blob);
        created.push(file);
        urls.push(file.getUrl());
      }
      return { urls: urls, error: null };
    } catch (e) {
      created.forEach(function(file) { try { file.setTrashed(true); } catch (err) {} });
      return { urls: [], error: e.toString() };
    }
  },

  getTransactions: function() {
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.error('NOT_FOUND', 'Sheet Keuangan tidak ditemukan');
    
    const data = sheet.getDataRange().getValues();
    const transactions = [];
    
    // Headers: No(0), Tanggal(1), ID(2), Kategori(3), Detail(4), Jenis(5), Vol(6), Satuan(7), Masuk(8), Keluar(9), Saldo(10), Bukti(11), PJ(12), Status(13)
    for (let i = 1; i < data.length; i++) {
      if (data[i][2]) { // Cek ID Transaksi
        transactions.push({
          no: data[i][0],
          tanggal: data[i][1],
          trx_id: data[i][2],
          kategori: data[i][3],
          keterangan: data[i][4],
          jenis: data[i][5] === 'Masuk' ? 'INCOME' : 'EXPENSE',
          vol: data[i][6],
          satuan: data[i][7],
          nominal: data[i][5] === 'Masuk' ? data[i][8] : data[i][9],
          saldo_akhir: data[i][10],
          bukti_url: data[i][11],
          penanggung_jawab: data[i][12],
          status: data[i][13],
          recorded_by: data[i][12] // Fallback ke Penanggung Jawab
        });
      }
    }
    
    // Urutkan dari yang terbaru untuk UI (spreadsheet tetap berurutan)
    transactions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    
    return Response.success('Data keuangan berhasil diambil', transactions);
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
    const trxId = Utils.generateSequentialId(this.sheetName, 'TRX');
    
    // Proses upload semua file ke Drive (bisa lebih dari satu nota)
    const uploadRes = this._uploadFiles(body, trxId);
    if (uploadRes.error) {
      return Response.error('UPLOAD_FAILED', 'Gagal mengunggah bukti nota: ' + uploadRes.error);
    }
    const fileUrl = this._splitUrls(body.bukti_url).concat(uploadRes.urls).join('\n');
    
    // Hitung Nomor, Masuk, Keluar, dan Saldo Akhir
    const lastRow = sheet.getLastRow();
    let lastNo = 0;
    let lastSaldo = 0;
    
    if (lastRow > 1) {
      const lastRowData = sheet.getRange(lastRow, 1, 1, 14).getValues()[0];
      lastNo = Number(lastRowData[0]) || 0;
      lastSaldo = Number(lastRowData[10]) || 0;
    }
    
    const no = lastNo + 1;
    const nominal = Number(body.nominal);
    const masuk = body.jenis === 'INCOME' ? nominal : 0;
    const keluar = body.jenis === 'EXPENSE' ? nominal : 0;
    const saldoAkhir = lastSaldo + masuk - keluar;
    const jenisText = body.jenis === 'INCOME' ? 'Masuk' : 'Keluar';
    
    sheet.appendRow([
      no,
      body.tanggal,
      trxId,
      body.kategori || 'Lainnya',
      body.keterangan || '-',
      jenisText,
      body.vol || '-',
      body.satuan || '-',
      masuk,
      keluar,
      saldoAkhir,
      fileUrl || '-',
      body.penanggung_jawab || user.name,
      body.status || 'Lunas'
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
    
    return Response.success('Transaksi berhasil ditambahkan.', {
      trx_id: trxId,
      nota_count: this._splitUrls(fileUrl).length
    });
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
          nominal: data[i][5] === 'Masuk' ? data[i][8] : data[i][9],
          bukti_url: data[i][11]
        };
        break;
      }
    }
    
    if (deletedRowIndex !== -1) {
      sheet.deleteRow(deletedRowIndex);
      
      // Hapus foto bukti di Google Drive jika ada
      if (deletedData.bukti_url) {
        const selfDel = this;
        this._splitUrls(deletedData.bukti_url).forEach(function(u) { selfDel._deleteDriveFile(u); });
      }
      
      // Hitung ulang No dan Saldo Akhir untuk baris-baris setelahnya
      const lastRow = sheet.getLastRow();
      if (lastRow >= deletedRowIndex) {
        const remainingData = sheet.getRange(deletedRowIndex, 1, lastRow - deletedRowIndex + 1, 14).getValues();
        let prevSaldo = 0;
        
        if (deletedRowIndex > 2) {
          prevSaldo = Number(sheet.getRange(deletedRowIndex - 1, 11).getValue()) || 0; // Kolom Saldo (11) dari 1-index
        }
        
        for (let j = 0; j < remainingData.length; j++) {
          remainingData[j][0] = deletedRowIndex - 1 + j; // Update No
          
          const masuk = Number(remainingData[j][8]) || 0;
          const keluar = Number(remainingData[j][9]) || 0;
          prevSaldo = prevSaldo + masuk - keluar;
          
          remainingData[j][10] = prevSaldo; // Update Saldo Akhir
        }
        
        // Write back
        sheet.getRange(deletedRowIndex, 1, remainingData.length, 14).setValues(remainingData);
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
    let currentFileUrl = body.bukti_url || '';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === body.trx_id) {
        rowIndex = i + 1;
        oldData = {
          jenis: data[i][5],
          kategori: data[i][3],
          nominal: data[i][5] === 'Masuk' ? data[i][8] : data[i][9],
          bukti_url: data[i][11]
        };
        
        break;
      }
    }
    
    if (rowIndex === -1) {
      return Response.error('NOT_FOUND', 'Transaksi tidak ditemukan.');
    }
    
    // Nota lama yang dipertahankan (hanya URL yang memang milik transaksi ini)
    const oldUrls = this._splitUrls(oldData.bukti_url);
    let keptUrls = oldUrls;
    if (body.bukti_url !== undefined && body.bukti_url !== null) {
      const requested = this._splitUrls(body.bukti_url);
      keptUrls = oldUrls.filter(function(u) { return requested.indexOf(u) !== -1; });
    }

    // Upload nota baru (bisa banyak) lebih dulu, supaya data lama aman jika upload gagal
    const uploadRes = this._uploadFiles(body, body.trx_id);
    if (uploadRes.error) {
      return Response.error('UPLOAD_FAILED', 'Gagal mengunggah bukti nota baru: ' + uploadRes.error);
    }

    // Hapus dari Drive nota lama yang dibuang oleh user
    const self = this;
    oldUrls.forEach(function(u) {
      if (keptUrls.indexOf(u) === -1) self._deleteDriveFile(u);
    });

    currentFileUrl = keptUrls.concat(uploadRes.urls).join('\n');
    
    const nominal = Number(body.nominal);
    const masuk = body.jenis === 'INCOME' ? nominal : 0;
    const keluar = body.jenis === 'EXPENSE' ? nominal : 0;
    const jenisText = body.jenis === 'INCOME' ? 'Masuk' : 'Keluar';
    const no = data[rowIndex - 1][0]; // Pertahankan Nomor
    
    // Perbarui baris yang diedit
    sheet.getRange(rowIndex, 1, 1, 14).setValues([[
      no,
      body.tanggal,
      body.trx_id,
      body.kategori || 'Lainnya',
      body.keterangan || '-',
      jenisText,
      body.vol || '-',
      body.satuan || '-',
      masuk,
      keluar,
      0, // Saldo Akhir akan dihitung ulang di bawah
      currentFileUrl || '-',
      body.penanggung_jawab || user.name,
      body.status || 'Lunas'
    ]]);
    
    // Cascading Update Saldo
    const lastRow = sheet.getLastRow();
    if (lastRow >= rowIndex) {
      const remainingData = sheet.getRange(rowIndex, 1, lastRow - rowIndex + 1, 14).getValues();
      let prevSaldo = 0;
      
      if (rowIndex > 2) {
        prevSaldo = Number(sheet.getRange(rowIndex - 1, 11).getValue()) || 0; 
      }
      
      for (let j = 0; j < remainingData.length; j++) {
        const currentMasuk = Number(remainingData[j][8]) || 0;
        const currentKeluar = Number(remainingData[j][9]) || 0;
        prevSaldo = prevSaldo + currentMasuk - currentKeluar;
        remainingData[j][10] = prevSaldo; // Update Saldo Akhir
      }
      
      sheet.getRange(rowIndex, 1, remainingData.length, 14).setValues(remainingData);
    }
    
    let logBody = { ...body };
    delete logBody.fileData;
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
    
    return Response.success('Transaksi berhasil diubah dan Saldo Akhir disesuaikan.', {
      trx_id: body.trx_id,
      nota_count: this._splitUrls(currentFileUrl).length
    });
  }
};
