const Esport = {
  getEsportTeams: function() {
    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("Esport");
    
    if (!sheet) {
      sheet = ss.insertSheet("Esport");
      sheet.appendRow(["id_tim", "nama_tim", "kapten", "kontak", "status_bayar", "updated_at"]);
      return Response.success("Berhasil", []);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1 && data[0][0] === "") return Response.success("Berhasil", []);
    
    var headers = data[0];
    var teams = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var team = {};
      for (var j = 0; j < headers.length; j++) {
        team[headers[j]] = row[j] || "";
      }
      teams.push(team);
    }
    
    return Response.success("Berhasil", teams);
  },

  saveEsportTeam: function(payload) {
    var id_tim = payload.id_tim;
    if (!id_tim) return Response.error('BAD_REQUEST', 'ID Tim wajib diisi');
    
    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("Esport");
    
    if (!sheet) {
      sheet = ss.insertSheet("Esport");
      sheet.appendRow(["id_tim", "nama_tim", "kapten", "kontak", "status_bayar", "updated_at"]);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1 && data[0][0] === "") {
      sheet.clear();
      sheet.appendRow(["id_tim", "nama_tim", "kapten", "kontak", "status_bayar", "updated_at"]);
      data = sheet.getDataRange().getValues();
    }
    var headers = data[0];
    
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id_tim) {
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

  deleteEsportTeam: function(payload) {
    var id_tim = payload.id_tim;
    if (!id_tim) return Response.error('BAD_REQUEST', 'ID Tim wajib diisi');

    var ss = Utils.getSpreadsheet();
    var sheet = ss.getSheetByName("Esport");

    if (!sheet) return Response.error('NOT_FOUND', 'Sheet tidak ditemukan');

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id_tim) {
        sheet.deleteRow(i + 1);
        return Response.success("Tim berhasil dihapus");
      }
    }

    return Response.error('NOT_FOUND', 'Tim tidak ditemukan');
  }
};
