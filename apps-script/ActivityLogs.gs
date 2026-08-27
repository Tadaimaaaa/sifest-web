const ActivityLogs = {
  sheetName: 'Activity_Logs',
  
  _ensureSheetExists: function() {
    const ss = Utils.getSpreadsheet();
    let sheet = ss.getSheetByName(this.sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(this.sheetName);
      sheet.appendRow(['log_id', 'user_id', 'target_user_id', 'user_role', 'module', 'action', 'description', 'old_value', 'new_value', 'created_at']);
      sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#f3f4f6");
    }
    return sheet;
  },
  
  log: function(userId, targetUserId, userRole, module, action, description, oldValue, newValue) {
    const sheet = this._ensureSheetExists();
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
    // Only ROLE-001 (SuperAdmin) can view logs
    if (!authUser || authUser.role_id !== 'ROLE-001') {
      return Response.error('UNAUTHORIZED', 'Hanya SuperAdmin yang dapat melihat log aktivitas.');
    }

    const sheet = this._ensureSheetExists();
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
