const Roles = {
  sheetName: 'Roles',
  
  getRole: function(roleId) {
    const sheet = Utils.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === roleId && data[i][4] === 'ACTIVE') {
        return {
          role_id: data[i][0],
          role_code: data[i][1],
          role_name: data[i][2]
        };
      }
    }
    return null;
  }
};
