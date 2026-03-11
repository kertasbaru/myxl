const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const helpers = require('../../utils/helpers');
const { getFamDashboard } = require('./dashboard');

const setMemberQuota = async (idToken, msisdn, newQuotaGB) => {
  try {
    const dashboard = await getFamDashboard(idToken);
    
    const member = dashboard.members.find((p) => p.msisdn === msisdn);
    
    if (!member) {
      throw new Error(`Member ${msisdn} not found`);
    }
    
    // Konversi GB ke Bytes
    const quotaBytes = helpers.gbToBytes(newQuotaGB);
    
    logger.info(`[FamSetQuota] Setting quota for ${msisdn} to ${newQuotaGB} GB...`);
    
    const path = 'sharings/api/v8/family-plan/allocate-quota';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      member_allocations: [{
        new_text_allocation: 0,
        new_voice_allocation: 0,
        new_allocation: quotaBytes,
        original_text_allocation: 0,
        original_voice_allocation: 0,
        original_allocation: member.quota_allocated, // Nilai lama
        family_member_id: member.family_member_id,
        message: '',
        status: ''
      }]
    };
    
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
        throw new Error(res.message || "Failed to set quota");
    }
    
    return res;

  } catch (err) {
    logger.error(`[FamSetQuota] Error: ${err.message}`);
    throw err;
  }
};

module.exports = setMemberQuota;
