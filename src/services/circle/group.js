const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { decryptCircleMsisdn } = require('../../utils/cryptoHelpers');
const { getCircleStatus } = require('./status');

/**
 * Mengambil Detail Lengkap Group & Member
 */
const getCircleDetails = async (idToken) => {
  try {
    // 1. Ambil Group ID dari Status
    const status = await getCircleStatus(idToken);
    
    if (!status || !status.group_id) {
      throw new Error("User does not belong to any active circle");
    }

    const path = 'family-hub/api/v8/members/info';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      group_id: status.group_id
    };
    
    logger.info(`[CircleGroup] Fetching details for Group ID: ${status.group_id}`);
    
    const res = await sendRequestCommon(path, payload, idToken, 'POST');

    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Failed to fetch group details");
    }

    // 2. Mapping & Decrypt Member Data
    const members = (res.data.members || []).map((p) => {
      // Decrypt MSISDN anggota agar terbaca
      const decryptedMsisdn = decryptCircleMsisdn(p.msisdn);
      
      return {
        member_name: p.member_name,
        member_id: p.member_id,
        member_role: p.member_role, // PARENT / CHILD
        msisdn: decryptedMsisdn,
        join_date: p.join_date,
        allocation: p.allocation,
        consumption: p.consumption,
        remaining: p.remaining,
        slot_type: p.slot_type,
        status: p.status, // ACTIVE / INVITED
        subscriber_number: p.subscriber_number
      };
    });

    return {
      group_name: res.data.group_name,
      group_id: res.data.group_id,
      created_at: res.data.created_at,
      quota_total: res.data.package.benefit.allocation,
      quota_remaining: res.data.package.benefit.remaining,
      free_slot: res.data.total_free_slot,
      paid_slot: res.data.total_paid_slot,
      members: members
    };

  } catch (err) {
    logger.error(`[CircleGroup] Error: ${err.message}`);
    throw err;
  }
};

module.exports = { getCircleDetails };
