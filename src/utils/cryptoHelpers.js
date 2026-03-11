const crypto = require('crypto');
const config = require('../config/config');
const helpers = require('../utils/helpers');

// Destructuring keys dari config
const {
  xDataKey,
  axApiSigKey,
  xApiBaseSecret,
  circleMsisdnKey,
  axFpKey
} = config.myxl.security;

// Konstanta Salt (Protocol Specific)
const X_SECRET_SALT = "#ae-hei_9Tee6he+Ik3Gais5=";

// ==========================================
// 1. BASE HELPERS
// ==========================================

/**
 * Konversi Buffer ke URL Safe Base64
 * @param {Buffer} buffer 
 * @returns {string}
 */
const toUrlSafeB64 = (buffer) => {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

/**
 * Konversi Buffer ke Standard Base64
 * @param {Buffer} buffer 
 * @returns {string}
 */
const toStdB64 = (buffer) => {
  return buffer.toString('base64');
};

/**
 * Konversi URL Safe Base64 string kembali ke Buffer
 * @param {string} str 
 * @returns {Buffer}
 */
const fromUrlSafeB64 = (str) => {
  if (!str) return Buffer.from('');
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if missing
  while (b64.length % 4) {
    b64 += '=';
  }
  return Buffer.from(b64, 'base64');
};

/**
 * Menentukan algoritma AES berdasarkan panjang key
 * @param {string} key 
 * @returns {string} 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc'
 */
const getAesAlgo = (key) => {
  if (!key) throw new Error('Encryption key is missing/undefined');
  const len = Buffer.from(key).length;
  if (len === 16) return 'aes-128-cbc';
  if (len === 24) return 'aes-192-cbc';
  if (len === 32) return 'aes-256-cbc';
  throw new Error(`Invalid key length: ${len}. Must be 16, 24, or 32 bytes.`);
};

/**
 * Generate secure random integer
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
const getRandomInt = (min, max) => {
  return crypto.randomInt(min, max + 1);
};

// ==========================================
// 2. TIMESTAMP HELPERS
// ==========================================

/**
 * Membuat Timestamp format Java/Android (UTC+8)
 * Format: YYYY-MM-DDTHH:mm:ss.SSS+0800
 * @param {Date|string|number} [dateInput] 
 * @returns {string}
 */
const getJavaLikeTimestamp = (dateInput) => {
  const now = dateInput ? new Date(dateInput) : new Date();
  
  // Hardcode offset +7 jam (WIB - Western Indonesia Time) sesuai logic aplikasi asli
  const offsetHours = 7;
  const gmt7Time = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000));
  
  const pad = (n) => n.toString().padStart(2, '0');
  const pad3 = (n) => n.toString().padStart(3, '0');

  const year = gmt7Time.getUTCFullYear();
  const month = pad(gmt7Time.getUTCMonth() + 1);
  const date = pad(gmt7Time.getUTCDate());
  const hours = pad(gmt7Time.getUTCHours());
  const minutes = pad(gmt7Time.getUTCMinutes());
  const seconds = pad(gmt7Time.getUTCSeconds());
  
  const ms3 = pad3(gmt7Time.getUTCMilliseconds());

  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}.${ms3}+0700`;
};

/**
 * Alias untuk getJavaLikeTimestamp (Backward Compatibility)
 */
const getTsGmt7 = (dateInput) => {
  return getJavaLikeTimestamp(dateInput);
};

// ==========================================
// 3. CORE ENCRYPTION & BUILDERS
// ==========================================

/**
 * Derive IV dari timestamp (SHA256 -> 16 bytes)
 * @param {number} xtimeMs 
 * @returns {Buffer}
 */
const deriveIv = (xtimeMs) => {
  const hash = crypto.createHash('sha256').update(String(xtimeMs)).digest('hex');
  return Buffer.from(hash.substring(0, 16), 'utf-8');
};

/**
 * Membuat HMAC-SHA512 Signature
 * @param {string} keyStr 
 * @param {string} msgStr 
 * @returns {string} Hex string
 */
const makeHmacSha512 = (keyStr, msgStr) => {
  const hmac = crypto.createHmac('sha512', Buffer.from(keyStr, 'utf-8'));
  hmac.update(Buffer.from(msgStr, 'utf-8'));
  return hmac.digest('hex');
};

/**
 * Encrypt Payload untuk X-DATA header
 */
const encryptXData = (payload, method, path, idToken) => {
  const xtime = Date.now();
  const sigTimeSec = Math.floor(xtime / 1000);
  const plainBody = JSON.stringify(payload);

  const iv = deriveIv(xtime);
  const key = xDataKey;
  const cipher = crypto.createCipheriv(getAesAlgo(key), Buffer.from(key), iv);
  
  let encrypted = cipher.update(plainBody, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const xdata = toUrlSafeB64(encrypted);

  const keyStr = `${xApiBaseSecret};${idToken};${method};${path};${sigTimeSec}`;
  const msg = `${idToken};${sigTimeSec};`;
  const xSig = makeHmacSha512(keyStr, msg);

  return {
    x_signature: xSig,
    encrypted_body: {
      xdata: xdata,
      xtime: xtime
    }
  };
};

/**
 * Decrypt Payload dari Response X-DATA
 */
const decryptXData = (encryptedPayload) => {
  if (!encryptedPayload || !encryptedPayload.xdata || !encryptedPayload.xtime) {
    throw new Error("Invalid encrypted data format from Upstream");
  }

  const { xdata, xtime } = encryptedPayload;

  const iv = deriveIv(xtime);
  const key = xDataKey;
  
  const encryptedBuffer = fromUrlSafeB64(xdata);
  const decipher = crypto.createDecipheriv(getAesAlgo(key), Buffer.from(key), iv);

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return JSON.parse(decrypted.toString('utf8'));
};

/**
 * Build Encrypted Field (Random IV appended to ciphertext)
 */
const buildEncryptedField = (ivHex16 = null, urlsafeB64 = false) => {
  const key = circleMsisdnKey;
  
  // Use crypto.randomBytes instead of Math.random
  const ivHex = ivHex16 || crypto.randomBytes(8).toString('hex');
  const iv = Buffer.from(ivHex, 'ascii'); 
  const blockSize = 16;
  const pt = Buffer.alloc(blockSize, blockSize); // Padding Block

  const cipher = crypto.createCipheriv(getAesAlgo(key), Buffer.from(key, 'ascii'), iv);
  cipher.setAutoPadding(false); // pt sudah ter-pad manual, jangan double-pad
  
  let encrypted = cipher.update(pt);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const b64Str = urlsafeB64 ? toUrlSafeB64(encrypted) : toStdB64(encrypted);

  return b64Str + ivHex;
};

// ==========================================
// 4. SIGNATURE GENERATORS
// ==========================================

const makeXSignaturePayment = (accessToken, sigTimeSec, packageCode, tokenPayment, paymentMethod, paymentFor, path) => {
  const keyStr = `${xApiBaseSecret};${sigTimeSec}${X_SECRET_SALT};POST;${path};${sigTimeSec}`;
  const msg = `${accessToken};${tokenPayment};${sigTimeSec};${paymentFor};${paymentMethod};${packageCode};`;
  return makeHmacSha512(keyStr, msg);
};

const makeXSignatureBounty = (accessToken, sigTimeSec, packageCode, tokenPayment) => {
  const path = "api/v8/personalization/bounties-exchange";
  const keyStr = `${xApiBaseSecret};${accessToken};${sigTimeSec}${X_SECRET_SALT};POST;${path};${sigTimeSec}`;
  const msg = `${accessToken};${tokenPayment};${sigTimeSec};${packageCode};`;
  return makeHmacSha512(keyStr, msg);
};

const makeXSignatureLoyalty = (sigTimeSec, packageCode, tokenConfirmation, path) => {
  const keyStr = `${xApiBaseSecret};${sigTimeSec}${X_SECRET_SALT};POST;${path};${sigTimeSec}`;
  const msg = `${tokenConfirmation};${sigTimeSec};${packageCode};`;
  return makeHmacSha512(keyStr, msg);
};

const makeXSignatureBountyAllotment = (sigTimeSec, packageCode, tokenConfirmation, path, destinationMsisdn) => {
  const keyStr = `${xApiBaseSecret};${sigTimeSec}${X_SECRET_SALT};${destinationMsisdn};POST;${path};${sigTimeSec}`;
  const msg = `${tokenConfirmation};${sigTimeSec};${destinationMsisdn};${packageCode};`;
  return makeHmacSha512(keyStr, msg);
};

const makeXSignatureBasic = (method, path, sigTimeSec) => {
  const keyStr = `${xApiBaseSecret};${method};${path};${sigTimeSec}`;
  const msg = `${sigTimeSec};en;`;
  return makeHmacSha512(keyStr, msg);
};

const makeAxApiSignature = (tsForSign, contact, code, contactType) => {
  const keyBytes = Buffer.from(axApiSigKey, 'ascii');
  const preimage = `${tsForSign}password${contactType}${contact}${code}openid`;
  
  const hmac = crypto.createHmac('sha256', keyBytes);
  hmac.update(Buffer.from(preimage, 'utf-8'));
  return hmac.digest('base64');
};

// ==========================================
// 5. DEVICE & IDENTITY ENCRYPTION
// ==========================================

const encryptCircleMsisdn = (msisdn) => {
  const key = circleMsisdnKey; 
  const ivHex = crypto.randomBytes(8).toString('hex'); // 16 chars
  const iv = Buffer.from(ivHex, 'ascii');

  const cipher = crypto.createCipheriv(getAesAlgo(key), Buffer.from(key, 'ascii'), iv);
  
  let encrypted = cipher.update(msisdn, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const ctB64 = toUrlSafeB64(encrypted);
  // Format: Base64(Cipher) + IV(Hex)
  return ctB64 + ivHex;
};

const decryptCircleMsisdn = (encryptedMsisdnB64) => {
  try {
    if (!encryptedMsisdnB64 || encryptedMsisdnB64.length <= 16) return "";

    const ivAscii = encryptedMsisdnB64.slice(-16);
    const b64Part = encryptedMsisdnB64.slice(0, -16);
    
    const key = circleMsisdnKey;
    const iv = Buffer.from(ivAscii, 'ascii');
    
    const cipher = crypto.createDecipheriv(getAesAlgo(key), Buffer.from(key, 'ascii'), iv);
    
    const encryptedBuffer = fromUrlSafeB64(b64Part);
    let decrypted = cipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, cipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (e) {
    // Silent fail is intended for this specific helper
    return "";
  }
};

const generateAxFp = (msisdn) => {
  const dev = {
    manufacturer: "Xiaomi",
    model: "22120RN86G",
    lang: "id",
    resolution: "720x1533",
    tz_short: "GMT08:00",
    ip: `${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}`,
    font_scale: "1.0",
    android_release: "13",
    msisdn: helpers.formatNomor(msisdn)
  };

  const fingerprintStr = `${dev.manufacturer}|${dev.model}|${dev.lang}|${dev.resolution}|${dev.tz_short}|${dev.ip}|${dev.font_scale}|Android ${dev.android_release}|${dev.msisdn}`;
  
  const key = Buffer.from(axFpKey, 'ascii');
  const iv = Buffer.alloc(16, 0); // Null IV
  
  const cipher = crypto.createCipheriv(getAesAlgo(axFpKey), key, iv);
  let encrypted = cipher.update(fingerprintStr, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return encrypted.toString('base64');
};

const getAxDeviceId = (axFp) => {
  if (!axFp) {
    throw new Error('axFp is required to generate Device ID');
  }
  return crypto.createHash('md5').update(axFp, 'utf8').digest('hex');
};

module.exports = {
  toUrlSafeB64,
  toStdB64,
  fromUrlSafeB64,
  getJavaLikeTimestamp,
  getTsGmt7,
  encryptXData,
  decryptXData,
  buildEncryptedField,
  makeXSignaturePayment,
  makeXSignatureBounty,
  makeXSignatureLoyalty,
  makeXSignatureBountyAllotment,
  makeXSignatureBasic,
  makeAxApiSignature,
  encryptCircleMsisdn,
  decryptCircleMsisdn,
  generateAxFp,
  getAxDeviceId
};
