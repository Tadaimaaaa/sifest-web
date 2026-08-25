const Surat = {
  
  _generateSuratId: function(sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 'SRT-001';
    
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      const currentIdStr = data[i][0];
      if (currentIdStr && currentIdStr.toString().startsWith('SRT-')) {
        const num = parseInt(currentIdStr.toString().split('-')[1]);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    const nextNum = maxId + 1;
    return 'SRT-' + nextNum.toString().padStart(3, '0');
  },
  
  getSurat: function() {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Surat');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Surat belum di-setup.');
      
      const data = sheet.getDataRange().getValues();
      const daftarSurat = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        
        daftarSurat.push({
          id_surat: row[0],
          jenis_surat: row[1],
          nomor_surat: row[2],
          tanggal: row[3],
          instansi: row[4],
          perihal: row[5],
          status: row[6],
          link_file: row[7],
          added_by: row[8]
        });
      }
      
      // Balik urutan agar yang terbaru ada di atas
      daftarSurat.reverse();
      
      return Response.success('Data surat berhasil diambil.', daftarSurat);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  addSurat: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Surat');
      
      const newId = this._generateSuratId(sheet);
      
      let fileUrl = body.link_file || "-";
      if (body.fileData && body.fileName) {
        try {
          const folderName = 'SIFEST_Arsip_Surat';
          const folderIter = DriveApp.getFoldersByName(folderName);
          let folder;
          if (folderIter.hasNext()) {
            folder = folderIter.next();
          } else {
            folder = DriveApp.createFolder(folderName);
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
          
          const base64Data = body.fileData.split(',')[1] || body.fileData;
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), body.mimeType || 'application/pdf', newId + '_' + body.fileName);
          const file = folder.createFile(blob);
          fileUrl = file.getUrl();
        } catch (e) {
          return Response.error('UPLOAD_FAILED', 'Gagal mengunggah surat: ' + e.toString());
        }
      }
      
      const newRow = [
        newId,
        body.jenis_surat || "Surat Masuk",
        body.nomor_surat || "-",
        body.tanggal || "-",
        body.instansi || "-",
        body.perihal || "-",
        body.status || "-",
        fileUrl,
        user ? user.name : "System"
      ];
      
      sheet.appendRow(newRow);
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Surat',
          'ADD',
          `Menambahkan ${body.jenis_surat}: ${body.perihal} (${body.instansi})`,
          '-',
          newId
        );
      }
      
      return Response.success('Data surat berhasil ditambahkan.', { id_surat: newId });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  editSurat: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Surat');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let oldNomor = "";
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_surat) {
          rowIndex = i + 1;
          oldNomor = data[i][2];
          break;
        }
      }
      
      if (rowIndex === -1) {
        return Response.error('NOT_FOUND', 'Data surat tidak ditemukan.');
      }
      
      let fileUrl = body.link_file || "-";
      if (body.fileData && body.fileName) {
        try {
          const folderName = 'SIFEST_Arsip_Surat';
          const folderIter = DriveApp.getFoldersByName(folderName);
          let folder;
          if (folderIter.hasNext()) {
            folder = folderIter.next();
          } else {
            folder = DriveApp.createFolder(folderName);
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
          
          const base64Data = body.fileData.split(',')[1] || body.fileData;
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), body.mimeType || 'application/pdf', body.id_surat + '_' + body.fileName);
          const file = folder.createFile(blob);
          fileUrl = file.getUrl();
        } catch (e) {
          return Response.error('UPLOAD_FAILED', 'Gagal mengunggah surat: ' + e.toString());
        }
      }
      
      sheet.getRange(rowIndex, 2).setValue(body.jenis_surat || "Surat Masuk");
      sheet.getRange(rowIndex, 3).setValue(body.nomor_surat || "-");
      sheet.getRange(rowIndex, 4).setValue(body.tanggal || "-");
      sheet.getRange(rowIndex, 5).setValue(body.instansi || "-");
      sheet.getRange(rowIndex, 6).setValue(body.perihal || "-");
      sheet.getRange(rowIndex, 7).setValue(body.status || "-");
      
      // Update fileUrl hanya jika ada upload baru atau link diganti
      if (fileUrl !== "-") {
        sheet.getRange(rowIndex, 8).setValue(fileUrl);
      }
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Surat',
          'EDIT',
          `Mengubah data ${body.jenis_surat}`,
          oldNomor,
          body.nomor_surat || "-"
        );
      }
      
      return Response.success('Data surat berhasil diperbarui.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  deleteSurat: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Surat');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let suratInfo = "";
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_surat) {
          rowIndex = i + 1;
          suratInfo = data[i][5] + " (" + data[i][2] + ")"; // Perihal (Nomor Surat)
          break;
        }
      }
      
      if (rowIndex === -1) {
        return Response.error('NOT_FOUND', 'Data surat tidak ditemukan.');
      }
      
      sheet.deleteRow(rowIndex);
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Surat',
          'DELETE',
          `Menghapus data surat: ${suratInfo}`,
          body.id_surat,
          '-'
        );
      }
      
      return Response.success('Data surat berhasil dihapus.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  }
};
