const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { getFamDashboard } = require('./dashboard');

const removeMember = async (idToken, msisdn) => {
  try {
    const dashboard = await getFamDashboard(idToken);
    
    const member = dashboard.members.find((p) => p.msisdn === msisdn);
    
    if (!member) {
      throw new Error(`Member ${msisdn} not found to remove`);
    }
    
    logger.info(`[FamRemove] Removing member ${msisdn}...`);
    
    const path = 'sharings/api/v8/family-plan/remove-member';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      family_member_id: member.family_member_id
    };
    
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Failed to remove member");
    }
    
    return res;

  } catch (err) {
    logger.error(`[FamRemove] Error: ${err.message}`);
    throw err;
  }
}

module.exports = removeMember;
