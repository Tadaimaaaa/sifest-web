const Event = {
  getEvent: function(id_event) {
    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("DataEvent");
    
    if (!sheet) {
      sheet = ss.insertSheet("DataEvent");
      sheet.appendRow(["id_event", "nama_event", "tanggal", "tempat", "deskripsi", "status", "updated_at"]);
      return Response.success('Event not found', null);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1 && data[0][0] === "") return Response.success('Event not found', null);
    
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id_event) {
        var eventData = {};
        for (var j = 0; j < headers.length; j++) {
          eventData[headers[j]] = data[i][j];
        }
        return Response.success('Berhasil', eventData);
      }
    }
    return Response.success('Event not found', null);
  },

  saveEvent: function(payload) {
    var id_event = payload.id_event;
    if (!id_event) return Response.error('BAD_REQUEST', 'ID Event wajib diisi');
    
    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("DataEvent");
    
    if (!sheet) {
      sheet = ss.insertSheet("DataEvent");
      sheet.appendRow(["id_event", "nama_event", "tanggal", "tempat", "deskripsi", "status", "updated_at"]);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1 && data[0][0] === "") {
      sheet.clear();
      sheet.appendRow(["id_event", "nama_event", "tanggal", "tempat", "deskripsi", "status", "updated_at"]);
      data = sheet.getDataRange().getValues();
    }
    var headers = data[0];
    
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id_event) {
        rowIndex = i;
        break;
      }
    }
    
    var newValues = [];
    var timestamp = new Date();
    
    if (rowIndex === -1) {
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j];
        if (h === "updated_at") newValues.push(timestamp);
        else newValues.push(payload[h] || "");
      }
      sheet.appendRow(newValues);
    } else {
      var currentRow = data[rowIndex];
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j];
        if (h === "updated_at") newValues.push(timestamp);
        else if (payload.hasOwnProperty(h)) newValues.push(payload[h]);
        else newValues.push(currentRow[j]);
      }
      sheet.getRange(rowIndex + 1, 1, 1, newValues.length).setValues([newValues]);
    }
    
    return Response.success('Berhasil disimpan', payload);
  },

  getBazaarTenants: function() {
    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("Bazaar");
    
    if (!sheet) {
      sheet = ss.insertSheet("Bazaar");
      sheet.appendRow(["id_tenda", "nama_brand", "pic", "kontak", "kategori", "status_bayar", "updated_at"]);
      return Response.success("Berhasil", []);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1 && data[0][0] === "") return Response.success("Berhasil", []);
    
    var headers = data[0];
    var tenants = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var tenant = {};
      for (var j = 0; j < headers.length; j++) {
        tenant[headers[j]] = row[j] || "";
      }
      
      if (tenant.status_bayar && tenant.status_bayar !== "Kosong") {
        tenants.push(tenant);
      }
    }
    
    return Response.success("Berhasil", tenants);
  },

  saveBazaarTenant: function(payload) {
    var id_tenda = payload.id_tenda;
    if (!id_tenda) return Response.error('BAD_REQUEST', 'ID Tenda wajib diisi');
    
    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("Bazaar");
    
    if (!sheet) {
      sheet = ss.insertSheet("Bazaar");
      sheet.appendRow(["id_tenda", "nama_brand", "pic", "kontak", "kategori", "status_bayar", "updated_at"]);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1 && data[0][0] === "") {
      sheet.clear();
      sheet.appendRow(["id_tenda", "nama_brand", "pic", "kontak", "kategori", "status_bayar", "updated_at"]);
      data = sheet.getDataRange().getValues();
    }
    var headers = data[0];
    
    if (payload.status_bayar === "Kosong") {
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == id_tenda) {
          sheet.deleteRow(i + 1);
          return Response.success("Tenda berhasil dikosongkan", payload);
        }
      }
      return Response.success("Tenda sudah kosong", payload);
    }
    
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id_tenda) {
        rowIndex = i;
        break;
      }
    }
    
    var newValues = [];
    var timestamp = new Date();
    
    if (rowIndex === -1) {
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j];
        if (h === "updated_at") newValues.push(timestamp);
        else newValues.push(payload[h] || "");
      }
      sheet.appendRow(newValues);
    } else {
      var currentRow = data[rowIndex];
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j];
        if (h === "updated_at") newValues.push(timestamp);
        else if (payload.hasOwnProperty(h)) newValues.push(payload[h]);
        else newValues.push(currentRow[j]);
      }
      sheet.getRange(rowIndex + 1, 1, 1, newValues.length).setValues([newValues]);
    }
    
    return Response.success('Berhasil disimpan', payload);
  }
};
