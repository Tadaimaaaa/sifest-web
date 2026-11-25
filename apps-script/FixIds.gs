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

/**
 * Merapikan ID Transaksi di sheet Keuangan agar berurutan (TRX-001, TRX-002, ...)
 * HANYA mengubah Kolom C (ID Transaksi), seluruh isi baris lainnya (tanggal, nominal, bukti, dll)
 * 100% UTUH dan TIDAK diubah sama sekali.
 */
function fixKeuanganSequentialIds() {
  const ss = Utils.getSpreadsheet();
  const sheet = ss.getSheetByName('Keuangan');
  if (!sheet) {
    Logger.log('Sheet Keuangan tidak ditemukan');
    return 'Sheet Keuangan tidak ditemukan';
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('Tidak ada data di sheet Keuangan.');
    return 'Tidak ada data di sheet Keuangan.';
  }
  
  const numRows = lastRow - 1;
  const newIds = [];
  for (let i = 0; i < numRows; i++) {
    const newId = 'TRX-' + String(i + 1).padStart(3, '0');
    newIds.push([newId]);
  }
  
  // Tulis HANYA ke Kolom C (Kolom 3 / ID Transaksi) mulai baris 2
  sheet.getRange(2, 3, numRows, 1).setValues(newIds);
  
  const resultMsg = 'Berhasil merapikan ' + numRows + ' ID Transaksi menjadi berurutan (TRX-001 s.d. TRX-' + String(numRows).padStart(3, '0') + ') tanpa mengubah isi data lainnya!';
  Logger.log(resultMsg);
  return resultMsg;
}
