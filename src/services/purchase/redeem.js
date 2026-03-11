const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');
const logger = require('../../utils/logger');
const { interceptPage } = require('../store/utility');
const {
  encryptXData,
  decryptXData,
  makeXSignatureLoyalty,
  makeXSignatureBounty,
  getJavaLikeTimestamp,
  buildEncryptedField
} = require('../../utils/cryptoHelpers');

const BASE_API_URL = config.myxl.urls.baseApi;
const UA = config.myxl.headers.userAgent;
const API_KEY = config.myxl.security.apiKey;

const _sendRedeemRequest = async (path, payload, idToken, xSignature) => {
  const { encrypted_body } = encryptXData(payload, 'POST', path, idToken);
  const xtime = parseInt(encrypted_body.xtime, 10);
  const sigTimeSec = Math.floor(xtime / 1000);

  const host = BASE_API_URL.replace(/^https?:\/\//, '');
  const url = `${BASE_API_URL}/${path}`;

  const headers = {
    'host': host,
    'content-type': 'application/json; charset=utf-8',
    'user-agent': UA,
    'x-api-key': API_KEY,
    'authorization': `Bearer ${idToken}`,
    'x-hv': 'v3',
    'x-signature-time': sigTimeSec.toString(),
    'x-signature': xSignature,
    'x-request-id': uuidv4(),
    'x-request-at': getJavaLikeTimestamp(xtime),
    'x-version-app': '8.9.0',
  };

  const response = await axios({
    method: 'POST',
    url,
    headers,
    data: encrypted_body,
    timeout: 30000
  });

  return decryptXData(response.data);
};

/**
 * Redeem Poin Loyalitas
 */
const bonusLoyalty = async (idToken, code, point = 0, timestamp, tokenConfirm) => {
  try {
    const path = 'gamification/api/v8/loyalties/tiering/exchange';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      item_name: '',
      item_code: code,
      amount: 0,
      partner: '',
      points: point !== 0 ? point : 0,
      timestamp: timestamp,
      token_confirmation: tokenConfirm
    };

    const xSig = makeXSignatureLoyalty(timestamp, code, tokenConfirm, path);
    logger.info(`[Redeem] Loyalty Exchange ${code}...`);

    const decryptedData = await _sendRedeemRequest(path, payload, idToken, xSig);

    if (decryptedData.status !== 'SUCCESS') {
      throw new Error(decryptedData.message || "Loyalty Redeem Failed");
    }

    const details = decryptedData.data.details[0];
    return {
      transaction_code: decryptedData.data.transaction_code,
      payment_method: decryptedData.data.payment_method,
      code: details.code,
      amount: details.amount
    };
  } catch (err) {
    logger.error(`[Redeem] Loyalty Error: ${err.message}`);
    throw err;
  }
};

/**
 * Redeem Bonus Personal (Bounty)
 */
const bonusPersonalization = async (idToken, accessToken, itemName, code, timestamp, tokenConfirm, price) => {
  try {
    await interceptPage(idToken, code, false);
    
    const path = 'api/v8/personalization/bounties-exchange';
    const payload = {
      access_token: accessToken,
      activated_autobuy_code: '',
      additional_data: {
        akrab_m2m_group_id: '',
        balance_type: '',
        benefit_type: '',
        cashtag: '',
        combo_details: [],
        discount_promo: 0,
        discount_recurring: 0,
        has_bonus: false,
        is_akrab_m2m: false,
        is_family_plan: false,
        is_spend_limit: false,
        is_spend_limit_temporary: false,
        is_switch_plan: false,
        migration_type: '',
        mission_id: '',
        original_price: 0,
        quota_bonus: 0,
        spend_limit_amount: 0,
        tax: 0
      },
      akrab_members: [],
      akrab_parent_alias: '',
      authentication_id: '',
      autobuy_threshold_setting: { label: '', type: '', value: 0 },
      can_trigger_rating: false,
      cc_payment_type: '',
      coupon: '',
      encrypted_authentication_id: buildEncryptedField(null, true),
      encrypted_payment_token: buildEncryptedField(null, true),
      ewallet_promo_id: '',
      fingerprint: '',
      is_enterprise: false,
      is_myxl_wallet: false,
      is_use_point: false,
      is_using_autobuy: false,
      items: [{
        item_code: code,
        item_name: itemName,
        item_price: price,
        product_type: '',
        tax: 0
      }],
      lang: 'id',
      members: [],
      payment_for: 'REDEEM_VOUCHER',
      payment_method: 'BALANCE',
      payment_token: '',
      pin: '',
      points_gained: 0,
      referral_unique_code: '',
      stage_token: '',
      timestamp: timestamp,
      token: '',
      token_confirmation: tokenConfirm,
      token_payment: '',
      topup_number: '',
      total_amount: 0,
      total_discount: 0,
      total_fee: 0,
      wallet_number: '',
      with_upsell: false
    };

    const xSig = makeXSignatureBounty(accessToken, timestamp, code, tokenConfirm);
    logger.info(`[Redeem] Bounty Exchange ${code}...`);

    const decryptedData = await _sendRedeemRequest(path, payload, idToken, xSig);

    if (decryptedData.status !== 'SUCCESS') {
      throw new Error(decryptedData.message || "Bounty Redeem Failed");
    }

    const details = decryptedData.data.details[0];
    return {
      transaction_code: decryptedData.data.transaction_code,
      name: details.name,
      code: details.code,
      amount: details.amount,
      payment_method: decryptedData.data.payment_method,
      status: details.status,
      deeplink: decryptedData.data.deeplink
    };
  } catch (err) {
    logger.error(`[Redeem] Bounty Error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  bonusLoyalty,
  bonusPersonalization
};
