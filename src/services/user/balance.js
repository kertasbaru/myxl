const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const userBalance = async (idToken) => {
  const path = 'api/v8/packages/balance-and-credit';
  const payload = {
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[BalanceService] Fetching Balance...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[BalanceService] Error: ${error.message}`);
    throw error;
  }
}

module.exports = userBalance;
