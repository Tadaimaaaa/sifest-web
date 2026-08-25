const Auth = {
  login: function(body) {
    if (!body.username || !body.password) {
      return Response.error('BAD_REQUEST', 'Username dan password diperlukan.');
    }
    
    const user = Users.findByUsername(body.username);
    if (!user) {
      return Response.error('UNAUTHORIZED', 'Username atau password salah.');
    }
    
    if (user.status !== 'ACTIVE') {
      return Response.error('FORBIDDEN', 'Akun Anda tidak aktif.');
    }
    
    // Blokir login untuk panitia biasa (ROLE-004) kecuali akun bersama 'panitia'
    if (user.role_id === 'ROLE-004' && user.username !== 'panitia') {
      return Response.error('FORBIDDEN', 'Akun pribadi Anda tidak memiliki hak akses ke Dashboard. Silakan login menggunakan akun bersama (Username: panitia | Password: panitia).');
    }
    
    // Verifikasi Password
    const hashedPassword = Utils.hashPassword(body.password, user.password_salt);
    if (hashedPassword !== user.password_hash) {
      return Response.error('UNAUTHORIZED', 'Username atau password salah.');
    }
    
    // Buat Session Token (Token Asli dikirim ke User, Token Hash disimpan di DB)
    const rawToken = Utils.generateId('TOKEN');
    const hashedToken = Utils.hashPassword(rawToken, "SESSION_SALT"); // Gunakan salt statis atau dinamis
    
    Sessions.create(user.user_id, hashedToken);
    ActivityLogs.log(user.user_id, null, user.role_id, 'AUTH', 'LOGIN', 'User melakukan login', null, null);
    
    // Ambil detail Role (jika sudah ada Roles.gs nanti)
    const roleCode = user.role_id; // Sementara role_id adalah kodenya
    
    return Response.success('Login Berhasil', {
      user: {
        id: user.user_id,
        name: user.name,
        nim: user.nim,
        division: user.division,
        role: roleCode
      },
      token: rawToken
    });
  },

  logout: function(body) {
    if (!body.token) return Response.error('BAD_REQUEST', 'Token diperlukan.');
    
    const hashedToken = Utils.hashPassword(body.token, "SESSION_SALT");
    const session = Sessions.findByHash(hashedToken);
    
    if (session) {
      Sessions.revoke(session.session_id);
      ActivityLogs.log(session.user_id, null, 'UNKNOWN', 'AUTH', 'LOGOUT', 'User melakukan logout', null, null);
    }
    
    return Response.success('Logout berhasil.');
  },
  
  // Middleware/Helper untuk Autentikasi API
  validateToken: function(token) {
    if (!token) return null;
    const hashedToken = Utils.hashPassword(token, "SESSION_SALT");
    const session = Sessions.findByHash(hashedToken);
    
    if (!session || session.status !== 'ACTIVE' || new Date(session.expires_at) < new Date()) {
      if (session) Sessions.revoke(session.session_id); // Otomatis revoke jika expired
      return null;
    }
    
    // Update last activity
    Sessions.updateActivity(session.session_id);
    return Users.findById(session.user_id);
  }
};
