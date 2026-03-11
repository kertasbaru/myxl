const Joi = require('joi');

const authSchema = {
  // Schema untuk POST /auth/request-otp
  requestOtp: Joi.object({
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

  // Schema untuk POST /auth/login
  loginSubmit: Joi.object({
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
    otp: Joi.string()
      .length(6)
      .required()
      .messages({
        'string.length': 'OTP must be exactly 6 characters'
      })
  }),

  // Schema untuk POST /auth/refresh-token
  refreshSession: Joi.object({
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
  
  logout: Joi.object({
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
  })
};

module.exports = authSchema;
