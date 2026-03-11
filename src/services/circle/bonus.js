const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { getCircleDetails } = require('./group');
const { getPackage } = require('../store/package');
const { bonusLoyalty, bonusPersonalization } = require('../purchase/redeem');

/**
 * Mendapatkan Daftar Bonus yang tersedia
 */
const getBonusList = async (idToken) => {
  try {
    const group = await getCircleDetails(idToken);
    const parent = group.members.find((p) => p.member_role === 'PARENT');
    
    if (!parent) throw new Error("Parent info not found");

    const path = 'gamification/api/v8/family-hub/bonus/list';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      family_id: group.group_id,
      parent_subs_id: parent.subscriber_number
    };
    
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Failed to fetch bonus list");
    }
    
    return {
      has_spending_tracker_bonus: res.data.has_spending_tracker_bonus,
      bonuses: res.data.bonuses || []
    };
  } catch (err) {
    logger.error(`[CircleBonus] Error Get List: ${err.message}`);
    throw err;
  }
};

/**
 * Klaim Bonus Pertama yang ditemukan
 */
const claimBonus = async (idToken, accessToken) => {
  try {
    // 1. Ambil List Bonus
    const bonusData = await getBonusList(idToken);
    
    if (!bonusData.bonuses || bonusData.bonuses.length === 0) {
      throw new Error("Anda tidak memiliki bonus circle saat ini");
    }
    
    // Ambil bonus pertama (Logic Anda)
    const bonus = bonusData.bonuses[0];
    logger.info(`[CircleBonus] Attempting to claim bonus: ${bonus.name} (${bonus.code})`);
    
    // 2. Ambil Detail Paket Bonus di Store (untuk dapat token confirm & timestamp)
    const optionDetail = await getPackage(idToken, bonus.code);
    
    if (optionDetail.status !== 'SUCCESS') {
      throw new Error(`Failed to get bonus details: ${optionDetail.message}`);
    }
    
    const timestamp = optionDetail.data.timestamp;
    const tokenConfirm = optionDetail.data.token_confirmation;
    
    // 3. Eksekusi Redeem (Loyalty vs Personalization)
    if (bonus.bonus_type === 'LOYALTY') {
      const purchase = await bonusLoyalty(idToken, bonus.code, 0, timestamp, tokenConfirm);
      return {
        ...purchase,
        name: bonus.name
      };
    } else {
      // Bonus Personalization (Bounty)
      const purchase = await bonusPersonalization(
        idToken,
        accessToken,
        optionDetail.data.package_family.name,
        bonus.code,
        timestamp,
        tokenConfirm,
        0 // Harga 0
      );
      return purchase;
    }

  } catch (err) {
    logger.error(`[CircleBonus] Claim Error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  getBonusList,
  claimBonus
};
