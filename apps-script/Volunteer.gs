const Volunteer = {
  sheetName: 'Volunteer',
  
  getVolunteers: function(user) {
    if (!user) return Response.error('UNAUTHORIZED', 'Sesi tidak valid atau telah berakhir.');
    
    const sheet = Utils.getSheet(this.sheetName);
    if (!sheet) return Response.success('Sheet belum dibuat', []);
    
    const data = sheet.getDataRange().getValues();
    const volunteers = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        volunteers.push({
          id_volunteer: data[i][0],
          nama: data[i][1],
          no_bp: data[i][2],
          jurusan: data[i][3],
          alamat: data[i][4],
          no_hp: data[i][5],
          link_ig: data[i][6],
          event_1: data[i][7],
          event_2: data[i][8],
          motivasi: data[i][9],
          link_bukti: data[i][10],
          link_krs: data[i][11],
          link_sertifikat: data[i][12],
          waktu_daftar: data[i][13],
          status: data[i][14]
        });
      }
    }
    
    return Response.success('Data volunteer berhasil diambil', volunteers);
  },
  
  addVolunteer: function(body) {
    // Dipanggil dari website utama (public), tidak perlu cek sesi user
    if (!body.nama || !body.no_bp || !body.no_hp || !body.event_1) {
      return Response.error('BAD_REQUEST', 'Data wajib tidak lengkap.');
    }
    
    let sheet = Utils.getSheet(this.sheetName);
    if (!sheet) {
      // Bikin sheet baru kalau belum ada
      const ss = Utils.getSpreadsheet();
      sheet = ss.insertSheet(this.sheetName);
      sheet.appendRow([
        'ID Volunteer', 'Nama', 'No BP', 'Jurusan', 'Alamat', 'No HP', 
        'Link IG', 'Event Utama', 'Event Kedua', 'Motivasi', 
        'Link Bukti Follow', 'Link KRS', 'Link Sertifikat', 'Waktu Daftar', 'Status'
      ]);
      sheet.setFrozenRows(1);
    }
    
    const volId = Utils.generateSequentialId(this.sheetName, 'VOL');
    
    let urlBukti = '';
    let urlKrs = '';
    let urlSertif = '';
    
    try {
      // Karena file sudah di-upload ke Supabase oleh frontend, kita tinggal simpan URL-nya
      if (body.link_bukti) urlBukti = body.link_bukti;
      if (body.link_krs) urlKrs = body.link_krs;
      if (body.link_sertifikat) urlSertif = body.link_sertifikat;
      
    } catch (e) {
      return Response.error('UPLOAD_FAILED', 'Gagal mengunggah berkas: ' + e.toString());
    }
    
    const waktuDaftar = new Date().toISOString();
    
    sheet.appendRow([
      volId,
      body.nama,
      body.no_bp,
      body.jurusan,
      body.alamat,
      body.no_hp,
      body.link_ig,
      body.event_1,
      body.event_2,
      body.motivasi,
      urlBukti,
      urlKrs,
      urlSertif,
      waktuDaftar,
      'Menunggu Seleksi' // Status default
    ]);
    
    return Response.success('Pendaftaran volunteer berhasil disimpan!', { id: volId });
  },
  
  updateStatusVolunteer: function(body, user) {
    if (!user) return Response.error('UNAUTHORIZED', 'Sesi tidak valid.');
    if (!body.id_volunteer || !body.status) return Response.error('BAD_REQUEST', 'ID dan Status wajib ada.');
    
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === body.id_volunteer) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return Response.error('NOT_FOUND', 'Volunteer tidak ditemukan.');
    
    sheet.getRange(rowIndex, 15).setValue(body.status); // Kolom O (15) = Status
    
    ActivityLogs.log(
      user.user_id, null, user.role_name || user.role_id, 'Volunteer', 'UPDATE_STATUS',
      `Ubah status volunteer ${body.id_volunteer} jadi ${body.status}`
    );
    
    return Response.success('Status berhasil diperbarui.', null);
  },
  
  deleteVolunteer: function(body, user) {
    if (!user) return Response.error('UNAUTHORIZED', 'Sesi tidak valid.');
    if (!body.id_volunteer) return Response.error('BAD_REQUEST', 'ID wajib ada.');
    
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === body.id_volunteer) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return Response.error('NOT_FOUND', 'Volunteer tidak ditemukan.');
    
    sheet.deleteRow(rowIndex);
    
    ActivityLogs.log(
      user.user_id, null, user.role_name || user.role_id, 'Volunteer', 'DELETE',
      `Hapus data volunteer ${body.id_volunteer}`
    );
    
    return Response.success('Data volunteer berhasil dihapus.', null);
  }
};
