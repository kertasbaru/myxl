const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const getFamily = require('./family');

/**
 * Mengambil Detail Teknis Paket (Option Detail) langsung by Code
 */
const getPackage = async (idToken, packageOptionCode, packageFamilyCode = "", packageVariantCode = "") => {
  const path = 'api/v8/xl-stores/options/detail';
  
  const payload = {
    is_transaction_routine: false,
    migration_type: "NONE",
    package_family_code: packageFamilyCode,
    family_role_hub: "",
    is_autobuy: false,
    is_enterprise: false,
    is_shareable: false,
    is_migration: false,
    lang: "id",
    package_option_code: packageOptionCode,
    is_upsell_pdp: false,
    package_variant_code: packageVariantCode
  };

  try {
    logger.info(`[StorePackage] Fetching package detail: ${packageOptionCode}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[StorePackage] Error getPackage: ${error.message}`);
    throw error;
  }
};

/**
 * Mengambil Addons (Bonus) Paket
 */
const getAddons = async (idToken, packageOptionCode) => {
  const path = 'api/v8/xl-stores/options/addons-pinky-box';
  
  const payload = {
    is_enterprise: false,
    lang: "id",
    package_option_code: packageOptionCode
  };

  try {
    logger.info(`[StorePackage] Fetching addons for ${packageOptionCode}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[StorePackage] Error getAddons: ${error.message}`);
    throw error;
  }
};

/**
 * [CORE FUNCTION] 
 * Mengambil Detail Lengkap Paket dimulai dari Family Code -> Variant -> Option Order
 * Mengembalikan objek yang sudah disederhanakan untuk ditampilkan ke User/Frontend.
 */
const packageDetails = async (idToken, familyCode, variantCode, optionOrder, isEnterprise = null, migrationType = null) => {
  try {
    // 1. Ambil data Family (Otomatis handle retry enterprise/migration)
    const familyData = await getFamily(idToken, familyCode, isEnterprise, migrationType);
    
    if (!familyData || !familyData.data) {
      throw new Error("Invalid family data received");
    }

    let optionCode = null;
    const packageVariants = familyData.data.package_variants || [];

    // 2. Cari Variant yang sesuai
    const selectedVariant = packageVariants.find(v => v.package_variant_code === variantCode);

    if (selectedVariant && selectedVariant.package_options) {
      // 3. Cari Option berdasarkan Order ID (urutan paket di UI)
      const selectedOption = selectedVariant.package_options.find(o => o.order === optionOrder);
      
      if (selectedOption) {
        optionCode = selectedOption.package_option_code;
      }
    }

    if (!optionCode) {
      throw new Error('Package option not found (Variant/Order mismatch).');
    }

    // 4. Panggil getPackage dengan optionCode yang ditemukan
    const detailData = await getPackage(idToken, optionCode, familyCode, variantCode);
    
    if (detailData.status !== 'SUCCESS') {
      throw new Error(detailData.message || "Failed to retrieve final package details");
    }

    const family = detailData.data.package_family;
    const variant = detailData.data.package_detail_variant;
    const option = detailData.data.package_option;
    
    // 5. Format Return Data (Simplified)
    return {
      family_name: family.name,
      family_code: family.package_family_code,
      family_type: family.package_family_type,
      variant_name: variant.name,
      variant_code: variant.package_variant_code,
      option_name: option.name,
      option_code: option.package_option_code,
      information: option.information,
      price: option.price,
      validity: option.validity,
      payment_for: family.payment_for,
      timestamp: detailData.data.timestamp,
      token_confirmation: detailData.data.token_confirmation, // PENTING untuk Purchase
      raw_data: detailData.data // Opsional: sertakan data mentah jika butuh debug
    };

  } catch (error) {
    logger.error(`[StorePackage] Error packageDetails: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getPackage,
  getAddons,
  packageDetails
};
