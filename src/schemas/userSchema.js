const Joi = require('joi');

const userSchema = {
  // Schema Umum (Hanya butuh MSISDN)
  common: Joi.object({
    msisdn: Joi.string()
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.empty': 'MSISDN is required',
        'string.pattern.base': 'MSISDN must contain only numbers'
      })
  }),

  // Schema Baca Notifikasi (Butuh ID)
  readNotification: Joi.object({
    msisdn: Joi.string()
      .pattern(/^[0-9]+$/)
      .required(),
    notification_id: Joi.string()
      .required()
      .messages({
        'string.empty': 'Notification ID is required'
      })
  }),

  // Schema Unreg Paket (Butuh Nama Paket)
  unsubPackage: Joi.object({
    msisdn: Joi.string()
      .pattern(/^[0-9]+$/)
      .required(),
    quota_name: Joi.string()
      .required()
      .messages({
        'string.empty': 'Quota Name is required'
      })
  })
};

module.exports = userSchema;
