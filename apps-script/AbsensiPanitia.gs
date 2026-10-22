const AbsensiPanitia = {
  sheetName: 'Absensi_Panitia',

  _ensureSheet: function() {
    const ss = Utils.getSpreadsheet();
    let sheet = ss.getSheetByName(this.sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(this.sheetName);
      sheet.appendRow([
        'id_absensi', 'user_id', 'nim', 'nama', 'divisi', 'jabatan',
        'tanggal', 'sesi', 'status', 'waktu_absen', 'keterangan', 'recorded_by', 'updated_at'
      ]);
      sheet.getRange("A1:M1").setFontWeight("bold").setBackground("#e6f4ea");
      sheet.setFrozenRows(1);
    }
    return sheet;
  },

  getAttendance: function(params) {
    const sheet = this._ensureSheet();
    const data = sheet.getDataRange().getValues();
    const results = [];

    // Headers: id_absensi(0), user_id(1), nim(2), nama(3), divisi(4), jabatan(5), 
    // tanggal(6), sesi(7), status(8), waktu_absen(9), keterangan(10), recorded_by(11), updated_at(12)

    const targetTanggal = params && params.tanggal ? String(params.tanggal).trim() : null;
    const targetSesi = params && params.sesi ? String(params.sesi).trim() : null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        const rowTanggal = data[i][6] ? Utilities.formatDate(new Date(data[i][6]), "Asia/Jakarta", "yyyy-MM-dd") : "";
        const rowSesi = String(data[i][7] || "").trim();

        if (targetTanggal && rowTanggal !== targetTanggal) continue;
        if (targetSesi && targetSesi !== "ALL" && rowSesi !== targetSesi) continue;

        results.push({
          id_absensi: data[i][0],
          user_id: data[i][1],
          nim: data[i][2],
          nama: data[i][3],
          divisi: data[i][4],
          jabatan: data[i][5],
          tanggal: rowTanggal,
          sesi: rowSesi,
          status: data[i][8] || "BELUM",
          waktu_absen: data[i][9] || "",
          keterangan: data[i][10] || "",
          recorded_by: data[i][11] || "",
          updated_at: data[i][12] || ""
        });
      }
    }

    return Response.success('Data absensi panitia berhasil diambil', results);
  },

  recordAttendance: function(body, authUser) {
    if (!body || !body.user_id || !body.tanggal || !body.sesi) {
      return Response.error('BAD_REQUEST', 'Parameter user_id, tanggal, dan sesi wajib diisi.');
    }

    const sheet = this._ensureSheet();
    const data = sheet.getDataRange().getValues();
    const targetUserId = String(body.user_id).trim();
    const targetTanggal = String(body.tanggal).trim();
    const targetSesi = String(body.sesi).trim();

    const now = new Date();
    const nowTimeStr = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");
    const waktuAbsen = body.waktu_absen || (body.status === 'HADIR' ? nowTimeStr : '');
    const recordedBy = authUser ? authUser.name : (body.recorded_by || 'Admin');

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const rowUserId = String(data[i][1]).trim();
      const rowTanggal = data[i][6] ? Utilities.formatDate(new Date(data[i][6]), "Asia/Jakarta", "yyyy-MM-dd") : "";
      const rowSesi = String(data[i][7] || "").trim();

      if (rowUserId === targetUserId && rowTanggal === targetTanggal && rowSesi === targetSesi) {
        rowIndex = i + 1; // 1-indexed row number
        break;
      }
    }

    if (rowIndex !== -1) {
      // Update existing row
      sheet.getRange(rowIndex, 9).setValue(body.status || "HADIR"); // status
      sheet.getRange(rowIndex, 10).setValue(waktuAbsen); // waktu_absen
      sheet.getRange(rowIndex, 11).setValue(body.keterangan || ""); // keterangan
      sheet.getRange(rowIndex, 12).setValue(recordedBy); // recorded_by
      sheet.getRange(rowIndex, 13).setValue(now); // updated_at
    } else {
      // Append new row
      const absId = Utils.generateId('ABS');
      sheet.appendRow([
        absId,
        body.user_id,
        body.nim || "",
        body.nama || "",
        body.divisi || "",
        body.jabatan || "",
        targetTanggal,
        targetSesi,
        body.status || "HADIR",
        waktuAbsen,
        body.keterangan || "",
        recordedBy,
        now
      ]);
    }

    return Response.success('Absensi panitia berhasil disimpan', {
      user_id: targetUserId,
      tanggal: targetTanggal,
      sesi: targetSesi,
      status: body.status || "HADIR",
      waktu_absen: waktuAbsen
    });
  },

  bulkRecordAttendance: function(body, authUser) {
    if (!body || !Array.isArray(body.records) || !body.tanggal || !body.sesi) {
      return Response.error('BAD_REQUEST', 'Data records array, tanggal, dan sesi wajib diisi.');
    }

    const sheet = this._ensureSheet();
    const data = sheet.getDataRange().getValues();
    const targetTanggal = String(body.tanggal).trim();
    const targetSesi = String(body.sesi).trim();
    const now = new Date();
    const nowTimeStr = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");
    const recordedBy = authUser ? authUser.name : (body.recorded_by || 'Admin');

    // Buat index mapping (userId -> row_index)
    const existingMap = {};
    for (let i = 1; i < data.length; i++) {
      const rId = String(data[i][1]).trim();
      const rTgl = data[i][6] ? Utilities.formatDate(new Date(data[i][6]), "Asia/Jakarta", "yyyy-MM-dd") : "";
      const rSesi = String(data[i][7] || "").trim();
      if (rTgl === targetTanggal && rSesi === targetSesi) {
        existingMap[rId] = i + 1;
      }
    }

    const newRows = [];
    body.records.forEach(item => {
      const uId = String(item.user_id).trim();
      const st = item.status || "HADIR";
      const wkt = item.waktu_absen || (st === 'HADIR' ? nowTimeStr : '');
      const ket = item.keterangan || "";

      if (existingMap[uId]) {
        const rowNum = existingMap[uId];
        sheet.getRange(rowNum, 9).setValue(st);
        sheet.getRange(rowNum, 10).setValue(wkt);
        sheet.getRange(rowNum, 11).setValue(ket);
        sheet.getRange(rowNum, 12).setValue(recordedBy);
        sheet.getRange(rowNum, 13).setValue(now);
      } else {
        const absId = Utils.generateId('ABS');
        newRows.push([
          absId,
          uId,
          item.nim || "",
          item.nama || "",
          item.divisi || "",
          item.jabatan || "",
          targetTanggal,
          targetSesi,
          st,
          wkt,
          ket,
          recordedBy,
          now
        ]);
      }
    });

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 13).setValues(newRows);
    }

    return Response.success(`Berhasil mencatat absensi untuk ${body.records.length} panitia`);
  }
};
