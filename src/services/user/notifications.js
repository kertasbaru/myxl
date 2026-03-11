const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const userNotifAll = async (idToken) => {
  const path = 'api/v8/notification-non-grouping';
  const payload = {
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[NotifService] Fetching All Notifications...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[NotifService] Error All: ${error.message}`);
    throw error;
  }
};

const userNotifDetail = async (idToken, notifId) => {
  const path = 'api/v8/notification/detail';
  const payload = {
    notification_id: notifId,
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[NotifService] Fetching Detail Notification ${notifId}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[NotifService] Error Detail: ${error.message}`);
    throw error;
  }
};

module.exports = {
  userNotifAll,
  userNotifDetail
};
