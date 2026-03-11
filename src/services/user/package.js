const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const userPackageDetails = async (idToken, familyMemberId = '') => {
  const path = 'api/v8/packages/quota-details';
  const payload = {
    family_member_id: familyMemberId,
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[PackageService] Fetching Package Details...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[PackageService] Error Details: ${error.message}`);
    throw error;
  }
};

const userPackageUnsub = async (idToken, quotaName) => {
  try {
    // 1. Ambil Detail Paket dulu untuk mendapatkan kode internal
    const data = await userPackageDetails(idToken);
    
    // Validasi struktur response
    if (!data || !data.data || !data.data.quotas) {
      throw new Error("Gagal mengambil daftar paket atau paket kosong");
    }

    // 2. Cari paket berdasarkan nama
    const quota = data.data.quotas.find((p) => 
      p.name && p.name.toLowerCase() === quotaName.toLowerCase()
    );
    
    if (!quota) {
      throw new Error(`Paket '${quotaName}' tidak ditemukan`);
    }
    
    // 3. Request Unsub
    const path = 'api/v8/packages/unsubscribe';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      quota_code: quota.quota_code,
      family_member_id: quota.family_member_id,
      product_domain: quota.product_domain,
      product_subscription_type: quota.product_subscription_type,
      unsubscribe_reason_code: ''
    };
    
    logger.info(`[PackageService] Unsubscribing ${quotaName}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;

  } catch (error) {
    logger.error(`[PackageService] Error Unsub: ${error.message}`);
    throw error;
  }
}

module.exports = {
  userPackageDetails,
  userPackageUnsub
};
