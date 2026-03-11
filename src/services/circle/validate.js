const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { encryptCircleMsisdn } = require('../../utils/cryptoHelpers');

/**
 * Validasi apakah nomor bisa diundang
 */
const checkMemberEligibility = async (idToken, msisdn) => {
  const path = 'family-hub/api/v8/members/validate';
  
  // Encrypt MSISDN khusus untuk endpoint Circle
  const encryptedMsisdn = encryptCircleMsisdn(msisdn);
  
  const payload = {
    is_enterprise: false,
    lang: 'id',
    msisdn: encryptedMsisdn
  };
  
  try {
    logger.info(`[CircleValidate] Validating ${msisdn}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Validation request failed");
    }
    
    // MyXL mengembalikan response_code spesifik untuk valid/invalid
    // 200-2001 biasanya artinya Valid
    const isValid = res.data.response_code === '200-2001';
    
    return {
      is_valid: isValid,
      code: res.data.response_code,
      message: res.data.message
    };

  } catch (err) {
    logger.error(`[CircleValidate] Error: ${err.message}`);
    throw err;
  }
};

module.exports = { checkMemberEligibility };
