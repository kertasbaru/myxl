const Joi = require('joi');

const circleSchema = {
  // Hanya butuh MSISDN (Status, Group Info, List Bonus)
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

  // Validasi, Invite, Accept, Remove (Butuh Destination/Target MSISDN)
  action: Joi.object({
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
    destination: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(9)
      .max(15)
      .required()
      .messages({
        'string.empty': 'Destination is required',
        'string.min': 'Destination is too short',
        'string.max': 'Destination is too long'
      })
  })
};

module.exports = circleSchema;
