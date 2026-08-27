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
    
    const keuanganSheet = Utils.getSheet('Keuangan');
    const sponsorSheet = Utils.getSheet('Sponsor');
    
    // 4. Analytics Keuangan (Bulanan)
    // Agregasi pemasukan & pengeluaran per bulan
    const keuanganData = keuanganSheet.getDataRange().getValues();
    const monthlyFinance = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    
    for (let i = 1; i < keuanganData.length; i++) {
      if (!keuanganData[i][1]) continue; // Skip if no date
      
      const date = new Date(keuanganData[i][1]);
      if (isNaN(date.getTime())) continue; // Skip invalid dates
      
      const monthYearKey = monthNames[date.getMonth()] + ' ' + date.getFullYear().toString().substring(2);
      
      if (!monthlyFinance[monthYearKey]) {
        monthlyFinance[monthYearKey] = { name: monthYearKey, income: 0, expense: 0, sortKey: date.getFullYear() * 100 + date.getMonth() };
      }
      
      const jenis = keuanganData[i][5]; // 'Masuk' atau 'Keluar'
      if (jenis === 'Masuk') {
        monthlyFinance[monthYearKey].income += Number(keuanganData[i][8] || 0);
      } else if (jenis === 'Keluar') {
        monthlyFinance[monthYearKey].expense += Number(keuanganData[i][9] || 0);
      }
    }
    
    // Sort bulanan by sortKey chronologically
    const financeAnalytics = Object.values(monthlyFinance)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ name, income, expense }) => ({ name, income, expense }));
      
    // 5. Analytics Sponsor
    // Agregasi jumlah sponsor per status
    const sponsorData = sponsorSheet.getDataRange().getValues();
    const sponsorStats = {
      'Deal / Potensial': 0,
      'Ditolak': 0,
      'Ditinjau': 0,
      'Sudah Dihubungi': 0,
      'Sudah ke Lokasi': 0,
      'Belum Dihubungi': 0
    };
    
    for (let i = 1; i < sponsorData.length; i++) {
      const status = sponsorData[i][7];
      if (status && sponsorStats[status] !== undefined) {
        sponsorStats[status]++;
      }
    }
    
    const sponsorAnalytics = Object.keys(sponsorStats)
      .filter(key => sponsorStats[key] > 0)
      .map(key => ({
        name: key,
        value: sponsorStats[key]
      }));

    return Response.success('Dashboard data fetched successfully', {
      stats: { 
        totalPanitia: totalPanitia, 
        panitiaAktif: panitiaAktif, 
        roleTersedia: roleTersedia, 
        aktivitasHariIni: aktivitasHariIni 
      },
      recentLogs: recentLogs,
      financeAnalytics: financeAnalytics,
      sponsorAnalytics: sponsorAnalytics
    });
  }
};
