const { sendRequestCommon } = require('../requestClient')
const logger = require('../../utils/logger');

const userSegments = async (idToken, accessToken) => {
  const path = 'dashboard/api/v8/segments';
  
  const payload = {
    access_token: accessToken
  };
  
  try {
    logger.info(`[SegmentsService] Fetching Segments...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[SegmentsService] Error: ${error.message}`);
    throw error;
  }
}

module.exports = userSegments;
