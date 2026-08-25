function seedDataProduk() {
  const ss = Utils.getSpreadsheet();
  let sheet = ss.getSheetByName('Produk Sponsor');
  
  if (!sheet) {
    throw new Error("Sheet 'Produk Sponsor' belum ada. Jalankan setupDatabase() terlebih dahulu.");
  }
  
  // Hapus data lama jika ada (sisakan header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  // Kolom: ID Produk | Nama Produk | Asal Sponsor | Harga Satuan | Target Penjualan | Sudah Terjual | Keterangan | Foto Produk | Ditambahkan Oleh
  const seedData = [
    ['PRD-001', 'Kopi Americano', 'Kopi Kenangan', 20000, 100, 43, 'Dijual di area stand event, gratis gula. Stok menipis, segera kejar target!', '-', 'Admin'],
    ['PRD-002', 'Tote Bag SI FEST 2026', 'Unand Store', 75000, 50, 50, 'Target penjualan tercapai! 🎉 Sisa stok 0, pertimbangkan restock.', '-', 'Admin'],
    ['PRD-003', 'Stiker Pack Vol.1', 'Percetakan Mitra', 10000, 200, 112, 'Paket isi 5 lembar stiker. Populer di kalangan peserta seminar.', '-', 'Admin'],
    ['PRD-004', 'Tumbler Eksklusif SIFEST', 'Hydroflask Indonesia', 150000, 30, 8, 'Tumbler edisi terbatas, ada logo SI FEST. Promosikan lebih gencar ke peserta.', '-', 'Admin'],
    ['PRD-005', 'Bingkisan Snack Saynana', 'PT. Sanirasa Pangan', 45000, 80, 65, 'Paket snack renyah isi 3 produk. Cocok untuk souvenir peserta.', '-', 'Admin'],
    ['PRD-006', 'Pin Bundle (Set 3)', 'UMKM Lokal Padang', 15000, 150, 91, 'Set 3 pin tema teknologi dan festival. Penjualan via online dan offline.', '-', 'Admin'],
  ];
  
  sheet.getRange(2, 1, seedData.length, 9).setValues(seedData);
  
  Logger.log('✅ Berhasil menambahkan ' + seedData.length + ' data produk dummy ke sheet Produk Sponsor.');
  return '✅ ' + seedData.length + ' produk dummy berhasil ditambahkan!';
}
