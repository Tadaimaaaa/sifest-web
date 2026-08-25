function seedDataKeuangan() {
  const ss = Utils.getSpreadsheet();
  let sheet = ss.getSheetByName('Keuangan');
  
  if (!sheet) {
    throw new Error("Sheet Keuangan belum ada. Jalankan setupDatabase() terlebih dahulu.");
  }
  
  // Hapus data lama jika ada (sisakan header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  const seedData = [
    [1, '2026-08-08', 'INC-001', 'Dana Usaha', 'Keperluan Awal 1', 'Masuk', '-', '-', 200000, 0, 200000, 'TRX-001', 'Zhara', 'Lunas'],
    [2, '2026-08-10', 'EXP-001', 'Humas', 'Print Surat Pengantar Proposal', 'Keluar', 2, 'Pcs', 0, 2000, 198000, 'NT-001', 'Bg Zikri', 'Lunas'],
    [3, '2026-08-10', 'EXP-002', 'Humas', 'Print,Jilid Proposal dan surat izin', 'Keluar', '-', '-', 0, 34500, 163500, 'NT-002', 'Bg Farraz', 'Lunas'],
    [4, '2026-08-10', 'EXP-003', 'Humas', 'Print Surat tanda tangan', 'Keluar', 5, 'Pcs', 0, 5000, 158500, 'NT-003', 'Radit', 'Lunas'],
    [5, '2026-08-11', 'EXP-004', 'Humas', 'Jilid,Print, dan Map', 'Keluar', '-', '-', 0, 26500, 132000, 'NT-004', 'Ara', 'Lunas'],
    [6, '2026-08-11', 'EXP-005', 'Humas', 'Print', 'Keluar', 5, 'pcs', 0, 3000, 129000, 'NT-005', 'Ara', 'Lunas'],
    [7, '2026-08-11', 'EXP-006', 'Humas', 'Amplop', 'Keluar', 10, 'pcs', 0, 5000, 124000, 'NT-006', 'Ara', 'Lunas'],
    [8, '2026-08-11', 'EXP-007', 'Humas', '-', 'Keluar', '-', '-', 0, 123000, 1000, 'NT-007', 'Ara', 'Lunas'],
    [9, '2026-08-16', 'EXP-008', 'Humas', 'Print Proposal', 'Keluar', 1, 'Rangkap', 0, 15000, -14000, 'NT-008', 'Bg Zikri', 'Lunas'],
    [10, '2026-08-16', 'EXP-009', 'Humas', 'Jilid Proposal', 'Keluar', 2, 'Rangkap', 0, 28000, -42000, 'NT-009', 'Bg Zikri', 'Lunas'],
    [11, '2026-08-12', 'EXP-010', 'Humas', 'Amplop Paperline EV 90 PPS', 'Keluar', 1, 'KTK', 0, 25000, -67000, 'NT-010', 'Bg Farraz', 'Lunas'],
    [12, '2026-08-12', 'EXP-011', 'Humas', 'Amplop Kesing Executive Folio Len', 'Keluar', 1, 'Pack', 0, 45000, -112000, 'NT-011', 'Bg Farraz', 'Lunas'],
    [13, '2026-08-18', 'INC-002', 'Dana Usaha', 'Keperluan Awal 2', 'Masuk', '-', '-', 200000, 0, 88000, 'TRX-002', 'Zhara', 'Lunas'],
    [14, '2026-08-18', 'EXP-012', 'Humas', 'Jilid Pengantar Proposal', 'Keluar', 10, 'Rangkap', 0, 30000, 58000, 'NT-012', 'Ara', 'Lunas'],
    [15, '2026-08-18', 'EXP-013', 'Humas', 'Print Pengantar Proposal', 'Keluar', 132, 'Pcs', 0, 90000, -32000, 'NT-013', 'Ara', 'Lunas'],
    [16, '2026-08-18', 'INC-003', 'Dana Usaha', 'Keperluan Awal 3', 'Masuk', '-', '-', 520000, 0, 488000, 'TRX-003', 'Zhara', 'Lunas'],
    [17, '2026-08-19', 'EXP-014', 'Sponsor', 'Ongkir Barang Saynana', 'Keluar', 1, 'Paket', 0, 520000, -32000, 'NT-014', 'PT. SANIRASA PANGAN INDON', 'Lunas'],
    [18, '2026-08-19', 'EXP-015', 'Sponsor', 'Matrai Saynana', 'Keluar', 1, 'pcs', 0, 12500, -44500, 'TRX-004', 'PT. SANIRASA PANGAN INDON', 'Lunas'],
    [19, '2026-08-19', 'INC-004', 'Dana Usaha', 'Keperluan Awal 4', 'Masuk', '-', '-', 50000, 0, 5500, 'TRX-004', 'Zhara', 'Lunas']
  ];
  
  sheet.getRange(2, 1, seedData.length, 14).setValues(seedData);
  return "19 Data berhasil dimasukkan dengan perhitungan Saldo yang sudah terkoreksi otomatis!";
}
