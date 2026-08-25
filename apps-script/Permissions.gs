const Permissions = {
  sheetRolePerm: 'Role_Permissions',
  sheetPerm: 'Permissions',
  
  checkPermission: function(roleId, permissionCode) {
    // 1. Cari permission_id berdasarkan permissionCode
    const sheetP = Utils.getSheet(this.sheetPerm);
    const dataP = sheetP.getDataRange().getValues();
    let permissionId = null;
    
    for (let i = 1; i < dataP.length; i++) {
      if (dataP[i][1] === permissionCode && dataP[i][5] === 'ACTIVE') {
        permissionId = dataP[i][0];
        break;
      }
    }
    
    if (!permissionId) return false;
    
    // 2. Cek apakah roleId memiliki permissionId yang is_allowed = TRUE
    const sheetRP = Utils.getSheet(this.sheetRolePerm);
    const dataRP = sheetRP.getDataRange().getValues();
    
    for (let i = 1; i < dataRP.length; i++) {
      if (dataRP[i][1] === roleId && dataRP[i][2] === permissionId) {
        // Kolom is_allowed (boolean/string)
        return dataRP[i][3] === true || dataRP[i][3] === 'TRUE'; 
      }
    }
    
    return false;
  },
  
  // Middleware/Helper 
  authorize: function(user, permissionCode) {
    if (!user || user.status !== 'ACTIVE') return false;
    // SUPER_ADMIN (asumsi ROLE-001) bypass atau tetap cek DB. Untuk amannya cek DB.
    return this.checkPermission(user.role_id, permissionCode);
  }
};
