const autoRefresh = require('./autoRefresh');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const responseHelper = require('../utils/responseHelper');
const userSchema = require('../schemas/userSchema');

// Import Services
const userBalance = require('../services/user/balance');
const userProfile = require('../services/user/profile');
const userSegments = require('../services/user/segments');
const { userNotifAll, userNotifDetail } = require('../services/user/notifications');
const { userPackageDetails, userPackageUnsub } = require('../services/user/package');
const { userLockInfo, setLockUnlock } = require('../services/user/lockunlock');

const userController = {
  getBalance: async (req, res) => {
    try {
      // 1. Validasi Input
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      
      // 2. Auto Refresh / Auth Check
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      // 3. Panggil Service
      const respon = await userBalance(user.id_token);
      
      if (respon.status !== 'SUCCESS') {
        throw new Error(`${respon.code} - ${respon.message}`);
      }
      
      const data = respon.data;
      
      // 4. Return Response
      return responseHelper.success(res, {
        balance: data.balance.remaining,
        expired_at: data.balance.expired_at,
        grace_at: data.grace_end_date
      }, 'Balance Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  getProfile: async (req, res) => {
    try {
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const respon = await userProfile(user.id_token, user.access_token);
      
      if (respon.status !== 'SUCCESS') {
        throw new Error(`${respon.code} - ${respon.message}`);
      }
      
      const data = respon.data.profile;
      
      return responseHelper.success(res, {
        name: data.name,
        msisdn: data.msisdn,
        subscriber_id: data.subscriber_id,
        subscription_type: data.subscription_type
      }, 'Profile Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  getSegments: async (req, res) => {
    try {
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const respon = await userSegments(user.id_token, user.access_token);
      
      if (respon.status !== 'SUCCESS') {
        throw new Error(`${respon.code} - ${respon.message}`);
      }
      
      return responseHelper.success(res, respon.data, 'Segments Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  getNotifications: async (req, res) => {
    try {
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const respon = await userNotifAll(user.id_token);
      
      if (respon.status !== 'SUCCESS') {
        throw new Error(`${respon.code} - ${respon.message}`);
      }
      
      const data = respon.data.inbox.map((p) => ({
        notification_id: p.notification_id,
        timestamp: p.timestamp,
        is_read: p.is_read,
        message: p.full_message
      }));
      
      return responseHelper.success(res, data, 'Notification Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  readNotification: async (req, res) => {
    try {
      const { error, value } = userSchema.readNotification.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const respon = await userNotifDetail(user.id_token, value.notification_id);
      
      if (respon.status !== 'SUCCESS') {
        throw new Error(`${respon.code} - ${respon.message}`);
      }
      
      return responseHelper.success(res, {
        notification_id: respon.data.notification_id,
        timestamp: respon.data.timestamp,
        is_read: respon.data.is_read,
        message: respon.data.full_message
      }, 'Notification Detail Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  getPackageDetails: async (req, res) => {
    try {
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const data = await userPackageDetails(user.id_token);
      
      if (data.status !== 'SUCCESS') {
        throw new Error(`${data.code} - ${data.message}`);
      }
      
      let packages;
      if (!data.data.quotas || data.data.quotas.length <= 0) {
        packages = 'Anda Tidak Memiliki Paket Apapun';
      } else {
        packages = data.data.quotas.map((p) => {
          const benefits = p.benefits ? p.benefits.map((q) => ({
            name: q.name,
            information: q.information,
            remaining: q.remaining,
            total: q.total
          })) : [];

          return {
            name: p.name,
            expired_at: p.expired_at,
            family_member_id: p.family_member_id,
            product_domain: p.product_domain,
            product_subscription_type: p.product_subscription_type,
            quota_code: p.quota_code,
            benefits: benefits
          }
        });
      }
      
      return responseHelper.success(res, packages, 'Package Details Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  },
  
  unsubPackage: async (req, res) => {
    try {
      const { error, value } = userSchema.unsubPackage.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const data = await userPackageUnsub(user.id_token, value.quota_name);
      
      // Asumsi service userPackageUnsub mengembalikan struktur standar MyXL
      if (data.status !== 'SUCCESS') {
        throw new Error(`${data.code} - ${data.message}`);
      }
      
      return responseHelper.success(res, data, 'Unsubscribe Package Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  },
  
  getLockInfo: async (req, res) => {
    try {
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const data = await userLockInfo(user.id_token);
      
      if (data.status !== 'SUCCESS') {
        throw new Error(`${data.code} - ${data.message}`);
      }
      
      const isLocked = data.data.balance_lock_status.every(status => status.is_locked);
      
      return responseHelper.success(res, isLocked, 'Lock Unlock Info Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  },
  
  lockUnlockSet: async (req, res) => {
    try {
      const { error, value } = userSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const formattedMsisdn = helpers.formatNomor(value.msisdn);
      const user = await autoRefresh(formattedMsisdn);
      if (user === null) throw new Error("401 - Login required");
      
      const data = await setLockUnlock(user.id_token);
      
      if (data.status !== 'SUCCESS') {
        throw new Error(`${data.code} - ${data.message}`);
      }
      
      // Mengambil status akhir dari data balikan setLockUnlock (logic ini ada di service lockunlock.js yg sy revisi)
      const isLocked = data.data.balance_lock_status.every(status => status.is_locked);
      
      return responseHelper.success(res, isLocked, 'Lock Unlock Set Requested Successfully');
      
    } catch (error) {
      return responseHelper.error(res, error);
    } 
  }
};

module.exports = userController;
