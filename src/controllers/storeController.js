const autoRefresh = require('./autoRefresh');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const responseHelper = require('../utils/responseHelper');
const storeSchema = require('../schemas/storeSchema');

const getFamily = require('../services/store/family');
// Note: packageDetails adalah fungsi high-level yang sudah kita buat sebelumnya
const { getPackage, packageDetails } = require('../services/store/package');

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

const storeController = {
  storeFamily: async (req, res) => {
    try {
      // 1. Validasi Input
      const { error, value } = storeSchema.family.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      // 2. Auth
      const { user } = await _handleAuth(value.msisdn);
      
      // 3. Call Service
      const respon = await getFamily(user.id_token, value.family_code);
      
      // Service getFamily mengembalikan raw response atau throw error
      if (respon.status !== 'SUCCESS') throw new Error(`${respon.code} - ${respon.message}`);
      
      // 4. Mapping Data (Sesuai kode asli Anda)
      const data = {
        family_name: respon.data.package_family.name,
        family_code: respon.data.package_family.package_family_code,
        family_type: respon.data.package_family.package_family_type,
        variants: respon.data.package_variants.map(p => ({
          variant_name: p.name,
          variant_code: p.package_variant_code,
          package_options: p.package_options ? p.package_options.map(q => ({
            order: q.order,
            option_name: q.name,
            option_code: q.package_option_code,
            validity: q.validity,
            price: q.price,
            information: q.information
          })) : []
        }))
      };
      
      return responseHelper.success(res, data, 'Get Family Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },

  storePackage: async (req, res) => {
    try {
      const { error, value } = storeSchema.packageOption.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      
      const respon = await getPackage(user.id_token, value.option_code);
      
      if (respon.status !== 'SUCCESS') throw new Error(`${respon.code} - ${respon.message}`);
      
      // Mapping Data (Sesuai kode asli Anda)
      const family = respon.data.package_family;
      const variant = respon.data.package_detail_variant;
      const option = respon.data.package_option;
      
      const data = {
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
        timestamp: respon.data.timestamp,
        token_confirmation: respon.data.token_confirmation
      };
      
      return responseHelper.success(res, data, 'Get Package Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  },
  
  storePackageDetail: async (req, res) => {
    try {
      const { error, value } = storeSchema.packageDetail.validate(req.body);
      if (error) throw new Error(`400 - ${error.details[0].message}`);
      
      const { user } = await _handleAuth(value.msisdn);
      
      const data = await packageDetails(
        user.id_token, 
        value.family_code, 
        value.variant_code, 
        value.order
      );
      
      return responseHelper.success(res, data, 'Get Package Details Requested Successfully');

    } catch (error) {
      return responseHelper.error(res, error);
    }
  }
};

module.exports = storeController;
