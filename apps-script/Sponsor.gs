const Sponsor = {
  
  _generateSponsorId: function(sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 'SPN-001';
    
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      const currentIdStr = data[i][0];
      if (currentIdStr && currentIdStr.toString().startsWith('SPN-')) {
        const num = parseInt(currentIdStr.toString().split('-')[1]);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    const nextNum = maxId + 1;
    return 'SPN-' + nextNum.toString().padStart(3, '0');
  },
  
  getSponsors: function() {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Sponsor');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Sponsor belum di-setup.');
      
      const data = sheet.getDataRange().getValues();
      const sponsors = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        
        sponsors.push({
          id_sponsor: row[0],
          nama_sponsor: row[1],
          pic: row[2],
          kontak: row[3],
          email: row[4],
          tgl_proposal: row[5],
          tgl_followup: row[6],
          status: row[7],
          keterangan: row[8],
          catatan: row[9],
          added_by: row[10]
        });
      }
      
      // Balik urutan agar yang terbaru (bawah) ada di atas
      sponsors.reverse();
      
      return Response.success('Data sponsor berhasil diambil.', sponsors);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  addSponsor: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Sponsor');
      
      const newId = this._generateSponsorId(sheet);
      
      const newRow = [
        newId,
        body.nama_sponsor || "-",
        body.pic || "-",
        body.kontak || "-",
        body.email || "-",
        body.tgl_proposal || "-",
        body.tgl_followup || "-",
        body.status || "Belum Dihubungi",
        body.keterangan || "-",
        body.catatan || "-",
        user ? user.name : "System"
      ];
      
      sheet.appendRow(newRow);
      
      // Catat ke Activity Logs
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Sponsor',
          'ADD',
          `Menambahkan prospek sponsor baru: ${body.nama_sponsor}`,
          '-',
          newId
        );
      }
      
      return Response.success('Data sponsor berhasil ditambahkan.', { id_sponsor: newId });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  editSponsor: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Sponsor');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let oldStatus = "";
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_sponsor) {
          rowIndex = i + 1;
          oldStatus = data[i][7];
          break;
        }
      }
      
      if (rowIndex === -1) {
        return Response.error('NOT_FOUND', 'Data sponsor tidak ditemukan.');
      }
      
      sheet.getRange(rowIndex, 2).setValue(body.nama_sponsor || "-");
      sheet.getRange(rowIndex, 3).setValue(body.pic || "-");
      sheet.getRange(rowIndex, 4).setValue(body.kontak || "-");
      sheet.getRange(rowIndex, 5).setValue(body.email || "-");
      sheet.getRange(rowIndex, 6).setValue(body.tgl_proposal || "-");
      sheet.getRange(rowIndex, 7).setValue(body.tgl_followup || "-");
      sheet.getRange(rowIndex, 8).setValue(body.status || "Belum Dihubungi");
      sheet.getRange(rowIndex, 9).setValue(body.keterangan || "-");
      sheet.getRange(rowIndex, 10).setValue(body.catatan || "-");
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Sponsor',
          'EDIT',
          `Mengubah data sponsor: ${body.nama_sponsor}`,
          `Status Lama: ${oldStatus}`,
          `Status Baru: ${body.status}`
        );
      }
      
      return Response.success('Data sponsor berhasil diperbarui.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  deleteSponsor: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Sponsor');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      let sponsorName = "";
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id_sponsor) {
          rowIndex = i + 1;
          sponsorName = data[i][1];
          break;
        }
      }
      
      if (rowIndex === -1) {
        return Response.error('NOT_FOUND', 'Data sponsor tidak ditemukan.');
      }
      
      sheet.deleteRow(rowIndex);
      
      if (user) {
        ActivityLogs.log(
          user.user_id,
          null,
          user.role_name || user.role_id,
          'Sponsor',
          'DELETE',
          `Menghapus data sponsor: ${sponsorName}`,
          body.id_sponsor,
          '-'
        );
      }
      
      return Response.success('Data sponsor berhasil dihapus.', null);
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  }
};
