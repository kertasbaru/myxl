const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true, // Otomatis membuat unique index
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    // Getter: Mengubah string '10000.00' menjadi number 10000
    get() {
      const value = this.getDataValue('price');
      return value === null ? null : parseFloat(value);
    }
  },
  description: {
    type: DataTypes.TEXT,
  },
  family_name: {
    type: DataTypes.STRING(100),
  },
  family_code: {
    type: DataTypes.STRING(100),
  },
  is_enterprise: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  variant_name: {
    type: DataTypes.STRING(100),
  },
  option_name: {
    type: DataTypes.STRING(100),
  },
  sort_order: { 
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Urutan tampilan produk',
  },
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
  // Definisi Index Tambahan untuk Optimasi Query
  indexes: [
    {
      name: 'idx_family_code',
      fields: ['family_code']
    },
    {
      name: 'idx_is_enterprise',
      fields: ['is_enterprise']
    }
  ]
});

module.exports = Product;
