function setupDatabase() {
  const ss = Utils.getSpreadsheet();
  
  // 1. Setup Sheet: Users
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) usersSheet = ss.insertSheet('Users');
  
  const userHeaders = ['user_id', 'name', 'nim', 'username', 'password_hash', 'password_salt', 'email', 'phone', 'division', 'position', 'role_id', 'status', 'profile_photo', 'created_at', 'updated_at'];
  usersSheet.getRange(1, 1, 1, userHeaders.length).setValues([userHeaders]).setFontWeight('bold');
  
  // Masukkan Dummy Super Admin jika belum ada
  if (usersSheet.getLastRow() === 1) {
    usersSheet.appendRow([
      'USR-001', 'Super Admin', '11223344', 'admin', 
      '358cb55027427c0cc9616b83421bff20989beb251bc8c86e1317b66ad7abb992', 
      'salt123', 'admin@sifest.com', '08123456789', 'Inti', 'Ketua', 'ROLE-001', 'ACTIVE', '', new Date(), new Date()
    ]);
  }

  // 2. Setup Sheet: Sessions
  let sessionsSheet = ss.getSheetByName('Sessions');
  if (!sessionsSheet) sessionsSheet = ss.insertSheet('Sessions');
  const sessionHeaders = ['session_id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'last_activity', 'status'];
  sessionsSheet.getRange(1, 1, 1, sessionHeaders.length).setValues([sessionHeaders]).setFontWeight('bold');

  // 3. Setup Sheet: Activity_Logs
  let logsSheet = ss.getSheetByName('Activity_Logs');
  if (!logsSheet) logsSheet = ss.insertSheet('Activity_Logs');
  const logHeaders = ['log_id', 'user_id', 'target_user_id', 'user_role', 'module', 'action', 'description', 'old_value', 'new_value', 'created_at'];
  logsSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]).setFontWeight('bold');

  // 4. Setup Sheet: Roles
  let rolesSheet = ss.getSheetByName('Roles');
  if (!rolesSheet) rolesSheet = ss.insertSheet('Roles');
  const roleHeaders = ['role_id', 'role_code', 'role_name', 'description', 'status'];
  rolesSheet.getRange(1, 1, 1, roleHeaders.length).setValues([roleHeaders]).setFontWeight('bold');
  if (rolesSheet.getLastRow() === 1) {
    rolesSheet.appendRow(['ROLE-001', 'SUPER_ADMIN', 'Super Admin', 'Akses tertinggi', 'ACTIVE']);
    rolesSheet.appendRow(['ROLE-002', 'SC', 'Steering Committee', 'Pengawas', 'ACTIVE']);
    rolesSheet.appendRow(['ROLE-003', 'PJ_KAPEL', 'PJ / Kapel', 'Pelaksana operasional', 'ACTIVE']);
  }
  // 5. Setup Sheet: Keuangan
  let keuanganSheet = ss.getSheetByName('Keuangan');
  if (!keuanganSheet) keuanganSheet = ss.insertSheet('Keuangan');
  const keuanganHeaders = [
    'No', 
    'Tanggal', 
    'ID Transaksi', 
    'Kategori / Divisi', 
    'Detail / Keterangan', 
    'Jenis Transaksi', 
    'Vol', 
    'Satuan', 
    'Masuk / Debet (Rp)', 
    'Keluar / Kredit (Rp)', 
    'Saldo Akhir (Rp)', 
    'Bukti / No. Nota', 
    'Penanggung Jawab', 
    'Status'
  ];
  keuanganSheet.getRange(1, 1, 1, keuanganHeaders.length).setValues([keuanganHeaders]).setFontWeight('bold');
  
  // 6. Setup Sheet: Sponsor
  let sponsorSheet = ss.getSheetByName('Sponsor');
  if (!sponsorSheet) sponsorSheet = ss.insertSheet('Sponsor');
  const sponsorHeaders = [
    'ID Sponsor',
    'Nama Sponsor / Brand',
    'PIC / Kontak',
    'No. HP / Link Form',
    'Email',
    'Tanggal Pemberian Proposal',
    'Follow Up Proposal',
    'Status',
    'Keterangan',
    'Catatan',
    'Ditambahkan Oleh'
  ];
  sponsorSheet.getRange(1, 1, 1, sponsorHeaders.length).setValues([sponsorHeaders]).setFontWeight('bold');
  
  // 7. Setup Sheet: Surat
  let suratSheet = ss.getSheetByName('Surat');
  if (!suratSheet) suratSheet = ss.insertSheet('Surat');
  const suratHeaders = [
    'ID Surat',
    'Jenis Surat',
    'Nomor Surat',
    'Tanggal',
    'Instansi (Pengirim/Tujuan)',
    'Perihal',
    'Status / Keterangan',
    'Link File Surat',
    'Ditambahkan Oleh'
  ];
  suratSheet.getRange(1, 1, 1, suratHeaders.length).setValues([suratHeaders]).setFontWeight('bold');
  
  // 8. Setup Sheet: Produk Sponsor
  let produkSheet = ss.getSheetByName('Produk Sponsor');
  if (!produkSheet) produkSheet = ss.insertSheet('Produk Sponsor');
  const produkHeaders = [
    'ID Produk',
    'Nama Produk',
    'Asal Sponsor',
    'Harga Satuan',
    'Target Penjualan',
    'Sudah Terjual',
    'Keterangan',
    'Foto Produk',
    'Ditambahkan Oleh'
  ];
  produkSheet.getRange(1, 1, 1, produkHeaders.length).setValues([produkHeaders]).setFontWeight('bold');
  
  // Hapus Sheet default jika namanya Sheet1/Sheet2 dan kosong
  const sheet2 = ss.getSheetByName('Sheet2');
  if (sheet2) ss.deleteSheet(sheet2);
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1) ss.deleteSheet(sheet1);

  return 'Setup Database Selesai!';
}

// Fungsi ini HANYA untuk memancing Google memunculkan popup "Review Permissions" (Otorisasi Drive Penuh)
function authorizeDrive() {
  DriveApp.getFoldersByName("PancinganOtorisasi");
  // Baris ini akan memaksa Google untuk meminta izin penuh (Full Access) ke Drive, 
  // bukan hanya Read Only (agar kita bisa bikin folder dan upload file)
  DriveApp.createFolder("Folder_Pancingan_Hapus_Saja");
  return "Izin ke Google Drive berhasil diberikan secara Penuh! Sekarang coba ulangi upload di website.";
}
