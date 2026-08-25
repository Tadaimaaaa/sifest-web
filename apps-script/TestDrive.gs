function testHapusFoto() {
  try {
    const folders = DriveApp.getFoldersByName("SIFEST_Bukti_Keuangan");
    let folderCount = 0;
    let fileCount = 0;
    let log = [];
    
    while (folders.hasNext()) {
      folderCount++;
      const folder = folders.next();
      const files = folder.getFiles();
      
      while (files.hasNext()) {
        const file = files.next();
        file.setTrashed(true);
        fileCount++;
      }
    }
    
    if (folderCount === 0) {
      console.log("GAGAL: Folder 'SIFEST_Bukti_Keuangan' sama sekali tidak ditemukan di Drive Anda.");
    } else if (fileCount === 0) {
      console.log("INFO: Ditemukan " + folderCount + " folder, tapi SEMUANYA KOSONG (tidak ada foto).");
    } else {
      console.log("SUKSES: Ditemukan " + folderCount + " folder. Berhasil menghapus " + fileCount + " foto ke sampah!");
    }
    
  } catch (e) {
    console.log("ERROR GOOGLE DRIVE: " + e.toString());
  }
}
