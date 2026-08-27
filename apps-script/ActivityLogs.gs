const ActivityLogs = {
  sheetName: 'Activity_Logs',
  
  log: function(userId, targetUserId, userRole, module, action, description, oldValue, newValue) {
    const sheet = Utils.getSheet(this.sheetName);
    const logId = Utils.generateId('LOG');
    const now = new Date();
    
    // log_id(0), user_id(1), target_user_id(2), user_role(3), module(4), action(5), description(6), old_value(7), new_value(8), created_at(9)
    sheet.appendRow([
      logId,
      userId || '',
      targetUserId || '',
      userRole || '',
      module || '',
      action || '',
      description || '',
      oldValue ? JSON.stringify(oldValue) : '',
      newValue ? JSON.stringify(newValue) : '',
      now
    ]);
  },

  getLogs: function(authUser) {
    if (!authUser || authUser.role !== 'SuperAdmin') {
      return Response.error('UNAUTHORIZED', 'Hanya SuperAdmin yang dapat melihat log aktivitas.');
    }

    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    const logs = [];
    
    // Mulai dari bawah ke atas agar yang terbaru muncul pertama
    for (let i = data.length - 1; i >= 1; i--) {
      logs.push({
        id: data[i][0],
        user_id: data[i][1],
        target_user_id: data[i][2],
        user_role: data[i][3],
        module: data[i][4],
        action: data[i][5],
        description: data[i][6],
        old_value: data[i][7] ? JSON.parse(data[i][7]) : null,
        new_value: data[i][8] ? JSON.parse(data[i][8]) : null,
        created_at: data[i][9]
      });
    }
    
    return Response.success('Berhasil mengambil log aktivitas', logs);
  }
};
