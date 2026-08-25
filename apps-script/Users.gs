const Users = {
  sheetName: 'Users',
  
  findByUsername: function(username) {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    // Headers: user_id(0), name(1), nim(2), username(3), password_hash(4), password_salt(5), 
    // email(6), phone(7), division(8), position(9), role_id(10), status(11), profile_photo(12)
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][3] === username) {
        return {
          row_index: i + 1,
          user_id: data[i][0],
          name: data[i][1],
          nim: data[i][2],
          username: data[i][3],
          password_hash: data[i][4],
          password_salt: data[i][5],
          division: data[i][8],
          role_id: data[i][10],
          status: data[i][11]
        };
      }
    }
    return null;
  },
  
  findById: function(userId) {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        return {
          row_index: i + 1,
          user_id: data[i][0],
          name: data[i][1],
          nim: data[i][2],
          username: data[i][3],
          division: data[i][8],
          role_id: data[i][10],
          status: data[i][11]
        };
      }
    }
    return null;
  },

  getUsers: function() {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    const users = [];
    
    // Headers: user_id(0), name(1), nim(2), username(3), password_hash(4), password_salt(5), 
    // email(6), phone(7), division(8), position(9), role_id(10), status(11), profile_photo(12)
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Pastikan user_id tidak kosong
        users.push({
          user_id: data[i][0],
          name: data[i][1],
          nim: data[i][2],
          username: data[i][3],
          email: data[i][6],
          phone: data[i][7],
          division: data[i][8],
          position: data[i][9],
          role_id: data[i][10],
          status: data[i][11]
          // DILARANG mengirimkan password_hash dan password_salt ke frontend!
        });
      }
    }
    
    
    return Response.success('Users fetched successfully', users);
  },

  updateUserAccess: function(body, user) {
    if (!user || user.role_id !== 'ROLE-001') {
      return Response.error('FORBIDDEN', 'Hanya Super Admin yang dapat mengubah akses panitia.');
    }
    
    if (!body.target_user_id || !body.role_id || !body.status) {
      return Response.error('BAD_REQUEST', 'Semua data (target_user_id, role_id, status) wajib diisi.');
    }
    
    // Jangan izinkan Super Admin mengubah akses dirinya sendiri via API ini untuk mencegah terkunci
    if (body.target_user_id === user.user_id) {
      return Response.error('FORBIDDEN', 'Anda tidak dapat mengubah hak akses Anda sendiri.');
    }

    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === body.target_user_id) {
        // Update role_id (kolom ke-11 -> index 10) dan status (kolom ke-12 -> index 11)
        const rowIndex = i + 1;
        const oldRole = data[i][10];
        const oldStatus = data[i][11];
        
        sheet.getRange(rowIndex, 11).setValue(body.role_id);
        sheet.getRange(rowIndex, 12).setValue(body.status);
        
        ActivityLogs.log(
          user.user_id, 
          body.target_user_id, 
          user.role_id, 
          'USERS', 
          'UPDATE_ACCESS', 
          `Mengubah hak akses (Role: ${oldRole} -> ${body.role_id}, Status: ${oldStatus} -> ${body.status})`,
          { role: oldRole, status: oldStatus },
          { role: body.role_id, status: body.status }
        );
        
        return Response.success('Hak akses berhasil diperbarui.');
      }
    }
    
    return Response.error('NOT_FOUND', 'Panitia tidak ditemukan.');
  }
};
