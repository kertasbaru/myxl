const Joi = require('joi');

const purchaseSchema = {
  // Schema untuk Cek Payment Method
  paymentMethods: Joi.object({
    msisdn: Joi.string().required(),
    family_code: Joi.string().required(),
    variant_code: Joi.string().required(),
    order: Joi.number().default(1)
  }),

  // Schema untuk Eksekusi Pembelian
  balance: Joi.object({
    msisdn: Joi.string().required(),
    family_code: Joi.string().required(),
    variant_code: Joi.string().required(),
    order: Joi.number().default(1),
    is_decoy: Joi.boolean().default(false).label("Gunakan Pancingan")
  })
};

module.exports = purchaseSchema;
