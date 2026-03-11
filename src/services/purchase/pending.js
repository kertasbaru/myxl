const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const pendingPayment = async (idToken, transactionId) => {
  try {
    const path = 'payments/api/v8/pending-detail';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      status: '',
      transaction_id: transactionId
    };
    
    logger.info(`[PendingPayment] Fetching pending payment: ${transactionId}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[PendingPayment] Error pendingPayment: ${error.message}`);
    throw error;
  }
};

module.exports = pendingPayment;