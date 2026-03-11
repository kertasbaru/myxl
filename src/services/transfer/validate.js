const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const transferValidate = async (idToken, msisdn) => {
  const path = 'api/v8/auth/validate-msisdn';
  const payload = {
    is_enterprise: false,
    lang: 'id',
    msisdn: msisdn,
    with_bizon: false,
    with_enterprise: false,
    with_family_plan: false,
    with_optimus: false,
    with_regist_status: false
  };
  
  try {
    logger.info(`[TransferValidate] Fetching Validate...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[TransferValidate] Error: ${error.message}`);
    throw error;
  }
}

module.exports = transferValidate;