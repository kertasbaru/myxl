const { Transaction } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const transactionsRepository = {
  /**
   * Membuat log transaksi baru (Status awal: PENDING)
   * @param {Object} data 
   */
  create: async (data) => {
    try {
      const transaction = await Transaction.create({
        ref_id: data.refId, // UUID dari kita
        msisdn: data.msisdn,
        product_code: data.productCode,
        price_amount: data.price || 0,
        payment_method: data.paymentMethod || 'PULSA',
        status: 'PENDING',
        status_message: 'Initiating transaction...',
      });
      return transaction;
    } catch (error) {
      logger.error(`[Repo] Error creating transaction log: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update status transaksi (SUCCESS/FAILED)
   * @param {string} refId 
   * @param {string} status 
   * @param {string} message 
   * @param {string} xlTransactionId (Opsional)
   */
  updateStatus: async (refId, status, message, xlTransactionId = null) => {
    try {
      const updateData = {
        status: status,
        status_message: message || '',
      };

      if (xlTransactionId) {
        updateData.xl_transaction_id = xlTransactionId;
      }

      const [affectedRows] = await Transaction.update(updateData, {
        where: { ref_id: refId }
      });

      return affectedRows > 0;
    } catch (error) {
      logger.error(`[Repo] Error updating transaction ${refId}: ${error.message}`);
      // Jangan throw error di sini agar tidak mengganggu flow respon ke user
      // cukup log error database saja.
      return false;
    }
  },

  /**
   * Cari transaksi berdasarkan Ref ID kita
   * @param {string} refId 
   */
  findByRefId: async (refId) => {
    return await Transaction.findOne({ where: { ref_id: refId } });
  },

  /**
   * Ambil riwayat transaksi berdasarkan nomor HP
   * @param {string} msisdn 
   * @param {number} limit 
   */
  getHistoryByMsisdn: async (msisdn, limit = 10) => {
    try {
      return await Transaction.findAll({
        where: { msisdn: msisdn },
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });
    } catch (error) {
      logger.error(`[Repo] Error getting history for ${msisdn}: ${error.message}`);
      throw error;
    }
  }
};

module.exports = transactionsRepository;
