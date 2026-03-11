const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { encryptCircleMsisdn } = require('../../utils/cryptoHelpers');
const helpers = require('../../utils/helpers');

const { getCircleStatus } = require('./status');
const { checkMemberEligibility } = require('./validate');

const inviteMember = async (idToken, accessToken, msisdn) => {
  try {
    // 1. Cek Status Circle (Harus Owner/Parent)
    const status = await getCircleStatus(idToken);
    
    if (!['ACTIVE', 'CREATED'].includes(status.group_status)) {
      throw new Error("Circle is not active");
    }
    
    if (!status.is_owner) {
      throw new Error("Only Parent/Owner can invite members");
    }
    
    // 2. Validasi Nomor Tujuan
    const validation = await checkMemberEligibility(idToken, msisdn);
    if (!validation.is_valid) {
      throw new Error(`Cannot invite number: ${validation.message} (${validation.code})`);
    }
    
    // 3. Eksekusi Invite
    const path = 'family-hub/api/v8/members/invite';
    const payload = {
      access_token: accessToken,
      is_enterprise: false,
      lang: 'id',
      group_id: status.group_id,
      member_id_parent: status.member_id,
      members: [{
        name: helpers.randomName(), // Generate nama random jika tidak ada di kontak
        msisdn: encryptCircleMsisdn(msisdn)
      }]
    };
    
    logger.info(`[CircleInvite] Inviting ${msisdn}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Invitation failed");
    }
    
    return res;

  } catch (err) {
    logger.error(`[CircleInvite] Error: ${err.message}`);
    throw err;
  }
};

module.exports = inviteMember;
