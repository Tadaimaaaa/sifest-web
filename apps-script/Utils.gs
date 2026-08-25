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
    
    // Jika hanya ada header, kembalikan 001
    if (lastRow <= 1) return prefix + "-001";
    
    // Asumsi ID selalu berurutan sesuai baris terakhir, cth: USER-070
    // Kita kurangi 1 karena baris pertama adalah header
    const num = lastRow; 
    const numStr = num.toString().padStart(3, '0');
    return prefix + "-" + numStr;
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
