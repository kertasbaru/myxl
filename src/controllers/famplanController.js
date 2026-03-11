const autoRefresh = require('./autoRefresh');
const helpers = require('../utils/helpers');
const responseHelper = require('../utils/responseHelper');
const famplanSchema = require('../schemas/famplanSchema');

// Import Service yang sudah diperbaiki
const checkMemberEligibility = require('../services/famplan/validate');
const { getFamDashboard } = require('../services/famplan/dashboard');
const addMember = require('../services/famplan/add');
const getMemberQuotaDetails = require('../services/famplan/quotaMember');
const removeMember = require('../services/famplan/remove');
const setMemberQuota = require('../services/famplan/setQuota');

/**
 * Helper internal untuk Auth
 */
const _handleAuth = async (msisdn) => {
  const formattedMsisdn = helpers.formatNomor(msisdn);
  const user = await autoRefresh(formattedMsisdn);
  
  if (!user) {
    throw new Error("401 - Login required");
  }
  return { user, formattedMsisdn };
};

const famplanController = {
  // 1. Cek Validasi Nomor (Sebelum Add)
  getValidation: async (req, res) => {
    try {
      const { error, value } = famplanSchema.targetAction.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const respon = await checkMemberEligibility(user.id_token, formattedDestination);
      
      // if (respon.status !== 'SUCCESS') throw new Error(`${respon.code} - ${respon.message}`);
      
      return responseHelper.success(res, respon.data, 'Validation Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  },
  
  // 2. Dashboard Family Plan
  getDashboard: async (req, res) => {
    try {
      const { error, value } = famplanSchema.common.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user, formattedMsisdn } = await _handleAuth(value.msisdn);
      
      // Cek apakah nomor ini memiliki paket akrab (Opsional, tapi bagus untuk validasi awal)
      const validation = await checkMemberEligibility(user.id_token, formattedMsisdn);
      if (validation.status === 'SUCCESS' && !validation.data.has_family_plan) {
         // Note: Logic asli Anda menggunakan !has_family_plan untuk melempar error.
         // Tapi biasanya has_family_plan true artinya dia member/parent.
         // Sesuaikan jika logic bisnis Anda berbeda.
         throw new Error("Nomor bukan Pengelola/Anggota Paket Akrab");
      }

      const dashboard = await getFamDashboard(user.id_token);
      
      return responseHelper.success(res, {
        msisdn: dashboard.parent.msisdn,
        end_date: dashboard.parent.end_date,
        family_member_id: dashboard.parent.family_member_id,
        total_quota: dashboard.parent.total_quota,
        remaining_quota: dashboard.parent.remaining_quota,
        members: dashboard.members
      }, 'Family Dashboard Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },

  // 3. Tambah Member Baru
  addMember: async (req, res) => {
    try {
      const { error, value } = famplanSchema.addMember.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      // Validasi nomor tujuan dulu
      const validation = await checkMemberEligibility(user.id_token, formattedDestination);
      if (validation.status === 'SUCCESS' && validation.data.has_family_plan) {
        throw new Error("Nomor tujuan sudah memiliki Paket Akrab");
      }

      const memberAlias = helpers.randomName();
      
      const respon = await addMember(
        user.id_token, 
        value.slot_id, 
        value.parent_alias, 
        memberAlias, 
        formattedDestination
      );
      
      return responseHelper.success(res, respon.data, 'Add Member Requested Succesfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },

  // 4. Detail Kuota Member
  detailQuotas: async (req, res) => {
    try {
      const { error, value } = famplanSchema.targetAction.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const respon = await getMemberQuotaDetails(user.id_token, formattedDestination);
      
      if (respon.status !== 'SUCCESS') throw new Error(`${respon.code} - ${respon.message}`);

      let packages;
      if (!respon.data.quotas || respon.data.quotas.length <= 0) {
        packages = 'Anda Tidak Memiliki Paket Apapun';
      } else {
        packages = respon.data.quotas.map((p) => ({
          name: p.name,
          expired_at: p.expired_at,
          family_member_id: p.family_member_id,
          product_domain: p.product_domain,
          product_subscription_type: p.product_subscription_type,
          quota_code: p.quota_code,
          benefits: p.benefits ? p.benefits.map((q) => ({
            name: q.name,
            information: q.information,
            remaining: q.remaining,
            total: q.total
          })) : []
        }));
      }
      
      return responseHelper.success(res, packages, 'Famplan Member Details Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  },
  
  // 5. Hapus Member
  remove: async (req, res) => {
    try {
      const { error, value } = famplanSchema.targetAction.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const respon = await removeMember(user.id_token, formattedDestination);
      
      return responseHelper.success(res, respon.data, 'Famplan Remove Member Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  },
  
  // 6. Atur Alokasi Kuota
  setQuota: async (req, res) => {
    try {
      const { error, value } = famplanSchema.setQuota.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      const formattedDestination = helpers.formatNomor(value.destination);
      
      const respon = await setMemberQuota(user.id_token, formattedDestination, value.quota);
      
      return responseHelper.success(res, respon.data.member_allocations[0], 'Famplan Set Quota Member Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    } 
  }
};

module.exports = famplanController;
