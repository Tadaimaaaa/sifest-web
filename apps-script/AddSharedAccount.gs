function createSharedPanitiaAccount() {
  const ss = Utils.getSpreadsheet();
  const usersSheet = ss.getSheetByName('Users');
  
  if (!usersSheet) return 'Sheet Users tidak ditemukan!';
  
  const salt = 'salt123';
  const passHash = Utils.hashPassword('panitia', salt);
  const newId = Utils.generateSequentialId('Users', 'USER');
  
  usersSheet.appendRow([
    newId, 
    'Akun Bersama Panitia', 
    '', 
    'panitia', 
    passHash, 
    salt, 
    'panitia@sifest.com', 
    '', 
    'Semua Divisi', 
    'Panitia', 
    'ROLE-004', 
    'ACTIVE', 
    '', 
    new Date(), 
    new Date()
  ]);
  
  return 'Berhasil membuat akun bersama: Username: panitia | Password: panitia';
}
