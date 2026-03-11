const { sendRequestCommon } = require('../requestClient')
const logger = require('../../utils/logger');

const userProfile = async (idToken, accessToken) => {
  const path = 'api/v8/profile';
  
  const payload = {
    access_token: accessToken,
    app_version: '8.9.0',
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[ProfileService] Fetching Profile...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[ProfileService] Error: ${error.message}`);
    throw error;
  }
}

module.exports = userProfile;
