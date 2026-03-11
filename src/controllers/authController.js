const { requestOtp } = require('../services/auth/requestOtp');
const { submitOtp } = require('../services/auth/submitOtp');
const { refreshToken } = require('../services/auth/refreshToken');
const userProfile = require('../services/user/profile');
const accountRepository = require('../repositories/accountRepository');
const { generateAxFp } = require('../utils/cryptoHelpers');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const responseHelper = require('../utils/responseHelper');

// Import Schema Validasi
const authSchema = require('../schemas/authSchema');

const authController = {
  requestOtp: async (req, res) => {
    try {
      // 1. Validasi Input via Joi
      const { error, value } = authSchema.requestOtp.validate(req.body);
      if (error) {
        throw new Error(`400 - ${error.details[0].message}`);
      }

      const { msisdn } = value;
      const formattedMsisdn = helpers.formatNomor(msisdn);
      
      // 2. Cek User & Fingerprint
      let user = await accountRepository.findByNumber(formattedMsisdn);
      let axFp = user ? user.ax_fp : null;
      
      if (!axFp) {
        logger.info(`Generating new fingerprint for ${formattedMsisdn}`);
        axFp = generateAxFp(formattedMsisdn);
        await accountRepository.saveOrUpdate({ number: formattedMsisdn, ax_fp: axFp });
      }

      // 3. Panggil Service
      const respon = await requestOtp(formattedMsisdn, axFp);
      
      if (respon.subscriber_id) {
        await accountRepository.saveOrUpdate({
          number: formattedMsisdn,
          subscriber_id: respon.subscriber_id,
          ax_fp: axFp
        });
      }

      return responseHelper.success(res, respon, 'OTP Requested successfully');
    } catch (error) {
      return responseHelper.error(res, error);
    }
  },

  loginSubmit: async (req, res) => {
    try {
      // 1. Validasi Input
      const { error, value } = authSchema.loginSubmit.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);

      const { msisdn, otp } = value;
      const formattedMsisdn = helpers.formatNomor(msisdn);

      const user = await accountRepository.findByNumber(formattedMsisdn);
      if (!user || !user.ax_fp) {
        throw new Error("400 - Session not found. Please Request OTP first.");
      }

      // 2. Submit OTP
      const response = await submitOtp('SMS', formattedMsisdn, otp, user.ax_fp);

      // 3. Ambil Profile
      const profile = await userProfile(response.id_token, response.access_token);
      if (!profile?.data?.profile) throw new Error("Failed to retrieve user profile");

      const subData = profile.data.profile;
      const expiredAtMs = Date.now() + (response.expires_in * 1000);

      // 4. Update Database
      await accountRepository.updateTokens(formattedMsisdn, {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        id_token: response.id_token,
        expires_in: response.expires_in,
        refresh_expires_in: response.refresh_expires_in,
        expired_token: expiredAtMs,
        subscriber_id: subData.subscriber_id,
        subscription_type: subData.subscription_type
      });

      return responseHelper.success(res, {
        ...response,
        subscriber_id: subData.subscriber_id,
        subscription_type: subData.subscription_type,
        expires_at: expiredAtMs,
        msisdn: formattedMsisdn
      }, 'Login Successful');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },

  refreshSession: async (req, res) => {
    try {
      // 1. Validasi Input
      const { error, value } = authSchema.refreshSession.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);

      const { msisdn } = value;
      const formattedMsisdn = helpers.formatNomor(msisdn);

      const user = await accountRepository.findByNumber(formattedMsisdn);
      if (!user || !user.refresh_token || !user.ax_fp) {
        throw new Error("401 - User session not found. Please login again.");
      }

      // 2. Refresh Token
      const response = await refreshToken(user.refresh_token, user.subscriber_id, user.ax_fp);
      if (!response?.access_token) throw new Error("401 - Failed to refresh token");

      const expiredAtMs = Date.now() + (response.expires_in * 1000);

      await accountRepository.updateTokens(formattedMsisdn, {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        id_token: response.id_token,
        expires_in: response.expires_in,
        refresh_expires_in: response.refresh_expires_in,
        expired_token: expiredAtMs,
        subscriber_id: user.subscriber_id,
        subscription_type: user.subscription_type
      });

      return responseHelper.success(res, {
        ...response,
        expires_at: expiredAtMs
      }, 'Token refreshed successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  }
};

module.exports = authController;
