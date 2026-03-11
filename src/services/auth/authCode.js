const { sendRequestCiam } = require('../requestClient');
const { getTsGmt7 } = require('../../utils/cryptoHelpers');
const logger = require('../../utils/logger');
const helpers = require('../../utils/helpers');

/**
 * Mendapatkan Authorization Code (Auth Code)
 * Diperlukan untuk validasi transaksi sensitif (misal: Bagi Pulsa)
 * @param {string} accessToken Token sesi user (Bearer)
 * @param {string} pin PIN MyXL user
 * @param {string} msisdn Nomor tujuan transfer (receiver)
 * @param {string} axFp Device Fingerprint
 * @returns {Promise<string>} Authorization Code
 */
const getAuthCode = async (accessToken, pin, msisdn, axFp) => {
  // 1. Validasi Input
  if (!axFp) throw new Error("axFp parameter is required");
  if (!accessToken) throw new Error("Access Token is required");
  if (!pin) throw new Error("PIN is required");

  const receiver = helpers.formatNomor(msisdn);
  if (!receiver) {
    throw new Error("Invalid receiver MSISDN format");
  }

  // 2. Persiapan Payload
  // PIN wajib di-encode Base64 sebelum dikirim
  const pinB64 = Buffer.from(String(pin), 'utf-8').toString('base64');
  const axRequestAt = getTsGmt7();

  const payload = {
    pin: pinB64,
    transaction_type: "SHARE_BALANCE", // Tipe transaksi default
    receiver_msisdn: receiver
  };

  try {
    logger.info(`[AuthService] Fetching Auth Code for sharing to ${receiver}...`);
    
    // 3. Request ke CIAM
    const response = await sendRequestCiam(
      'ciam/auth/authorization-token/generate',
      'POST',
      payload,
      {},
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ax-Request-At': axRequestAt
      },
      axFp
    );

    // 4. Cek Status Bisnis Logic
    if (response.status !== 'Success') {
      const msg = response.message || 'Failed to generate Auth Code';
      logger.error(`[AuthService] Auth Code Failed: ${msg}`);
      throw new Error(msg); // Throw agar ditangkap sebagai 400 Bad Request
    }

    if (response.data && response.data.authorization_code) {
      return response.data.authorization_code;
    }

    throw new Error("Authorization code missing in upstream response");

  } catch (error) {
    logger.error(`[AuthService] Error getting auth code: ${error.message}`);
    // Re-throw error agar Controller bisa memberikan respon yang tepat
    throw error;
  }
};

module.exports = { getAuthCode };
