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

  generateSequentialId: function(sheetName, prefix) {
    const sheet = this.getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return prefix + "-001";
    
    // Ambil ID dari baris terakhir untuk menghindari duplikasi saat baris dihapus
    const lastId = sheet.getRange(lastRow, 1).getValue();
    let nextNum = lastRow; // Fallback ke row count
    
    if (lastId && typeof lastId === 'string' && lastId.includes('-')) {
      const parts = lastId.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    return prefix + "-" + nextNum.toString().padStart(3, '0');
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
