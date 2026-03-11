const { fakerID_ID } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const QRCode = require('qrcode');

const helpers = {
  /**
   * Format nomor HP ke format 628xxx
   * @param {string|number} n 
   * @returns {string}
   */
  formatNomor: (n) => {
    if (!n) return '';

    let clean = n.toString().replace(/[^0-9]/g, ''); // Hanya ambil angka

    if (clean.startsWith('0')) {
      return '62' + clean.slice(1);
    }

    if (clean.startsWith('8')) {
      return '62' + clean;
    }

    if (clean.startsWith('62')) {
      return clean;
    }

    // Jika format tidak dikenal, kembalikan apa adanya atau handle error
    return clean;
  },

  /**
   * Format bytes ke unit yang mudah dibaca (KB, MB, GB)
   * @param {number} bytes 
   * @param {number} decimals 
   * @returns {string}
   */
  formatBytes: (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  /**
   * Konversi GB ke Bytes
   * @param {number} gb 
   * @returns {number}
   */
  gbToBytes: (gb) => {
    return Math.round(gb * Math.pow(1024, 3));
  },
  
  encodeToBase64: (str) => {
    return Buffer.from(str).toString('base64');
  },

  /**
   * Generate Nama Acak (Indonesia)
   * @returns {string}
   */
  randomName: () => {
    if (fakerID_ID && fakerID_ID.person) {
      return fakerID_ID.person.fullName(); // Menggunakan Full Name agar lebih realistik
    }
    return 'Pengguna Tanpa Nama';
  },

  /**
   * Generate Integer Acak antara min dan max
   * @param {number} min 
   * @param {number} max 
   * @returns {number}
   */
  randomInt: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate UUID v4
   * @returns {string}
   */
  generateUUID: () => {
    return uuidv4();
  },

  /**
   * Delay eksekusi (Async Sleep)
   * @param {number} ms 
   * @returns {Promise<void>}
   */
  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Helper Hashing MD5 (Sering digunakan untuk Signature API)
   * @param {string} text 
   * @returns {string}
   */
  md5: (text) => {
    return CryptoJS.MD5(text).toString();
  },

  /**
   * Cek apakah string adalah JSON valid
   * @param {string} str 
   * @returns {boolean}
   */
  isValidJSON: (str) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },

  /**
   * Generate Base64 QR Code dari string
   * @param {string} text 
   * @returns {Promise<string>}
   */
  generateBase64QR: async (text) => {
    try {
      const url = await QRCode.toDataURL(text, {
        type: 'png',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return url.split(',')[1];
    } catch (error) {
      console.error('[Helpers] QR Gen Error:', error);
      throw error;
    }
  }
};

module.exports = helpers;
