// Utils & Helpers (Hashing, Spreadsheet Access)

const Utils = {
  getSpreadsheet: function () {
    // Membuka Spreadsheet database SI FEST Management
    return SpreadsheetApp.openById("1nUgfsGpdVaAn7WVofVcUBtt6HV0TYCFRIlMk89Q2sMY");
  },

  getSheet: function (sheetName) {
    return this.getSpreadsheet().getSheetByName(sheetName);
  },

  hashPassword: function (password, salt) {
    const raw = password + salt;
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw,
    );
    return this.bytesToHex(digest);
  },

  generateId: function (prefix) {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return (
      prefix + "-" + new Date().getTime() + "-" + randomStr
    );
  },

  generateSequentialId: function(sheetName, prefix, colIndex) {
    const sheet = this.getSheet(sheetName);
    if (!sheet) return prefix + "-001";
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return prefix + "-001";
    
    // Tentukan kolom ID: jika diberikan colIndex (1-based), gunakan itu.
    // Jika tidak, deteksi otomatis dari baris header.
    let col = colIndex;
    if (!col) {
      try {
        const lastCol = sheet.getLastColumn();
        if (lastCol >= 1) {
          const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          for (let c = 0; c < headers.length; c++) {
            const h = String(headers[c] || '').toLowerCase().trim();
            if (h === 'id' || h === 'trx_id' || h === 'trx id' || h.indexOf('id ') === 0 || h.indexOf('id_') === 0 || h.includes('id transaksi')) {
              col = c + 1;
              break;
            }
          }
        }
      } catch (err) {}
      if (!col) col = 1;
    }
    
    // Cari angka terbesar dari seluruh baris pada kolom tersebut untuk mencegah ID duplikat
    let maxNum = 0;
    try {
      const colValues = sheet.getRange(2, col, lastRow - 1, 1).getValues();
      for (let r = 0; r < colValues.length; r++) {
        const val = String(colValues[r][0] || '').trim();
        if (val.indexOf(prefix + '-') === 0) {
          const numPart = parseInt(val.replace(prefix + '-', ''), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    } catch (e) {}
    
    // Fallback jika tidak ada pola prefix-
    if (maxNum === 0) {
      maxNum = lastRow - 1;
    }
    
    return prefix + "-" + (maxNum + 1).toString().padStart(3, '0');
  },

  bytesToHex: function (bytes) {
    return bytes
      .map(function (byte) {
        const v = byte < 0 ? 256 + byte : byte;
        return ("0" + v.toString(16)).slice(-2);
      })
      .join("");
  },
};
