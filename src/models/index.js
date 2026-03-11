const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Import Model Definitions
const MyXLAccount = require('./myxlAccount');
const Product = require('./product');
const Transaction = require('./transactions');

// ==========================================
// DEFINE ASSOCIATIONS (RELASI ANTAR TABEL)
// ==========================================
// Saat ini desain database menggunakan "Loose Coupling" (Relasi via string MSISDN/Code)
// sehingga tidak ada Foreign Key Constraint yang ketat (Cascade Delete, dll).
// Ini sengaja dilakukan agar Log Transaksi tetap ada meskipun User/Produk dihapus.

const syncDatabase = async () => {
  try {
    // alter: true => Otomatis update struktur tabel jika ada perubahan di codingan Model
    // force: false => Jangan hapus tabel yang sudah ada
    await sequelize.sync({ alter: true });
    logger.info('✅ Database & Tables synced successfully!');
  } catch (error) {
    logger.error(`❌ Unable to sync database: ${error.message}`);
    // Kita biarkan error ini bubble up atau ditangani caller, 
    // tapi karena ini async di app.js, logging saja sudah cukup informatif.
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  MyXLAccount,
  Product,
  Transaction
};
