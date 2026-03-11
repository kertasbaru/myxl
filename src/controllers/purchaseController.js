const autoRefresh = require('./autoRefresh');
const helpers = require('../utils/helpers');
const responseHelper = require('../utils/responseHelper');
const purchaseSchema = require('../schemas/purchaseSchema');

const { preparePaymentInfo } = require('../services/purchase/paymentMethod');
const purchaseBalance = require('../services/purchase/balance');
const purchaseQris = require('../services/purchase/qris');

const pendingPayment = require('../services/purchase/pending');
const defaultDecoys = require('../services/purchase/decoys/default');

const _handleAuth = async (msisdn) => {
  const user = await autoRefresh(helpers.formatNomor(msisdn));
  if (!user) throw new Error("401 - Login required");
  return user;
};

const purchaseController = {
  paymentMethods: async (req, res) => {
    try {
      const { error, value } = purchaseSchema.paymentMethods.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const user = await _handleAuth(value.msisdn);
      const paymentInfo = await preparePaymentInfo(user.id_token, value.family_code, value.variant_code, value.order);
      
      return responseHelper.success(res, paymentInfo, 'Payment Method Requested Successfully');
    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  balance: async (req, res) => {
    try {
      const { error, value } = purchaseSchema.balance.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const user = await _handleAuth(value.msisdn);
      const targetData = await preparePaymentInfo(user.id_token, value.family_code, value.variant_code, value.order);
      
      // Init Variables (Default Target)
      let activeData = { ...targetData }; 
      let totalPrice = targetData.price;
      const items = [{
        item_code: targetData.option_code,
        item_name: targetData.name,
        item_price: targetData.price,
        product_type: "",
        tax: 0
      }];

      // Logic Decoy (Setup Awal)
      const decoyConfig = defaultDecoys.balance2;
      if (value.is_decoy) {
        const decoyData = await preparePaymentInfo(user.id_token, decoyConfig.family_code, decoyConfig.variant_code, decoyConfig.order, decoyConfig.is_enterprise, decoyConfig.migration_type);
        
        activeData = decoyData; // Token & Timestamp pakai punya Decoy
        totalPrice += decoyData.price;
        items.push({
          item_code: decoyData.option_code,
          item_name: decoyData.name,
          item_price: decoyData.price,
          product_type: "",
          tax: 0
        });
      }

      // Eksekusi Pembelian Pertama
      let purchase = await purchaseBalance(
        user.id_token, user.access_token, items, 
        activeData.token_payment, activeData.payment_for, activeData.timestamp, totalPrice
      );

      // Retry Logic (Khusus Decoy + Error Amount)
      if (purchase.status === 'FAILED' && value.is_decoy && purchase.message.includes("Bizz-err.Amount.Total") || purchase.message.includes("Payment amount is not valid")) {
        // Refresh Decoy Token
        const newDecoy = await preparePaymentInfo(user.id_token, decoyConfig.family_code, decoyConfig.variant_code, decoyConfig.order, decoyConfig.is_enterprise, decoyConfig.migration_type);
        
        // Retry dengan Token Baru & Harga Decoy saja
        purchase = await purchaseBalance(
          user.id_token, user.access_token, items, 
          newDecoy.token_payment, newDecoy.payment_for, newDecoy.timestamp, newDecoy.price
        );
      }

      // Final Check
      if (purchase.status === 'FAILED') return responseHelper.error(res, purchase.message);

      // Mapping Response Sukses
      const detail = purchase.data.details[0];
      return responseHelper.success(res, {
        transaction_code: purchase.data.transaction_code,
        name: detail.name,
        code: detail.code,
        amount: detail.amount,
        status: detail.status,
        deeplink: purchase.data.deeplink
      }, 'Purchase with balance requested successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  qris: async (req, res) => {
    try {
      const { error, value } = purchaseSchema.balance.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const user = await _handleAuth(value.msisdn);
      const targetData = await preparePaymentInfo(user.id_token, value.family_code, value.variant_code, value.order);
      
      // Init Variables (Default Target)
      let activeData = { ...targetData }; 
      let totalPrice = targetData.price;
      const items = [{
        item_code: targetData.option_code,
        item_name: targetData.name,
        item_price: targetData.price,
        product_type: "",
        tax: 0
      }];

      // Logic Decoy (Setup Awal)
      const decoyConfig = defaultDecoys.qris;
      if (value.is_decoy) {
        const decoyData = await preparePaymentInfo(user.id_token, decoyConfig.family_code, decoyConfig.variant_code, decoyConfig.order, decoyConfig.is_enterprise, decoyConfig.migration_type);
        
        activeData = decoyData; // Token & Timestamp pakai punya Decoy
        totalPrice = decoyData.price;
        items.push({
          item_code: decoyData.option_code,
          item_name: decoyData.name,
          item_price: decoyData.price,
          product_type: "",
          tax: 0
        });
      }

      // Eksekusi Pembelian Pertama
      let purchase = await purchaseQris(
        user.id_token, user.access_token, items, 
        activeData.token_payment, activeData.payment_for, activeData.timestamp, totalPrice
      );

      // Retry Logic (Khusus Decoy + Error Amount)
      if (purchase.status === 'FAILED' && value.is_decoy && (purchase.message.includes("Bizz-err.Amount.Total") || purchase.message.includes("Payment amount is not valid"))) {
        // Refresh Decoy Token
        const newDecoy = await preparePaymentInfo(user.id_token, decoyConfig.family_code, decoyConfig.variant_code, decoyConfig.order, decoyConfig.is_enterprise, decoyConfig.migration_type);
        
        // Retry dengan Token Baru & Harga Decoy saja
        purchase = await purchaseQris(
          user.id_token, user.access_token, items, 
          newDecoy.token_payment, newDecoy.payment_for, newDecoy.timestamp, newDecoy.price
        );
      }

      // Final Check
      if (purchase.status === 'FAILED') return responseHelper.error(res, purchase.message);
      
      // Pending Payment
      const pending = await pendingPayment(user.id_token, purchase.data.transaction_code);
      
      const qris = await helpers.generateBase64QR(pending.data.qr_code);
      
      // Mapping Response Sukses
      const detail = purchase.data.details[0];
      return responseHelper.success(res, {
        transaction_code: purchase.data.transaction_code,
        name: detail.name,
        code: detail.code,
        amount: detail.amount,
        status: detail.status,
        deeplink: qris
      }, 'Purchase with qris requested successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  }
}

module.exports = purchaseController;
