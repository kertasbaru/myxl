const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

let sequelize;

const sequelizeOptions = {
  dialect: 'mysql',
  // Log query SQL hanya jika di development untuk mengurangi noise log di production
  logging: (msg) => {
    if (config.app.env === 'development') {
      logger.debug(msg);
    }
  },
  pool: {
    max: 10, // Meningkatkan max pool untuk handling concurrency lebih baik
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  // Timezone untuk penulisan data (MySQL Write). 
  // Pastikan DB server juga memiliki time configuration yang sesuai.
  timezone: '+07:00', 
  define: {
    timestamps: true, // CreatedAt & UpdatedAt otomatis
    underscored: true, // Menggunakan snake_case di database (created_at vs createdAt)
    freezeTableName: true, // Mencegah pluralisasi otomatis nama tabel
  },
  dialectOptions: {
    // Memaksa konversi tanggal menjadi string saat dibaca untuk menghindari pergeseran jam otomatis oleh driver
    dateStrings: true,
    typeCast: true,
  }
};

if (config.db.url) {
  logger.info('Initializing database using Connection String...');
  sequelize = new Sequelize(config.db.url, sequelizeOptions);
} else {
  logger.info('Initializing database using Discrete Parameters...');
  sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    {
      host: config.db.host,
      port: config.db.port,
      ...sequelizeOptions,
    }
  );
}

const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`✅ Database connected successfully to ${config.db.host || 'remote host'}`);
  } catch (error) {
    // Throw error agar ditangkap oleh startServer di app.js
    logger.error(`❌ Unable to connect to the database: ${error.message}`);
    throw error; 
  }
};

module.exports = {
  sequelize,
  connectDatabase,
};
