const Dashboard = {
  getStats: function() {
    const usersSheet = Utils.getSheet('Users');
    const rolesSheet = Utils.getSheet('Roles');
    const logsSheet = Utils.getSheet('Activity_Logs');
    
    // 1. Hitung Statistik Panitia
    const usersData = usersSheet.getDataRange().getValues();
    let totalPanitia = 0;
    let panitiaAktif = 0;
    
    // Mulai dari baris ke-2 (index 1) karena baris 1 adalah header
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0]) totalPanitia++; // Jika user_id ada isinya
      if (usersData[i][11] === 'ACTIVE') panitiaAktif++;
    }
    
    // 2. Hitung Statistik Role
    const rolesData = rolesSheet.getDataRange().getValues();
    let roleTersedia = 0;
    
    for (let i = 1; i < rolesData.length; i++) {
      if (rolesData[i][4] === 'ACTIVE') roleTersedia++;
    }
    
    // 3. Hitung Aktivitas & Ambil Log Terakhir
    const logsData = logsSheet.getDataRange().getValues();
    let aktivitasHariIni = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset jam ke 00:00:00 untuk membandingkan hari
    
    const recentLogs = [];
    
    // Baca dari belakang agar aktivitas terbaru (yang ada di baris paling bawah) diambil lebih dulu
    for (let i = logsData.length - 1; i >= 1; i--) {
      // logsData[i][9] adalah created_at
      const logDate = new Date(logsData[i][9]);
      
      // Hitung aktivitas hari ini
      if (logDate >= today) aktivitasHariIni++;
      
      // Kumpulkan maksimal 5 aktivitas terbaru
      if (recentLogs.length < 5) {
        recentLogs.push({
          id: logsData[i][0],
          user_id: logsData[i][1],
          user_role: logsData[i][3],
          module: logsData[i][4],
          action: logsData[i][5],
          description: logsData[i][6],
          created_at: logsData[i][9]
        });
      }
    }
    
    return Response.success('Dashboard data fetched successfully', {
      stats: { 
        totalPanitia: totalPanitia, 
        panitiaAktif: panitiaAktif, 
        roleTersedia: roleTersedia, 
        aktivitasHariIni: aktivitasHariIni 
      },
      recentLogs: recentLogs
    });
  }
};
