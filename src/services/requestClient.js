const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const {
  encryptXData,
  decryptXData,
  getJavaLikeTimestamp,
  getAxDeviceId
} = require('../utils/cryptoHelpers');
const logger = require('../utils/logger');

// Destructuring Config
const BASE_API_URL = config.myxl.urls.baseApi;
const BASE_CIAM_URL = config.myxl.urls.baseCiam;
const UA = config.myxl.headers.userAgent;
const BASIC_AUTH = config.myxl.headers.basicAuth;
const API_KEY = config.myxl.security.apiKey;

/**
 * Request Handler untuk API Utama MyXL (Encrypted Body X-DATA)
 * Digunakan untuk: Cek Kuota, Beli Paket, Info Akun
 */
const sendRequestCommon = async (path, payload, idToken, method = 'POST') => {
  const reqId = uuidv4();
  try {
    // 1. Encrypt Payload
    const { x_signature, encrypted_body } = encryptXData(payload, method, path, idToken);
    const xtime = parseInt(encrypted_body.xtime, 10);
    const sigTimeSec = Math.floor(xtime / 1000);
    
    // 2. Parse Host
    const urlObj = new URL(BASE_API_URL);
    const host = urlObj.host;

    // 3. Construct Headers
    const headers = {
      'host': host,
      'content-type': 'application/json; charset=utf-8',
      'user-agent': UA,
      'x-api-key': API_KEY,
      'authorization': `Bearer ${idToken}`,
      'x-hv': 'v3',
      'x-signature-time': sigTimeSec.toString(),
      'x-signature': x_signature,
      'x-request-id': reqId,
      'x-request-at': getJavaLikeTimestamp(),
      'x-version-app': '8.9.0', // Sebaiknya simpan di config jika sering berubah
    };

    const url = `${BASE_API_URL}/${path}`;

    logger.debug(`[API] ${method} ${path} - ReqID: ${reqId}`);

    // 4. Send Request
    const response = await axios({
      method,
      url,
      headers,
      data: encrypted_body, 
      timeout: 45000, // Diperpanjang untuk koneksi lambat
    });

    // 5. Decrypt Response
    // Kadang sukses 200 tapi body string kosong atau HTML (jarang terjadi tapi mungkin)
    try {
      if (typeof response.data === 'string' && !response.data.includes('{')) {
        return response.data; // Raw string
      }
      return decryptXData(response.data);
    } catch (decryptError) {
      // Jika gagal decrypt, kembalikan apa adanya (mungkin tidak terenkripsi)
      logger.warn(`[API] Failed to decrypt success response: ${decryptError.message}`);
      return response.data;
    }

  } catch (error) {
    // Handling Error Response
    if (error.response) {
      const status = error.response.status;
      let errData = error.response.data;
      
      // Coba decrypt error payload (MyXL sering kirim error dalam bentuk terenkripsi juga)
      try {
        errData = decryptXData(errData);
      } catch (e) {
        // Jika gagal decrypt (misal error 502 Bad Gateway dari Nginx/LB), gunakan raw data
        logger.debug(`[API] Error response not encrypted: ${status}`);
      }

      logger.error(`[API] Error ${status} ${path}: ${JSON.stringify(errData)}`);

      // Throw error dengan struktur yang dikenali responseHelper
      const customError = new Error("Upstream API Error");
      customError.response = {
        status: status,
        data: errData // Data ini akan diparsing oleh responseHelper (code - message)
      };
      throw customError;

    } else if (error.request) {
      logger.error(`[API] No response from server for ${path}`);
      throw new Error('TIMEOUT - No response from MyXL Server');
    } else {
      logger.error(`[API] Request setup error: ${error.message}`);
      throw error;
    }
  }
};

/**
 * Request Handler untuk CIAM (Login/Auth)
 * Digunakan untuk: Login, OTP, Refresh Token
 */
const sendRequestCiam = async (path, method, data = null, params = {}, customHeaders = {}, axFp) => {
  if (!axFp) {
    throw new Error("axFp is required for CIAM requests");
  }

  const reqId = uuidv4();
  const deviceId = getAxDeviceId(axFp);

  const urlObj = new URL(BASE_CIAM_URL);
  const host = urlObj.host;
  const url = `${BASE_CIAM_URL}/${path}`;

  // Default Headers untuk CIAM
  const defaultHeaders = {
    'Host': host,
    'User-Agent': UA,
    'Authorization': `Basic ${BASIC_AUTH}`,
    'Accept-Encoding': 'gzip, deflate, br',
    'Ax-Device-Id': deviceId,
    'Ax-Fingerprint': axFp,
    'Ax-Request-Id': reqId,
    'Ax-Request-Device': 'Xiaomi',
    'Ax-Request-Device-Model': '22120RN86G',
    'Ax-Substype': 'PREPAID', // Default, bisa di-override via customHeaders
    'Ax-Request-At': getJavaLikeTimestamp(), 
    ...customHeaders // Merge custom headers
  };

  logger.debug(`[CIAM] ${method} ${path} - ReqID: ${reqId}`);

  try {
    const response = await axios({
      method,
      url,
      headers: defaultHeaders,
      params,
      data,
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      logger.error(`[CIAM] Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      // Re-throw dengan properti response agar ditangkap responseHelper
      throw error; 
    }
    logger.error(`[CIAM] Connection error: ${error.message}`);
    throw new Error('CONNECTION_ERROR - Failed to connect to CIAM Server');
  }
};

module.exports = {
  sendRequestCommon,
  sendRequestCiam
};
