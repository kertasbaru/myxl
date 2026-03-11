const logger = require('../../utils/logger');
const { getFamDashboard } = require('./dashboard');
const { userPackageDetails } = require('../user/package');

const getMemberQuotaDetails = async (idToken, msisdn) => {
  try {
    // 1. Ambil Dashboard untuk cari ID Member
    const dashboard = await getFamDashboard(idToken);
    
    const member = dashboard.members.find((p) => p.msisdn === msisdn);
    
    if (!member) {
      throw new Error(`Member with MSISDN ${msisdn} not found in Family Plan`);
    }
    
    logger.info(`[FamQuotaMember] Fetching quota details for ${msisdn}...`);
    
    // 2. Panggil Service User Package dengan ID Member
    const res = await userPackageDetails(idToken, member.family_member_id);
    
    return res;

  } catch (err) {
    logger.error(`[FamQuotaMember] Error: ${err.message}`);
    throw err;
  }
}

module.exports = getMemberQuotaDetails;
