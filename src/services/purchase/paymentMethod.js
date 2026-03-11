const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { interceptPage } = require('../store/utility');
const { packageDetails } = require('../store/package');

/**
 * Mengambil Daftar Metode Pembayaran (API Call)
 */
const getPaymentMethods = async (idToken, paymentTarget, tokenConfirmation) => {
  // 1. Cek Intercept Page (Syarat dari MyXL sebelum masuk payment)
  await interceptPage(idToken, paymentTarget, false);
  
  const path = 'payments/api/v8/payment-methods-option';
  
  const payload = {
    payment_type: "PURCHASE",
    is_enterprise: false,
    payment_target: paymentTarget, // Option Code
    lang: "id",
    is_referral: false,
    token_confirmation: tokenConfirmation
  };
  
  try {
    logger.info('[PaymentMethod] Fetching payment methods...');
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[PaymentMethod] Error: ${error.message}`);
    throw error;
  }
};

/**
 * Helper Komposit: Ambil Detail Paket -> Lalu Ambil Payment Method
 * Digunakan untuk menyiapkan data sebelum eksekusi pembelian.
 */
const preparePaymentInfo = async (idToken, familyCode, variantCode, order, isEnterprise = null, migrationType = null) => {
  try {
    // 1. Ambil Detail Paket untuk dapat Option Code & Token Confirmation
    const packages = await packageDetails(idToken, familyCode, variantCode, order, isEnterprise, migrationType);
    
    if (!packages) {
      throw new Error("Package details not found");
    }
    
    // 2. Ambil Metode Pembayaran
    const res = await getPaymentMethods(idToken, packages.option_code, packages.token_confirmation);

    if (res.status !== "SUCCESS") {
      throw new Error(res.message || "Failed to fetch payment methods");
    }
    
    // 3. Return Data Gabungan
    return {
      name: `${packages.family_name} ${packages.option_name}`,
      price: packages.price,
      option_code: packages.option_code,
      // Data Payment penting untuk step settlement:
      payment_for: res.data.payment_for, 
      timestamp: res.data.timestamp,
      token_payment: res.data.token_payment,
      token_confirmation: packages.token_confirmation
    };
  } catch (error) {
    logger.error(`[PaymentMethod] Prepare Info Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getPaymentMethods,
  preparePaymentInfo
};
