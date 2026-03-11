const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { getCircleDetails } = require('./group'); // Perbaikan Path Import

const acceptInvitation = async (idToken, accessToken, msisdn) => {
  try {
    // 1. Ambil Info Group
    // User yang diundang biasanya sudah bisa melihat info group tapi statusnya 'INVITED'
    const group = await getCircleDetails(idToken);
    
    // 2. Cari Member ID diri sendiri berdasarkan MSISDN
    const member = group.members.find((p) => p.msisdn === msisdn);
    
    if (!member) {
      throw new Error("User not found in this circle");
    }
    
    if (member.status !== 'INVITED') {
      throw new Error(`User status is already ${member.status}`);
    }
    
    // 3. Eksekusi Accept
    const path = 'family-hub/api/v8/groups/accept-invitation';
    const payload = {
      access_token: accessToken,
      is_enterprise: false,
      lang: 'id',
      group_id: group.group_id,
      member_id: member.member_id
    };
    
    logger.info(`[CircleAccept] Accepting invitation for ${msisdn}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Failed to accept invitation");
    }
    
    return res;

  } catch (err) {
    logger.error(`[CircleAccept] Error: ${err.message}`);
    throw err;
  }
};

module.exports = acceptInvitation;
