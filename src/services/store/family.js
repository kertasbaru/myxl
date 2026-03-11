const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

/**
 * Mengambil informasi Family Paket (Kategori Utama)
 * Fungsi ini melakukan "brute-force" cerdas untuk mencari kombinasi migrationType & Enterprise yang valid.
 */
const getFamily = async (idToken, familyCode, isEnterprise = null, migrationType = null) => {
  logger.info(`[StoreFamily] Fetching package family: ${familyCode}`);

  const isEnterpriseList = isEnterprise !== null ? [isEnterprise] : [false, true];
  
  const migrationTypeList = migrationType !== null 
    ? [migrationType] 
    : ["NONE", "PRE_TO_PRIOH", "PRIOH_TO_PRIO", "PRIO_TO_PRIOH"];

  const path = 'api/v8/xl-stores/options/list';

  // Loop Kombinasi Parameter sampai ketemu yang sukses
  for (const mt of migrationTypeList) {
    for (const ie of isEnterpriseList) {
      logger.debug(`[StoreFamily] Trying is_enterprise=${ie}, migration_type=${mt}`);

      const payload = {
        is_show_tagging_tab: true,
        is_dedicated_event: true,
        is_transaction_routine: false,
        migration_type: mt,
        package_family_code: familyCode,
        is_autobuy: false,
        is_enterprise: ie,
        is_pdlp: true,
        referral_code: "",
        is_migration: false,
        lang: "id"
      };

      try {
        const res = await sendRequestCommon(path, payload, idToken, 'POST');

        // Cek sukses spesifik MyXL
        if (res && res.status === "SUCCESS" && res.data?.package_variants.length >= 1) {
          logger.info(`[StoreFamily] Found valid config: ent=${ie}, mig=${mt}. Name: ${res.data.package_family.name}`);
          return res;
        }
      } catch (e) {
        // Abaikan error di loop ini, coba kombinasi berikutnya
        continue;
      }
    }
  }

  // Jika semua kombinasi gagal
  logger.error(`[StoreFamily] Failed to get valid family data for ${familyCode}`);
  throw new Error("Failed to retrieve package family. Invalid code or incompatible user type.");
};

module.exports = getFamily;
