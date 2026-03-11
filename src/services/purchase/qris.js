const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');
const logger = require('../../utils/logger');
const {
  encryptXData,
  decryptXData,
  makeXSignaturePayment,
  getJavaLikeTimestamp,
  buildEncryptedField
} = require('../../utils/cryptoHelpers');

const BASE_API_URL = config.myxl.urls.baseApi;
const UA = config.myxl.headers.userAgent;
const API_KEY = config.myxl.security.apiKey;

const purchaseQris = async (
  idToken,
  accessToken,
  items,
  tokenPayment,
  paymentFor,
  timestamp,
  overwriteAmount = -1
) => {
  // Logic 1: Tentukan Amount (QRIS always uses items[0] for original_price)
  const amountInt = overwriteAmount === -1 ? items[items.length - 1].item_price : overwriteAmount;
  
  // Logic 2: Payment Targets String (Shortened)
  const paymentTargets = items.map(i => i.item_code).join(';');
  
  const path = 'payments/api/v8/settlement-multipayment/qris';
  const payload = {
    access_token: accessToken,
    additional_data: {
      benefit_type: "",
      cashtag: "",
      combo_details: [],
      discount_promo: 0,
      discount_recurring: 0,
      has_bonus: true,
      is_family_plan: false,
      is_spend_limit: false,
      is_spend_limit_temporary: false,
      is_switch_plan: false,
      migration_type: "",
      original_price: items[0].item_price,
      quota_bonus: 0,
      spend_limit_amount: 0,
      tax: 0
    },
    akrab: {
      akrab_members: [],
      akrab_parent_alias: "",
      members: []
    },
    autobuy: {
      activated_autobuy_code: "",
      autobuy_threshold_setting: {
        label: "",
        type: "",
        value: 0
      },
      is_using_autobuy: false
    },
    can_trigger_rating: false,
    coupon: "",
    is_enterprise: false,
    is_myxl_wallet: false,
    is_use_point: false,
    items: items,
    lang: "id",
    payment_for: paymentFor,
    payment_method: "QRIS",
    timestamp: Math.floor(Date.now() / 1000),
    topup_number: "",
    total_amount: amountInt,
    total_discount: 0,
    total_fee: 0,
    verification_token: tokenPayment
  };
  
  const { encrypted_body } = encryptXData(
    payload,
    'POST',
    path,
    idToken
  );
  const xtime = parseInt(encrypted_body.xtime, 10);
  
  const xSig = makeXSignaturePayment(
    accessToken,
    timestamp,
    paymentTargets,
    tokenPayment,
    "QRIS",
    paymentFor,
    path
  );
  
  logger.info('[QrisService] Sending settlement request...');
  
  const response = await axios({
    method: 'POST',
    url: `${BASE_API_URL}/${path}`,
    headers: {
      'host': BASE_API_URL.replace(/^https?:\/\//, ''),
      'content-type': 'application/json; charset=utf-8',
      'user-agent': UA,
      'x-api-key': API_KEY,
      'authorization': `Bearer ${idToken}`,
      'x-hv': 'v3',
      'x-signature-time': Math.floor(xtime / 1000).toString(),
      'x-signature': xSig,
      'x-request-id': uuidv4(),
      'x-request-at': getJavaLikeTimestamp(xtime),
      'x-version-app': '8.9.0',
    },
    data: encrypted_body,
    timeout: 30000
  });
  
  const decryptedData = decryptXData(response.data);
  
  if (decryptedData.status !== "SUCCESS") {
    logger.warn(`[QrisService] Failed to initiate settlement. Error: ${JSON.stringify(decryptedData)}`);
  } else {
    logger.info(`[QrisService] Purchase result:\n${JSON.stringify(decryptedData, null, 2)}`);
  }
  
  return decryptedData;
};

module.exports = purchaseQris;