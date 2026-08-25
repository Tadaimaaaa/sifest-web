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
  }
};
