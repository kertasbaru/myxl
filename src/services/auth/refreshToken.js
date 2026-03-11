const { sendRequestCiam } = require('../requestClient');
const { getTsGmt7 } = require('../../utils/cryptoHelpers');
const { submitOtp } = require('./submitOtp');
const logger = require('../../utils/logger');

/**
 * Meminta Exchange Code untuk memperpanjang sesi (Fallback jika refresh token gagal)
 * @param {string} subscriberId 
 * @param {string} axFp 
 * @returns {Promise<string>} Exchange Code
 */
const extendSession = async (subscriberId, axFp) => {
  if (!axFp) throw new Error("axFp is required for extend session");

  // Subscriber ID harus di-encode Base64
  const b64SubscriberId = Buffer.from(subscriberId).toString('base64');
  
  try {
    logger.info(`[AuthService] Extending Session for ${subscriberId}...`);
    
    const response = await sendRequestCiam(
      'realms/xl-ciam/auth/extend-session',
      'GET',
      null,
      {
        contact: b64SubscriberId,
        contactType: 'DEVICEID'
      },
      { 'Content-Type': 'application/json' },
      axFp
    );

    // response dari sendRequestCiam sudah berupa body JSON
    if (response && response.data && response.data.exchange_code) {
      return response.data.exchange_code;
    }

    throw new Error("No exchange_code received from extend-session endpoint");

  } catch (error) {
    logger.error(`[AuthService] Error extending session: ${error.message}`);
    throw error;
  }
};

/**
 * Melakukan Refresh Token
 * Jika gagal karena "Session not active", otomatis mencoba mekanisme Extend Session
 * * @param {string} oldRefreshToken 
 * @param {string} subscriberId 
 * @param {string} axFp 
 * @returns {Promise<Object>} Token Baru
 */
const refreshToken = async (oldRefreshToken, subscriberId, axFp) => {
  if (!axFp) throw new Error("axFp parameter is required");

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', oldRefreshToken);

  const axRequestAt = getTsGmt7();

  try {
    logger.info(`[AuthService] Refreshing Token for ${subscriberId}...`);
    
    const response = await sendRequestCiam(
      'realms/xl-ciam/protocol/openid-connect/token',
      'POST',
      params.toString(),
      {},
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Ax-Request-At': axRequestAt
      },
      axFp
    );
    
    return response;

  } catch (error) {
    // Handling error dari requestClient (Axios error with .response property)
    const status = error.response?.status || 500;
    const errData = error.response?.data || {};
    const errDesc = errData.error_description || "";

    // Skenario Khusus: Session Mati (400 Bad Request - Session not active)
    if (status === 400 && errDesc === "Session not active") {
      if (!subscriberId) {
        throw new Error("Subscriber ID is missing, cannot extend session");
      }

      logger.warn("[AuthService] Session inactive. Attempting fallback to Extend Session...");
      
      try {
        // 1. Dapatkan Exchange Code baru
        const exchangeCode = await extendSession(subscriberId, axFp);
        
        // 2. Login ulang menggunakan Exchange Code (Login via DEVICEID)
        const loginResult = await submitOtp('DEVICEID', subscriberId, exchangeCode, axFp);
        
        logger.info("[AuthService] Session successfully recovered via Extend Session.");
        return loginResult;
        
      } catch (fallbackError) {
        logger.error(`[AuthService] Fallback failed: ${fallbackError.message}`);
        throw new Error("Session expired and auto-recovery failed. Please login again.");
      }
    }

    // Jika error lain (misal: Invalid refresh token), lempar ke controller
    if (errDesc.includes("Invalid refresh token")) {
      throw new Error("Refresh token invalid. Please login again.");
    }
    
    // Re-throw error original
    throw error;
  }
};

module.exports = { extendSession, refreshToken };
