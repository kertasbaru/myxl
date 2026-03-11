const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const transferFee = async (idToken) => {
  const path = 'sharings/api/v8/balance/share/fee-include-axis';
  const payload = {
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[TransferFee] Fetching Fee...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[TransferFee] Error: ${error.message}`);
    throw error;
  }
}

module.exports = transferFee;
