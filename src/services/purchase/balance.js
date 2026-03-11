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

const purchaseBalance = async (
  idToken,
  accessToken,
  items,
  tokenPayment,
  paymentFor,
  timestamp,
  overwriteAmount = -1
) => {
  // Logic 1: Tentukan Target & Amount (Shortened)
  const target = items.length > 1 ? items[1] : items[0];
  const amountInt = overwriteAmount === -1 ? target.item_price : overwriteAmount;
  
  // Logic 2: Payment Targets String (Shortened)
  const paymentTargets = items.map(i => i.item_code).join(';');
  
  const path = 'payments/api/v8/settlement-multipayment';
  const settlementPayload = {
    total_discount: 0,
    is_enterprise: false,
    payment_token: "",
    token_payment: tokenPayment,
    activated_autobuy_code: "",
    cc_payment_type: "",
    is_myxl_wallet: false,
    pin: "",
    ewallet_promo_id: "",
    members: [],
    total_fee: 0,
    fingerprint: "",
    autobuy_threshold_setting: {
      label: "",
      type: "",
      value: 0
    },
    is_use_point: false,
    lang: "id",
    payment_method: "BALANCE",
    timestamp: Math.floor(Date.now() / 1000),
    points_gained: 0,
    can_trigger_rating: false,
    akrab_members: [],
    akrab_parent_alias: "",
    referral_unique_code: "",
    coupon: "",
    payment_for: paymentFor,
    with_upsell: false, topup_number: "",
    stage_token: "",
    authentication_id: "",
    token: "",
    token_confirmation: "",
    access_token: accessToken,
    wallet_number: "",
    encrypted_payment_token: buildEncryptedField(null, true),
    encrypted_authentication_id: buildEncryptedField(null, true),
    additional_data: {
      original_price: target.item_price,
      is_spend_limit_temporary: false,
      migration_type: "",
      akrab_m2m_group_id: "false",
      spend_limit_amount: 0,
      is_spend_limit: false,
      mission_id: "",
      tax: 0,
      quota_bonus: 0,
      cashtag: "",
      is_family_plan: false,
      combo_details: [],
      is_switch_plan: false,
      discount_recurring: 0,
      is_akrab_m2m: false,
      balance_type: "PREPAID_BALANCE",
      has_bonus: false,
      discount_promo: 0
    },
    total_amount: amountInt,
    is_using_autobuy: false,
    items: items
  };
  
  const { encrypted_body } = encryptXData(
    settlementPayload,
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
    "BALANCE",
    paymentFor,
    path
  );
  
  logger.info('[BalanceService] Sending settlement request...');
  
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
    logger.warn(`[BalanceService] Failed to initiate settlement. Error: ${JSON.stringify(decryptedData)}`);
  } else {
    logger.info(`[BalanceService] Purchase result:\n${JSON.stringify(decryptedData, null, 2)}`);
  }
  
  return decryptedData;
};

module.exports = purchaseBalance;
