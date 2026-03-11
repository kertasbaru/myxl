const { MyXLAccount } = require('../models');
const logger = require('../utils/logger');

const accountRepository = {
  /**
   * Mencari akun berdasarkan nomor MSISDN
   * @param {string} number 
   * @returns {Promise<MyXLAccount|null>}
   */
  findByNumber: async (number) => {
    try {
      const account = await MyXLAccount.findOne({
        where: { number: number }
      });
      return account;
    } catch (error) {
      logger.error(`[Repo] Error finding account ${number}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Menyimpan akun baru atau update jika sudah ada (Upsert)
   * @param {Object} data 
   * @returns {Promise<MyXLAccount>}
   */
  saveOrUpdate: async (data) => {
    try {
      if (!data || !data.number) {
        throw new Error("Invalid data: 'number' field is required");
      }

      // Sequelize upsert mengembalikan array [instance, created]
      const [account, created] = await MyXLAccount.upsert(data);
      
      if (created) {
        logger.info(`[Repo] New account created for ${data.number}`);
      } else {
        logger.info(`[Repo] Account updated for ${data.number}`);
      }
      
      return account;
    } catch (error) {
      logger.error(`[Repo] Error saving account ${data?.number}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update token spesifik berdasarkan nomor
   * @param {string} number 
   * @param {Object} tokens 
   * @returns {Promise<boolean>} true jika berhasil update
   */
  updateTokens: async (number, tokens) => {
    try {
      // Sequelize update mengembalikan array berisi jumlah row yang ter-update
      const [affectedRows] = await MyXLAccount.update(
        { 
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          id_token: tokens.id_token,
          expires_in: tokens.expires_in,
          refresh_expires_in: tokens.refresh_expires_in,
          expired_token: tokens.expired_token,
          subscriber_id: tokens.subscriber_id,
          subscription_type: tokens.subscription_type,
          // updated_at ditangani otomatis oleh Sequelize
        },
        { 
          where: { number: number } 
        }
      );
      
      return affectedRows > 0;
    } catch (error) {
      logger.error(`[Repo] Error updating tokens for ${number}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Helper untuk mengambil data auth saja (Projection/Select specific columns)
   * @param {string} number 
   * @returns {Promise<MyXLAccount|null>}
   */
  getAuthData: async (number) => {
    try {
      const account = await MyXLAccount.findOne({
        where: { number: number },
        attributes: ['number', 'access_token', 'refresh_token', 'ax_fp', 'subscriber_id']
      });
      return account;
    } catch (error) {
      logger.error(`[Repo] Error getting auth data for ${number}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Menghapus akun berdasarkan nomor (Untuk Logout/Reset)
   * @param {string} number 
   * @returns {Promise<boolean>}
   */
  deleteByNumber: async (number) => {
    try {
      const deletedRows = await MyXLAccount.destroy({
        where: { number: number }
      });
      
      if (deletedRows > 0) {
        logger.info(`[Repo] Account deleted for ${number}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[Repo] Error deleting account ${number}: ${error.message}`);
      throw error;
    }
  }
};

module.exports = accountRepository;
