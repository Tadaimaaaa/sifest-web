const Sessions = {
  sheetName: 'Sessions',
  
  create: function(userId, tokenHash) {
    const sheet = Utils.getSheet(this.sheetName);
    const sessionId = Utils.generateId('SESS');
    const now = new Date();
    // Expiry: 7 Hari
    const expiresAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    // session_id, user_id, token_hash, created_at, expires_at, last_activity, status
    sheet.appendRow([
      sessionId,
      userId,
      tokenHash,
      now,
      expiresAt,
      now,
      'ACTIVE'
    ]);
    return sessionId;
  },
  
  findByHash: function(tokenHash) {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === tokenHash && data[i][6] === 'ACTIVE') {
        return {
          row_index: i + 1,
          session_id: data[i][0],
          user_id: data[i][1],
          token_hash: data[i][2],
          expires_at: data[i][4],
          status: data[i][6]
        };
      }
    }
    return null;
  },
  
  revoke: function(sessionId) {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sessionId) {
        // Kolom status ada di index 6 (kolom ke 7)
        sheet.getRange(i + 1, 7).setValue('REVOKED');
        break;
      }
    }
  },
  
  updateActivity: function(sessionId) {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sessionId) {
        // Kolom last_activity ada di index 5 (kolom ke 6)
        sheet.getRange(i + 1, 6).setValue(new Date());
        break;
      }
    }
  }
};
