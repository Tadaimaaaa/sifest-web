function fixDuplicateIds() {
  const ss = Utils.getSpreadsheet();
  const usersSheet = ss.getSheetByName('Users');
  
  if (!usersSheet) return 'Sheet Users tidak ditemukan';
  
  const data = usersSheet.getDataRange().getValues();
  
  // Lewati baris 1 (Header) dan baris 2 (Super Admin)
  for (let i = 2; i < data.length; i++) {
    // Generate ID unik dengan tambahan counter i agar PASTI tidak sama
    const uniqueId = 'USR-' + new Date().getTime() + Math.floor(Math.random() * 1000) + '-' + i;
    
    // Update kolom A (user_id)
    usersSheet.getRange(i + 1, 1).setValue(uniqueId);
  }
  
  return 'Berhasil memperbaiki ID duplikat pada ' + (data.length - 2) + ' panitia!';
}
