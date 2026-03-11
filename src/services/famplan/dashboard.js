const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

/**
 * Mengambil Dashboard Family Plan
 */
const getFamDashboard = async (idToken) => {
  const path = 'sharings/api/v8/family-plan/member-info';
  const payload = {
    group_id: 0,
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[FamDashboard] Fetching Family Dashboard...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (!res || res.status !== 'SUCCESS') {
      throw new Error(res.message || "Failed to fetch Family Dashboard");
    }
    
    const memberInfo = res.data.member_info;
    
    // Mapping Additional Members (Member Tambahan)
    const additionalMembers = (memberInfo.additional_members || []).map((p) => ({
      alias: p.alias,
      msisdn: p.msisdn,
      member_type: p.member_type,
      slot_id: p.slot_id,
      family_member_id: p.family_member_id,
      add_chances: p.add_chances,
      quota_allocated: p.usage.quota_allocated,
      quota_used: p.usage.quota_used
    }));
    
    // Mapping Members (Slot Utama)
    const mainMembers = (memberInfo.members || []).map((p) => ({
      alias: p.alias,
      msisdn: p.msisdn,
      member_type: p.member_type,
      slot_id: p.slot_id,
      family_member_id: p.family_member_id,
      add_chances: p.add_chances,
      quota_allocated: p.usage.quota_allocated,
      quota_used: p.usage.quota_used
    }));
    
    const parent = {
      msisdn: memberInfo.parent_msisdn,
      end_date: memberInfo.end_date,
      family_member_id: memberInfo.family_member_id,
      total_quota: memberInfo.total_quota,
      remaining_quota: memberInfo.remaining_quota
    };

    // Gabungkan semua member
    const allMembers = [...additionalMembers, ...mainMembers];
    
    return {
      parent,
      members: allMembers
    };

  } catch (err) {
    logger.error(`[FamDashboard] Error: ${err.message}`);
    throw err;
  }
};

module.exports = { getFamDashboard };
