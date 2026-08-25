const Produk = {
  
  _generateProdukId: function(sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 'PRD-001';
    
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      const currentIdStr = data[i][0];
      if (currentIdStr && currentIdStr.toString().startsWith('PRD-')) {
        const num = parseInt(currentIdStr.toString().split('-')[1]);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    const nextNum = maxId + 1;
    return 'PRD-' + nextNum.toString().padStart(3, '0');
  },
  
  getProduk: function() {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Produk Sponsor belum di-setup.');
      
      const data = sheet.getDataRange().getValues();
      const daftarProduk = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        
        daftarProduk.push({
          id_produk: row[0],
          nama_produk: row[1],
          asal_sponsor: row[2],
          harga_satuan: row[3],
          target_penjualan: row[4],
          sudah_terjual: row[5],
          keterangan: row[6],
          foto_produk: row[7],
          added_by: row[8],
          varian: row[9] ? (typeof row[9] === 'string' ? JSON.parse(row[9] || '[]') : row[9]) : [],
          distribusi: row[10] ? (typeof row[10] === 'string' ? JSON.parse(row[10] || '[]') : row[10]) : [],
          penjualan_bundle: row[11] ? (typeof row[11] === 'string' ? JSON.parse(row[11] || '[]') : row[11]) : []
        });
      }
      
      // Balik urutan agar yang terbaru ada di atas
      daftarProduk.reverse();
      
      return Response.success('Data produk berhasil diambil.', daftarProduk);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  getProdukById: function(id_produk) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Produk Sponsor belum di-setup.');
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === id_produk) {
          return Response.success('Data produk ditemukan.', {
            id_produk: row[0],
            nama_produk: row[1],
            asal_sponsor: row[2],
            harga_satuan: row[3],
            target_penjualan: row[4],
            sudah_terjual: row[5],
            keterangan: row[6],
            foto_produk: row[7],
            added_by: row[8],
            varian: row[9] ? (typeof row[9] === 'string' ? JSON.parse(row[9] || '[]') : row[9]) : [],
            distribusi: row[10] ? (typeof row[10] === 'string' ? JSON.parse(row[10] || '[]') : row[10]) : [],
            penjualan_bundle: row[11] ? (typeof row[11] === 'string' ? JSON.parse(row[11] || '[]') : row[11]) : []
          });
        }
      }
      return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  updateJumlahTerjual: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let oldJumlah = 0;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          oldJumlah = data[i][5];
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      const jumlahBaru = Number(body.sudah_terjual) || 0;
      sheet.getRange(rowIndex, 6).setValue(jumlahBaru);
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null,
          user.role_name || user.role_id, 'Produk', 'UPDATE_TERJUAL',
          `Update jumlah terjual produk ${body.id_produk}`,
          oldJumlah.toString(), jumlahBaru.toString()
        );
      }
      
      return Response.success('Jumlah terjual berhasil diperbarui.', { sudah_terjual: jumlahBaru });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  addProduk: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      
      const newId = this._generateProdukId(sheet);
      
      let fileUrl = body.foto_produk || "-";
      if (body.fileData && body.fileName) {
        try {
          const folderName = 'SIFEST_Foto_Produk';
          const folderIter = DriveApp.getFoldersByName(folderName);
          let folder;
          if (folderIter.hasNext()) {
            folder = folderIter.next();
          } else {
            folder = DriveApp.createFolder(folderName);
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
          
          const base64Data = body.fileData.split(',')[1] || body.fileData;
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), body.mimeType || 'image/jpeg', newId + '_' + body.fileName);
          const file = folder.createFile(blob);
          fileUrl = file.getUrl();
        } catch (e) {
          return Response.error('UPLOAD_FAILED', 'Gagal mengunggah foto produk: ' + e.toString());
        }
      }
      
      const newRow = [
        newId,
        body.nama_produk || "-",
        body.asal_sponsor || "-",
        body.harga_satuan || 0,
        body.target_penjualan || 0,
        body.sudah_terjual || 0,
        body.keterangan || "-",
        fileUrl,
        user ? user.name : "System"
      ];
      
      sheet.appendRow(newRow);
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Produk',
          'ADD',
          `Menambahkan produk sponsor: ${body.nama_produk} dari ${body.asal_sponsor}`,
          '-',
          newId
        );
      }
      
      return Response.success('Data produk berhasil ditambahkan.', { id_produk: newId });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  editProduk: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let oldNama = "";
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          oldNama = data[i][1];
          break;
        }
      }
      
      if (rowIndex === -1) {
        return Response.error('NOT_FOUND', 'Data produk tidak ditemukan.');
      }
      
      let fileUrl = body.foto_produk || "-";
      if (body.fileData && body.fileName) {
        try {
          const folderName = 'SIFEST_Foto_Produk';
          const folderIter = DriveApp.getFoldersByName(folderName);
          let folder;
          if (folderIter.hasNext()) {
            folder = folderIter.next();
          } else {
            folder = DriveApp.createFolder(folderName);
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
          
          const base64Data = body.fileData.split(',')[1] || body.fileData;
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), body.mimeType || 'image/jpeg', body.id_produk + '_' + body.fileName);
          const file = folder.createFile(blob);
          fileUrl = file.getUrl();
        } catch (e) {
          return Response.error('UPLOAD_FAILED', 'Gagal mengunggah foto produk: ' + e.toString());
        }
      }
      
      sheet.getRange(rowIndex, 2).setValue(body.nama_produk || "-");
      sheet.getRange(rowIndex, 3).setValue(body.asal_sponsor || "-");
      sheet.getRange(rowIndex, 4).setValue(body.harga_satuan || 0);
      sheet.getRange(rowIndex, 5).setValue(body.target_penjualan || 0);
      sheet.getRange(rowIndex, 6).setValue(body.sudah_terjual || 0);
      sheet.getRange(rowIndex, 7).setValue(body.keterangan || "-");
      
      // Update fileUrl hanya jika ada upload baru atau link diganti
      if (fileUrl !== "-") {
        sheet.getRange(rowIndex, 8).setValue(fileUrl);
      }
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Produk',
          'EDIT',
          `Mengubah data produk sponsor`,
          oldNama,
          body.nama_produk || "-"
        );
      }
      
      return Response.success('Data produk berhasil diperbarui.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  deleteProduk: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let produkInfo = "";
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          produkInfo = data[i][1] + " (" + data[i][2] + ")"; // Nama Produk (Asal Sponsor)
          break;
        }
      }
      
      if (rowIndex === -1) {
        return Response.error('NOT_FOUND', 'Data produk tidak ditemukan.');
      }
      
      sheet.deleteRow(rowIndex);
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Produk',
          'DELETE',
          `Menghapus data produk: ${produkInfo}`,
          body.id_produk,
          '-'
        );
      }
      
      return Response.success('Data produk berhasil dihapus.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  addVarian: function(body, user) {
    try {
      if (!body.id_produk || !body.nama_varian || typeof body.jumlah === 'undefined' || body.jumlah === '') {
        return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      }
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const varStr = data[i][9]; // Kolom J (indeks 9)
          if (varStr) {
            try {
              existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr;
            } catch (e) {
              existingVarian = [];
            }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      let fileUrl = "-";
      const idVarian = 'VAR-' + new Date().getTime();
      
      if (body.fileData && body.fileName) {
        try {
          const folderName = 'SIFEST_Foto_Produk';
          const folderIter = DriveApp.getFoldersByName(folderName);
          let folder;
          if (folderIter.hasNext()) {
            folder = folderIter.next();
          } else {
            folder = DriveApp.createFolder(folderName);
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
          
          const base64Data = body.fileData.split(',')[1] || body.fileData;
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), body.mimeType || 'image/jpeg', idVarian + '_' + body.fileName);
          const file = folder.createFile(blob);
          fileUrl = file.getUrl();
        } catch (e) {
          return Response.error('UPLOAD_FAILED', 'Gagal mengunggah foto varian: ' + e.toString());
        }
      }
      
      const newVarian = {
        id_varian: idVarian,
        nama_varian: body.nama_varian,
        foto: fileUrl,
        jumlah: parseInt(body.jumlah) || 0,
        tanggal: new Date().toISOString()
      };
      
      existingVarian.push(newVarian);
      sheet.getRange(rowIndex, 10).setValue(JSON.stringify(existingVarian)); // Kolom J
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'ADD_VARIAN',
          `Tambah varian ${body.nama_varian} ke produk ${body.id_produk}`
        );
      }
      
      return Response.success('Varian berhasil ditambahkan.', newVarian);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  deleteVarian: function(body, user) {
    try {
      if (!body.id_produk || !body.id_varian) return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const varStr = data[i][9];
          if (varStr) {
            try { existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr; } 
            catch (e) { existingVarian = []; }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      const newVarianList = existingVarian.filter(d => d.id_varian !== body.id_varian);
      sheet.getRange(rowIndex, 10).setValue(JSON.stringify(newVarianList));
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'DELETE_VARIAN',
          `Hapus varian produk ${body.id_produk}`
        );
      }
      
      return Response.success('Varian berhasil dihapus.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  updateVarian: function(body, user) {
    try {
      if (!body.id_produk || !body.id_varian || typeof body.jumlah === 'undefined') return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const varStr = data[i][9];
          if (varStr) {
            try { existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr; } 
            catch (e) { existingVarian = []; }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      let found = false;
      for (let i = 0; i < existingVarian.length; i++) {
        if (existingVarian[i].id_varian === body.id_varian) {
          existingVarian[i].jumlah = Number(body.jumlah) || 0;
          found = true;
          break;
        }
      }

      if (!found) return Response.error('NOT_FOUND', 'Data varian tidak ditemukan.');
      
      sheet.getRange(rowIndex, 10).setValue(JSON.stringify(existingVarian));
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'UPDATE_VARIAN',
          `Update stok varian produk ${body.id_produk}`
        );
      }
      
      return Response.success('Stok varian berhasil diperbarui.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  addDistribusiMulti: function(body, user) {
    try {
      if (!body.id_produk || !body.nama_penerima || !body.items || !Array.isArray(body.items)) {
        return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      }
      
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingDistribusi = [];
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const distStr = data[i][10]; // Kolom K (indeks 10)
          if (distStr) {
            try { existingDistribusi = typeof distStr === 'string' ? JSON.parse(distStr) : distStr; } 
            catch (e) { existingDistribusi = []; }
          }
          const varStr = data[i][9]; // Kolom J (indeks 9)
          if (varStr) {
            try { existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr; } 
            catch (e) { existingVarian = []; }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      // Filter out items with 0 quantity
      const validItems = body.items.filter(item => item.jumlah > 0);
      if (validItems.length === 0) return Response.error('BAD_REQUEST', 'Tidak ada item yang didistribusikan.');

      // Deduct stock
      validItems.forEach(item => {
        const vIndex = existingVarian.findIndex(v => v.id_varian === item.id_varian);
        if (vIndex !== -1) {
          existingVarian[vIndex].jumlah = Math.max(0, existingVarian[vIndex].jumlah - item.jumlah);
        }
      });

      const newDist = {
        id_dist: 'DST-' + new Date().getTime(),
        nama_penerima: body.nama_penerima,
        tanggal: body.tanggal || new Date().toISOString(),
        items: validItems // [{id_varian, nama_varian, jumlah}]
      };
      
      existingDistribusi.push(newDist);
      sheet.getRange(rowIndex, 10).setValue(JSON.stringify(existingVarian)); // Kolom J (Update Varian)
      sheet.getRange(rowIndex, 11).setValue(JSON.stringify(existingDistribusi)); // Kolom K (Update Distribusi)
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'ADD_DISTRIBUSI_MULTI',
          `Distribusi multi varian ke ${body.nama_penerima} untuk produk ${body.id_produk}`
        );
      }
      
      return Response.success('Distribusi berhasil ditambahkan.', newDist);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  deleteDistribusi: function(body, user) {
    try {
      if (!body.id_produk || !body.id_dist) return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingDistribusi = [];
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const distStr = data[i][10]; // Kolom K
          if (distStr) {
            try { existingDistribusi = typeof distStr === 'string' ? JSON.parse(distStr) : distStr; } 
            catch (e) { existingDistribusi = []; }
          }
          const varStr = data[i][9]; // Kolom J
          if (varStr) {
            try { existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr; } 
            catch (e) { existingVarian = []; }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      const distToDelete = existingDistribusi.find(d => d.id_dist === body.id_dist);
      if (distToDelete && distToDelete.items) {
        distToDelete.items.forEach(item => {
          const vIndex = existingVarian.findIndex(v => v.id_varian === item.id_varian);
          if (vIndex !== -1) {
            existingVarian[vIndex].jumlah += item.jumlah;
          }
        });
        sheet.getRange(rowIndex, 10).setValue(JSON.stringify(existingVarian)); // Restore Varian stock
      }
      
      const newDistribusiList = existingDistribusi.filter(d => d.id_dist !== body.id_dist);
      sheet.getRange(rowIndex, 11).setValue(JSON.stringify(newDistribusiList)); // Kolom K
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'DELETE_DISTRIBUSI',
          `Hapus data distribusi ${body.id_dist} produk ${body.id_produk}`
        );
      }
      
      return Response.success('Data distribusi berhasil dihapus.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  addPenjualanBundle: function(body, user) {
    try {
      if (!body.id_produk || !body.nama_paket || !body.items || !Array.isArray(body.items)) {
        return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      }
      
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingPenjualan = [];
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const varStr = data[i][9]; // Kolom J (indeks 9)
          if (varStr) {
            try { existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr; } 
            catch (e) { existingVarian = []; }
          }
          const penStr = data[i][11]; // Kolom L (indeks 11)
          if (penStr) {
            try { existingPenjualan = typeof penStr === 'string' ? JSON.parse(penStr) : penStr; } 
            catch (e) { existingPenjualan = []; }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      const validItems = body.items.filter(item => item.jumlah > 0);
      if (validItems.length === 0) return Response.error('BAD_REQUEST', 'Tidak ada item varian yang terjual.');

      // Deduct stock
      validItems.forEach(item => {
        const vIndex = existingVarian.findIndex(v => v.id_varian === item.id_varian);
        if (vIndex !== -1) {
          existingVarian[vIndex].jumlah = Math.max(0, existingVarian[vIndex].jumlah - item.jumlah);
        }
      });

      const newSale = {
        id_penjualan: 'SALE-' + new Date().getTime(),
        id_paket: body.id_paket,
        nama_paket: body.nama_paket,
        total_harga: Number(body.total_harga) || 0,
        total_modal: Number(body.total_modal) || 0,
        tanggal: new Date().toISOString(),
        items: validItems
      };
      
      existingPenjualan.push(newSale);
      sheet.getRange(rowIndex, 10).setValue(JSON.stringify(existingVarian)); // Kolom J
      sheet.getRange(rowIndex, 12).setValue(JSON.stringify(existingPenjualan)); // Kolom L
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'ADD_PENJUALAN_BUNDLE',
          `Penjualan ${body.nama_paket} pada produk ${body.id_produk}`
        );
      }
      
      return Response.success('Penjualan paket berhasil ditambahkan.', newSale);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  deletePenjualanBundle: function(body, user) {
    try {
      if (!body.id_produk || !body.id_penjualan) return Response.error('BAD_REQUEST', 'Parameter tidak lengkap.');
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Produk Sponsor');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let existingPenjualan = [];
      let existingVarian = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_produk) {
          rowIndex = i + 1;
          const varStr = data[i][9]; // Kolom J
          if (varStr) {
            try { existingVarian = typeof varStr === 'string' ? JSON.parse(varStr) : varStr; } 
            catch (e) { existingVarian = []; }
          }
          const penStr = data[i][11]; // Kolom L
          if (penStr) {
            try { existingPenjualan = typeof penStr === 'string' ? JSON.parse(penStr) : penStr; } 
            catch (e) { existingPenjualan = []; }
          }
          break;
        }
      }
      
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Produk tidak ditemukan.');
      
      const saleToDelete = existingPenjualan.find(s => s.id_penjualan === body.id_penjualan);
      if (saleToDelete && saleToDelete.items) {
        saleToDelete.items.forEach(item => {
          const vIndex = existingVarian.findIndex(v => v.id_varian === item.id_varian);
          if (vIndex !== -1) {
            existingVarian[vIndex].jumlah += item.jumlah;
          }
        });
        sheet.getRange(rowIndex, 10).setValue(JSON.stringify(existingVarian)); // Restore Varian stock
      }
      
      const newPenjualanList = existingPenjualan.filter(s => s.id_penjualan !== body.id_penjualan);
      sheet.getRange(rowIndex, 12).setValue(JSON.stringify(newPenjualanList)); // Kolom L
      
      if (user) {
        ActivityLogs.log(
          user.user_id, null, user.role_name || user.role_id, 'Produk', 'DELETE_PENJUALAN_BUNDLE',
          `Hapus data penjualan bundle ${body.id_penjualan} produk ${body.id_produk}`
        );
      }
      
      return Response.success('Data penjualan berhasil dihapus.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  }
};
