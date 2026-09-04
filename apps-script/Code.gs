// Entry Point Apps Script API

function doPost(e) {
  try {
    const action = e.parameter.action;
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    
    switch (action) {
      case 'login':
        return Auth.login(body);
      case 'logout':
        return Auth.logout(body);
      case 'createUser':
        return Users.createUser(body);
      case 'updateUserAccess':
        const authUser = Auth.validateToken(body.token);
        return Users.updateUserAccess(body, authUser);
      case 'addKeuangan':
        return Keuangan.addTransaction(body, Auth.validateToken(body.token));
      case 'deleteKeuangan':
        return Keuangan.deleteTransaction(body, Auth.validateToken(body.token));
      case 'editKeuangan':
        return Keuangan.editTransaction(body, Auth.validateToken(body.token));
      case 'addSponsor':
        return Sponsor.addSponsor(body, Auth.validateToken(body.token));
      case 'editSponsor':
        return Sponsor.editSponsor(body, Auth.validateToken(body.token));
      case 'deleteSponsor':
        return Sponsor.deleteSponsor(body, Auth.validateToken(body.token));
      case 'addSurat':
        return Surat.addSurat(body, Auth.validateToken(body.token));
      case 'editSurat':
        return Surat.editSurat(body, Auth.validateToken(body.token));
      case 'deleteSurat':
        return Surat.deleteSurat(body, Auth.validateToken(body.token));
      case 'addProduk':
        return Produk.addProduk(body, Auth.validateToken(body.token));
      case 'editProduk':
        return Produk.editProduk(body, Auth.validateToken(body.token));
      case 'deleteProduk':
        return Produk.deleteProduk(body, Auth.validateToken(body.token));
      case 'updateJumlahTerjual':
        return Produk.updateJumlahTerjual(body, Auth.validateToken(body.token));
      case 'addVarianProduk':
        return Produk.addVarian(body, Auth.validateToken(body.token));
      case 'updateVarianProduk':
        return Produk.updateVarian(body, Auth.validateToken(body.token));
      case 'deleteVarianProduk':
        return Produk.deleteVarian(body, Auth.validateToken(body.token));
      case 'addDistribusiMultiProduk':
        return Produk.addDistribusiMulti(body, Auth.validateToken(body.token));
      case 'deleteDistribusiProduk':
        return Produk.deleteDistribusi(body, Auth.validateToken(body.token));
      case 'addPenjualanBundleProduk':
        return Produk.addPenjualanBundle(body, Auth.validateToken(body.token));
      case 'deletePenjualanBundleProduk':
        return Produk.deletePenjualanBundle(body, Auth.validateToken(body.token));
      case 'getActivityLogs':
        return ActivityLogs.getLogs(Auth.validateToken(body.session_token));
        
      // Pubdok Routes
      case 'addPubdokPlanner':
        return Pubdok.addPlanner(body, Auth.validateToken(body.token));
      case 'editPubdokPlanner':
        return Pubdok.editPlanner(body, Auth.validateToken(body.token));
      case 'deletePubdokPlanner':
        return Pubdok.deletePlanner(body, Auth.validateToken(body.token));
      case 'addPubdokAsset':
        return Pubdok.addAsset(body, Auth.validateToken(body.token));
      case 'deletePubdokAsset':
        return Pubdok.deleteAsset(body, Auth.validateToken(body.token));
      case 'addPubdokRequest':
        return Pubdok.addRequest(body, Auth.validateToken(body.token));
      case 'editPubdokRequestStatus':
        return Pubdok.editRequestStatus(body, Auth.validateToken(body.token));
      case 'accPubdokRequest':
        return Pubdok.accRequest(body, Auth.validateToken(body.token));
      case 'deletePubdokRequest':
        return Pubdok.deleteRequest(body, Auth.validateToken(body.token));
        
      // Event & Bazaar Routes
      case 'saveEvent':
        return Event.saveEvent(body);
      case 'saveBazaarTenant':
        return Event.saveBazaarTenant(body);
        
      default:
        return Response.error('NOT_FOUND', 'Action not found.');
    }
  } catch (error) {
    return Response.error('INTERNAL_ERROR', error.toString());
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getDashboard':
        return Dashboard.getStats();
      case 'getUsers':
        return Users.getUsers();
      case 'getKeuangan':
        return Keuangan.getTransactions();
      case 'getSponsors':
        return Sponsor.getSponsors();
      case 'getSurat':
        return Surat.getSurat();
      case 'getProduk':
        return Produk.getProduk();
      case 'getProdukById':
        return Produk.getProdukById(e.parameter.id);
      case 'getPubdok':
        return Pubdok.getPubdokData();
      
      // Event & Bazaar Routes
      case 'getEvent':
        return Event.getEvent(e.parameter.id_event);
      case 'getBazaarTenants':
        return Event.getBazaarTenants();
        
      default:
        return Response.success('SI FEST Management API is Active.', null);
    }
  } catch (error) {
    return Response.error('INTERNAL_ERROR', error.toString());
  }
}

// ==========================================
// ==========================================
// FUNGSI SETUP OTOMATIS
// Pilih fungsi ini di menu dropdown lalu klik "Run" / "Jalankan"
// ==========================================
function setupPubdokSheets() {
  const ss = Utils.getSpreadsheet();
  
  // 1. Setup Pubdok_Planner
  let plannerSheet = ss.getSheetByName('Pubdok_Planner');
  if (!plannerSheet) {
    plannerSheet = ss.insertSheet('Pubdok_Planner');
    plannerSheet.appendRow(['ID', 'Judul Konten', 'Platform', 'Jadwal', 'Status', 'Caption', 'Link Asset', 'PIC']);
    plannerSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#d9ead3");
  }

  // 2. Setup Pubdok_Assets
  let assetSheet = ss.getSheetByName('Pubdok_Assets');
  if (!assetSheet) {
    assetSheet = ss.insertSheet('Pubdok_Assets');
    assetSheet.appendRow(['ID', 'Nama Asset', 'Kategori', 'Link Drive', 'Keterangan', 'Ditambahkan Oleh']);
    assetSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#c9daf8");
  }

  // 3. Setup Pubdok_Requests
  let reqSheet = ss.getSheetByName('Pubdok_Requests');
  if (!reqSheet) {
    reqSheet = ss.insertSheet('Pubdok_Requests');
    reqSheet.appendRow(['ID', 'Pemohon', 'Divisi', 'Deskripsi Kebutuhan', 'Jenis', 'Deadline', 'Status', 'Link Hasil']);
    reqSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#fff2cc");
  }

  Logger.log("Berhasil! 3 Sheet Pubdok sudah dibuat secara otomatis.");
}
