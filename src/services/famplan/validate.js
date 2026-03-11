const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const checkMemberEligibility = async (idToken, msisdn) => {
  const path = 'api/v8/auth/check-dukcapil';
  const payload = {
    with_bizon: true,
    with_family_plan: true,
    with_enterprise: true,
    with_optimus: true,
    with_regist_status: true,
    msisdn: msisdn,
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[FamValidate] Validating ${msisdn}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    return res;

  } catch (err) {
    logger.error(`[FamValidate] Error: ${err.message}`);
    throw err;
  }
}

module.exports = checkMemberEligibility;
