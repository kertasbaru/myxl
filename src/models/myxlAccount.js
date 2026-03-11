const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MyXLAccount = sequelize.define('MyXLAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      // Memastikan hanya angka (0-9)
      is: /^[0-9]+$/i 
    },
  },
  access_token: {
    type: DataTypes.TEXT,
  },
  refresh_token: {
    type: DataTypes.TEXT,
  },
  id_token: {
    type: DataTypes.TEXT,
  },
  subscriber_id: {
    type: DataTypes.STRING(100),
  },
  subscription_type: {
    type: DataTypes.STRING(50),
  },
  expires_in: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  refresh_expires_in: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  expired_token: {
    // Menggunakan BIGINT karena Timestamp ms melebihi batas INTEGER biasa
    type: DataTypes.BIGINT, 
    defaultValue: 0,
    // Getter untuk memastikan nilai kembali sebagai Number, bukan String
    get() {
      const rawValue = this.getDataValue('expired_token');
      return rawValue ? parseInt(rawValue, 10) : 0;
    }
  },
  ax_fp: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'myxl_accounts',
  timestamps: true,
  underscored: true,
});

/**
 * Instance Method: Cek apakah token sudah kadaluarsa
 * @returns {boolean}
 */
MyXLAccount.prototype.isTokenExpired = function() {
  // Buffer 5 menit (300000ms) sebelum benar-benar expired untuk keamanan
  const safetyBuffer = 300000; 
  const now = Date.now();
  return now >= (this.expired_token - safetyBuffer);
};

module.exports = MyXLAccount;
