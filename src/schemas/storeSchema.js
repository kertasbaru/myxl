const Joi = require('joi');

const storeSchema = {
  // Schema untuk getFamily
  family: Joi.object({
    msisdn: Joi.string().pattern(/^[0-9]+$/).required(),
    family_code: Joi.string().required()
  }),

  // Schema untuk getPackage (by Option Code)
  packageOption: Joi.object({
    msisdn: Joi.string().pattern(/^[0-9]+$/).required(),
    option_code: Joi.string().required()
  }),

  // Schema untuk getPackage (by Hierarchy)
  packageDetail: Joi.object({
    msisdn: Joi.string().pattern(/^[0-9]+$/).required(),
    family_code: Joi.string().required(),
    variant_code: Joi.string().required(),
    order: Joi.number().integer().required()
  })
};

module.exports = storeSchema;
