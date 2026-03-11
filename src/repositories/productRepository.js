const { Product } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const productRepository = {
  /**
   * Menyimpan banyak produk sekaligus (Batch Insert/Update)
   * Digunakan saat sync catalog dari MyXL
   * @param {Array} productsData 
   */
  bulkUpsert: async (productsData) => {
    try {
      if (!productsData || productsData.length === 0) return;

      // bulkCreate dengan updateOnDuplicate sangat efisien untuk Ribuan data
      await Product.bulkCreate(productsData, {
        updateOnDuplicate: [
          'name', 'price', 'description', 
          'family_name', 'family_code', 
          'is_enterprise', 'variant_name', 
          'option_name', 'sort_order', 'updated_at'
        ]
      });
      
      logger.info(`[Repo] Successfully synced ${productsData.length} products`);
    } catch (error) {
      logger.error(`[Repo] Error bulk upsert products: ${error.message}`);
      throw error;
    }
  },

  /**
   * Mengambil daftar produk dengan Filter dan Pagination
   * @param {Object} params { page, limit, search, familyCode }
   */
  findAll: async ({ page = 1, limit = 20, search = '', familyCode = null }) => {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filter Pencarian (Code atau Name)
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } }, // Case insensitive di MySQL default
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter Kategori
      if (familyCode) {
        whereClause.family_code = familyCode;
      }

      const { count, rows } = await Product.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['price', 'ASC']], // Urutkan dari termurah
      });

      return {
        totalItems: count,
        products: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      };
    } catch (error) {
      logger.error(`[Repo] Error finding products: ${error.message}`);
      throw error;
    }
  },

  /**
   * Cari detail produk berdasarkan kode unik
   * @param {string} code 
   */
  findByCode: async (code) => {
    try {
      return await Product.findOne({ where: { code } });
    } catch (error) {
      logger.error(`[Repo] Error find product by code ${code}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Hapus semua produk (Opsional, untuk hard reset catalog)
   */
  clearAll: async () => {
    try {
      await Product.destroy({ where: {}, truncate: true });
      logger.warn('[Repo] All products cleared from database');
    } catch (error) {
      logger.error(`[Repo] Error clearing products: ${error.message}`);
      throw error;
    }
  }
};

module.exports = productRepository;
