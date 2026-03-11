const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

/**
 * Eksekusi Transfer/Bagi Pulsa ke nomor tujuan
 * @param {string} idToken 
 * @param {string} accessToken 
 * @param {string} msisdn - Nomor tujuan transfer
 * @param {number} amount - Jumlah pulsa yang ditransfer
 * @param {string} authCode - Authorization Code dari getAuthCode
 * @returns {Promise<Object>}
 */
const transferBalance = async (idToken, accessToken, msisdn, amount, authCode) => {
  const path = 'sharings/api/v8/balance/share';
  const payload = {
    access_token: accessToken,
    amount: amount,
    authorization_code: authCode,
    is_enterprise: false,
    lang: 'id',
    receiver_msisdn: msisdn
  };
  
  try {
    logger.info(`[TransferBalance] Sharing balance to ${msisdn}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[TransferBalance] Error: ${error.message}`);
    throw error;
  }
};

module.exports = transferBalance;
