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
      default:
        return Response.success('SI FEST Management API is Active.', null);
    }
  } catch (error) {
    return Response.error('INTERNAL_ERROR', error.toString());
  }
}
