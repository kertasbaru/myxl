const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

/**
 * Mengambil Status Circle User saat ini
 * Return raw data yang sudah disederhanakan
 */
const getCircleStatus = async (idToken) => {
  const path = 'family-hub/api/v8/groups/status';
  const payload = {
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[CircleStatus] Fetching Circle Status...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      // Jika user tidak punya circle, biasanya API mengembalikan status tertentu
      // tapi kita lempar error agar controller tahu ini bukan sukses
      throw new Error(res.message || "Failed to fetch circle status");
    }
    
    const data = res.data;
    return {
      group_id: data.group_id,
      group_name: data.group_name,
      group_status: data.group_status, // CREATED, ACTIVE, etc
      is_owner: data.is_owner,
      member_id: data.member_id,
      owner_name: data.owner_name
    };
  } catch (err) {
    logger.error(`[CircleStatus] Error: ${err.message}`);
    throw err;
  }
};

module.exports = { getCircleStatus };
