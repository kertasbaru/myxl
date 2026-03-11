const Joi = require('joi');

const famplanSchema = {
  // Hanya butuh MSISDN (Dashboard)
  common: Joi.object({
    msisdn: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(9)
      .max(15)
      .required()
      .messages({
        'string.empty': 'MSISDN is required',
        'string.min': 'MSISDN is too short',
        'string.max': 'MSISDN is too long'
      })
  }),

  // Validasi Nomor Tujuan (Validation, Remove, Detail Quota)
  targetAction: Joi.object({
    msisdn: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(9)
      .max(15)
      .required()
      .messages({
        'string.empty': 'MSISDN is required',
        'string.min': 'MSISDN is too short',
        'string.max': 'MSISDN is too long'
      }),
    destination: Joi.string().pattern(/^[0-9]+$/).required()
  }),

  // Add Member (Butuh Slot ID & Alias)
  addMember: Joi.object({
    msisdn: Joi.string().pattern(/^[0-9]+$/).required(),
    destination: Joi.string().pattern(/^[0-9]+$/).required(),
    slot_id: Joi.string().required(), // Slot ID biasanya string di API MyXL
    parent_alias: Joi.string().required()
  }),

  // Set Quota (Butuh Amount Quota)
  setQuota: Joi.object({
    msisdn: Joi.string().pattern(/^[0-9]+$/).required(),
    destination: Joi.string().pattern(/^[0-9]+$/).required(),
    quota: Joi.number().min(0).required() // Quota dalam GB
  })
};

module.exports = famplanSchema;
