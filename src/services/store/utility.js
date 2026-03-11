const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

/**
 * Cek halaman intercept (Biasanya halaman "Apakah Anda Yakin?")
 */
const interceptPage = async (idToken, optionCode, isEnterprise = false) => {
  const path = 'misc/api/v8/utility/intercept-page';
  
  const payload = {
    is_enterprise: isEnterprise,
    lang: "id",
    package_option_code: optionCode
  };

  try {
    logger.info(`[StoreUtility] Checking intercept page for ${optionCode}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[StoreUtility] Intercept Error: ${error.message}`);
    // Intercept error biasanya tidak fatal (bisa diabaikan flow-nya), jadi return null
    return null;
  }
};

/**
 * Cek Status Login Auth di Store (Kadang dibutuhkan sebelum transaksi)
 */
const loginInfo = async (idToken, accessToken, isEnterprise = false) => {
  const path = 'api/v8/auth/login';
  
  const payload = {
    access_token: accessToken,
    is_enterprise: isEnterprise,
    lang: "id"
  };

  try {
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[StoreUtility] Login Info Error: ${error.message}`);
    // Return null agar caller tahu cek login gagal
    return null; 
  }
};

module.exports = {
  interceptPage,
  loginInfo
};
