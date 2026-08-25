// Standard API Response Builder

const Response = {
  success: function(message, data = {}) {
    const res = {
      success: true,
      message: message,
      data: data
    };
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  },
  
  error: function(code, message) {
    const res = {
      success: false,
      code: code,
      message: message
    };
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }
};
