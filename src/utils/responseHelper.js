const logger = require('./logger');

const responseHelper = {
  /**
   * Format Sukses:
   * { success: true, message: "...", data: ... }
   */
  success: (res, data, message = 'Requested Successfully') => {
    return res.status(200).json({
      success: true,
      message: message,
      data: data
    });
  },

  /**
   * Format Gagal:
   * { success: false, message: "CODE - MESSAGE" }
   * * Fungsi ini otomatis mencoba mengekstrak Error Code & Message 
   * dari object Error Axios atau Error standar.
   */
  error: (res, error) => {
    let statusCode = 500;
    let finalMessage = 'INTERNAL_ERROR - Internal Server Error';

    // 1. Cek jika error berasal dari Axios (Response Upstream API MyXL)
    if (error.response && error.response.data) {
      statusCode = error.response.status || 400;
      const upstream = error.response.data;

      // Coba ambil code dan message dari upstream
      const code = upstream.code || upstream.errorCode || 'API_ERROR';
      const msg = upstream.message || upstream.errorMessage || 'Unknown Error';
      
      finalMessage = `${code} - ${msg}`;
    } 
    // 2. Cek jika error manual yang kita throw (misal: throw new Error("404 - Not Found"))
    else if (error.message) {
      // Jika format pesan error sudah "CODE - MESSAGE", pakai itu
      if (error.message.includes(' - ')) {
        statusCode = 400; // Asumsikan Bad Request jika formatnya valid
        finalMessage = error.message;
      } else {
        finalMessage = `APP_ERROR - ${error.message}`;
      }
    }

    logger.error(`[Response Error] ${finalMessage}`);

    return res.status(statusCode).json({
      success: false,
      message: finalMessage
    });
  }
};

module.exports = responseHelper;
