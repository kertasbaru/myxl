const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ref_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Request ID unik dari sistem kita (UUID)',
  },
  msisdn: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  product_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING', // PENDING, SUCCESS, FAILED
    validate: {
      isIn: [['PENDING', 'SUCCESS', 'FAILED']]
    }
  },
  status_message: {
    type: DataTypes.TEXT,
    comment: 'Pesan error atau sukses dari MyXL',
  },
  xl_transaction_id: {
    type: DataTypes.STRING(100),
    comment: 'ID Transaksi balikan dari sistem MyXL',
  },
  price_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    // Getter: Mengubah string decimal ke number float
    get() {
      const value = this.getDataValue('price_amount');
      return value === null ? null : parseFloat(value);
    }
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'PULSA', // PULSA, DOMPET_PULSA, OVO, dll
  },
}, {
  tableName: 'transaction_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_msisdn',
      fields: ['msisdn']
    },
    {
      name: 'idx_status',
      fields: ['status']
    },
    {
      name: 'idx_ref_id',
      unique: true,
      fields: ['ref_id']
    },
    // Index untuk created_at berguna untuk filter report per tanggal
    {
      name: 'idx_created_at',
      fields: ['created_at']
    }
  ]
});

module.exports = Transaction;
