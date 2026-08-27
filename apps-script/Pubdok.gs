const Pubdok = {
  
  _generateId: function(sheet, prefix) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return prefix + '-001';
    
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      const currentIdStr = data[i][0];
      if (currentIdStr && currentIdStr.toString().startsWith(prefix + '-')) {
        const num = parseInt(currentIdStr.toString().split('-')[1]);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    const nextNum = maxId + 1;
    return prefix + '-' + nextNum.toString().padStart(3, '0');
  },

  getPubdokData: function() {
    try {
      const ss = Utils.getSpreadsheet();
      
      // Get Planner
      let planner = [];
      const sheetPlanner = ss.getSheetByName('Pubdok_Planner');
      if (sheetPlanner) {
        const data = sheetPlanner.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (!data[i][0]) continue;
          planner.push({
            id: data[i][0],
            judul: data[i][1],
            platform: data[i][2],
            jadwal: data[i][3],
            status: data[i][4],
            caption: data[i][5],
            link_asset: data[i][6],
            pic: data[i][7]
          });
        }
        planner.reverse();
      }

      // Get Assets
      let assets = [];
      const sheetAssets = ss.getSheetByName('Pubdok_Assets');
      if (sheetAssets) {
        const data = sheetAssets.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (!data[i][0]) continue;
          assets.push({
            id: data[i][0],
            nama_asset: data[i][1],
            kategori: data[i][2],
            link_drive: data[i][3],
            keterangan: data[i][4],
            added_by: data[i][5]
          });
        }
        assets.reverse();
      }

      // Get Requests
      let requests = [];
      const sheetRequests = ss.getSheetByName('Pubdok_Requests');
      if (sheetRequests) {
        const data = sheetRequests.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (!data[i][0]) continue;
          requests.push({
            id: data[i][0],
            pemohon: data[i][1],
            event: data[i][2],
            deskripsi: data[i][3],
            kebutuhan: data[i][4],
            deadline: data[i][5],
            status: data[i][6],
            link_hasil: data[i][7]
          });
        }
        requests.reverse();
      }

      return Response.success('Data Pubdok berhasil diambil.', { planner, assets, requests });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  addPlanner: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Planner');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Pubdok_Planner belum di-setup.');
      
      const newId = this._generateId(sheet, 'PLN');
      const newRow = [
        newId,
        body.judul || "-",
        body.platform || "-",
        body.jadwal || "-",
        body.status || "Draft",
        body.caption || "-",
        body.link_asset || "-",
        body.pic || "-"
      ];
      
      sheet.appendRow(newRow);
      
      if (user) {
        ActivityLogs.log(user.user_id, null, user.role_name || user.role_id, 'Pubdok', 'ADD_PLANNER', `Menambahkan Planner: ${body.judul}`, '-', newId);
      }
      
      return Response.success('Jadwal konten berhasil ditambahkan.', { id: newId });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  editPlanner: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Planner');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Pubdok_Planner tidak ada.');
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id) {
          rowIndex = i + 1; break;
        }
      }
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Data tidak ditemukan.');
      
      const newValues = [
        body.id,
        body.judul || "-",
        body.platform || "-",
        body.jadwal || "-",
        body.status || "Draft",
        body.caption || "-",
        body.link_asset || "-",
        body.pic || "-"
      ];
      
      sheet.getRange(rowIndex, 1, 1, newValues.length).setValues([newValues]);
      return Response.success('Jadwal konten berhasil diubah.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  deletePlanner: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Planner');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id) {
          rowIndex = i + 1; break;
        }
      }
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Data tidak ditemukan.');
      sheet.deleteRow(rowIndex);
      return Response.success('Jadwal konten berhasil dihapus.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  addAsset: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Assets');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Pubdok_Assets belum di-setup.');
      
      const newId = this._generateId(sheet, 'AST');
      const newRow = [
        newId,
        body.nama_asset || "-",
        body.kategori || "-",
        body.link_drive || "-",
        body.keterangan || "-",
        user ? user.name : "System"
      ];
      sheet.appendRow(newRow);
      return Response.success('Asset berhasil ditambahkan.', { id: newId });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  deleteAsset: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Assets');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id) {
          rowIndex = i + 1; break;
        }
      }
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Data tidak ditemukan.');
      sheet.deleteRow(rowIndex);
      return Response.success('Asset berhasil dihapus.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  addRequest: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Requests');
      if (!sheet) return Response.error('NOT_FOUND', 'Sheet Pubdok_Requests belum di-setup.');
      
      const newId = this._generateId(sheet, 'REQ');
      const newRow = [
        newId,
        user ? user.name : (body.pemohon || "-"),
        body.event || "-",
        body.deskripsi || "-",
        body.kebutuhan || "-",
        body.deadline || "-",
        "Menunggu", // Status awal
        "-" // Link hasil
      ];
      sheet.appendRow(newRow);
      return Response.success('Request desain berhasil dikirim.', { id: newId });
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  editRequestStatus: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Requests');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id) {
          rowIndex = i + 1; break;
        }
      }
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Data tidak ditemukan.');
      
      // Update Status and Link Hasil
      sheet.getRange(rowIndex, 7).setValue(body.status);
      if (body.link_hasil) {
        sheet.getRange(rowIndex, 8).setValue(body.link_hasil);
      }
      
      return Response.success('Status request berhasil diubah.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },
  
  deleteRequest: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Requests');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id) {
          rowIndex = i + 1; break;
        }
      }
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Data tidak ditemukan.');
      sheet.deleteRow(rowIndex);
      return Response.success('Request berhasil dihapus.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  },

  accRequest: function(body, user) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Pubdok_Requests');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let reqData = null;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.id) {
          rowIndex = i + 1;
          reqData = data[i];
          break;
        }
      }
      if (rowIndex === -1) return Response.error('NOT_FOUND', 'Data request tidak ditemukan.');
      
      // Update Status Request to 'Dikerjakan'
      sheet.getRange(rowIndex, 7).setValue('Dikerjakan');

      // Ambil data untuk dipindah ke Planner
      // data mapping: id(0), pemohon(1), event(2), deskripsi(3), kebutuhan(4), deadline(5), status(6), link(7)
      const reqEvent = reqData[2];
      const reqKebutuhan = reqData[4];
      const reqDeadline = reqData[5];
      const reqDeskripsi = reqData[3];
      
      const plannerTitle = `[Request] ${reqEvent} - ${reqKebutuhan}`;
      
      // Insert into Planner
      const plannerSheet = ss.getSheetByName('Pubdok_Planner');
      if (plannerSheet) {
        const newPlannerId = this._generateId(plannerSheet, 'PLN');
        const newPlannerRow = [
          newPlannerId,
          plannerTitle,
          'Lainnya',       // Platform default
          reqDeadline,     // Jadwal diambil dari deadline
          'Draft',         // Status awal di planner
          reqDeskripsi,    // Caption/Deskripsi
          '-',             // Link asset
          user ? user.name : '-' // PIC
        ];
        plannerSheet.appendRow(newPlannerRow);
      }
      
      if (user) {
        ActivityLogs.log(user.user_id, null, user.role_name || user.role_id, 'Pubdok', 'ACC_REQUEST', `Menerima Request: ${reqEvent}`, '-', body.id);
      }

      return Response.success('Request berhasil di-ACC dan masuk ke Planner.');
    } catch (error) {
      return Response.error('INTERNAL_ERROR', error.toString());
    }
  }
};
