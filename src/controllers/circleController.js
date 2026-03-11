const autoRefresh = require('./autoRefresh');
const helpers = require('../utils/helpers');
const responseHelper = require('../utils/responseHelper');
const circleSchema = require('../schemas/circleSchema');

// Import Service yang sudah diperbaiki
const { getCircleStatus } = require('../services/circle/status');
const { getCircleDetails } = require('../services/circle/group');
const { checkMemberEligibility } = require('../services/circle/validate');
const inviteMember = require('../services/circle/invite');
const acceptInvitation = require('../services/circle/accept');
const removeMember = require('../services/circle/remove');
const { getBonusList, claimBonus } = require('../services/circle/bonus');

/**
 * Helper internal untuk Auth
 */
const _handleAuth = async (msisdn) => {
  const formattedMsisdn = helpers.formatNomor(msisdn);
  const user = await autoRefresh(formattedMsisdn);
  
  if (!user) {
    throw new Error("401 - Login required");
  }
  return { user, formattedMsisdn };
};

const circleController = {
  // 1. Cek Status Circle (Punya group atau tidak)
  status: async (req, res) => {
    try {
      const { error, value } = circleSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);

      const { user } = await _handleAuth(value.msisdn);
      const data = await getCircleStatus(user.id_token);
      
      return responseHelper.success(res, data, 'Circle Status Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },

  // 2. Info Detail Group & Member
  groupInfo: async (req, res) => {
    try {
      const { error, value } = circleSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);

      const { user } = await _handleAuth(value.msisdn);
      const data = await getCircleDetails(user.id_token);

      return responseHelper.success(res, data, 'Circle Group Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  // 3. Validasi Nomor sebelum diinvite
  validate: async (req, res) => {
    try {
      const { error, value } = circleSchema.action.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const data = await checkMemberEligibility(user.id_token, formattedDestination);
      
      return responseHelper.success(res, {
        destination: formattedDestination,
        ...data
      }, 'Circle Validate Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  // 4. Invite Member Baru
  invite: async (req, res) => {
    try {
      const { error, value } = circleSchema.action.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      // Service inviteMember mengembalikan raw response atau throw error
      const respon = await inviteMember(user.id_token, user.access_token, formattedDestination);
      
      return responseHelper.success(res, respon.data, 'Circle Invite Sent Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  // 5. Accept Invitation
  accept: async (req, res) => {
    try {
      const { error, value } = circleSchema.action.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      
      // Note: value.destination di sini adalah nomor yang akan MENG-ACCEPT undangan.
      // Biasanya logicnya: user login (msisdn) menerima undangan untuk dirinya sendiri.
      // Tapi logic controller Anda mengharapkan 'destination' sebagai target accept.
      // Asumsi: msisdn = user login, destination = nomor yang diinvite (diri sendiri).
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const respon = await acceptInvitation(user.id_token, user.access_token, formattedDestination);
      
      return responseHelper.success(res, respon.data, 'Circle Invitation Accepted');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  // 6. Remove Member (Kick)
  remove: async (req, res) => {
    try {
      const { error, value } = circleSchema.action.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const data = await removeMember(user.id_token, formattedDestination);
      
      return responseHelper.success(res, data, 'Member Removed Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  // 7. Cek List Bonus
  bonus: async (req, res) => {
    try {
      const { error, value } = circleSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);

      const { user } = await _handleAuth(value.msisdn);
      const data = await getBonusList(user.id_token);
      
      return responseHelper.success(res, data, 'Circle Bonus List');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  // 8. Claim Bonus
  redeemBonus: async (req, res) => {
    try {
      const { error, value } = circleSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);

      const { user } = await _handleAuth(value.msisdn);
      
      // Mengklaim bonus pertama yang tersedia
      const data = await claimBonus(user.id_token, user.access_token);
      
      return responseHelper.success(res, data, 'Circle Bonus Claimed Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  }
};

module.exports = circleController;
