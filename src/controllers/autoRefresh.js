const { refreshToken } = require('../services/auth/refreshToken');
const accountRepository = require('../repositories/accountRepository');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

const autoRefresh = async (number) => {
  try {
    const msisdn = helpers.formatNomor(number);
    
    // 1. Ambil User dari DB
    const user = await accountRepository.findByNumber(msisdn);
    
    if (!user || !user.refresh_token) {
      logger.warn(`[AutoRefresh] User ${msisdn} not found or not logged in.`);
      return null;
    }
    
    // 2. Cek Expiry (Menggunakan Milliseconds sesuai Model DB)
    const currentTimeMs = Date.now();
    const tokenExpiryMs = parseInt(user.expired_token) || 0;
    
    // Buffer 5 menit (300.000 ms) sebelum expired
    const bufferTime = 5 * 60 * 1000; 

    // Jika Token Masih Valid (> 5 menit sisa)
    if (currentTimeMs < (tokenExpiryMs - bufferTime)) {
       return {
         access_token: user.access_token,
         refresh_token: user.refresh_token,
         id_token: user.id_token
       };
    }

    logger.info(`[AutoRefresh] Token expired or near expiry for ${msisdn}. Refreshing...`);
    
    // 3. Lakukan Refresh Token
    const response = await refreshToken(
      user.refresh_token, 
      user.subscriber_id, 
      user.ax_fp
    );
    
    if (!response || !response.access_token) {
      logger.error(`[AutoRefresh] Failed to refresh token for ${msisdn}`);
      return null;
    }
    
    // 4. Hitung Expiry Baru (Current Time + expires_in seconds * 1000)
    const newExpiredTokenMs = Date.now() + (response.expires_in * 1000);

    // 5. Update Database
    await accountRepository.updateTokens(msisdn, {
      access_token: response.access_token,
      refresh_token: response.refresh_token || user.refresh_token, // Pakai lama jika API tidak kirim baru
      id_token: response.id_token,
      expires_in: response.expires_in,
      refresh_expires_in: response.refresh_expires_in,
      expired_token: newExpiredTokenMs
    });
    
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      id_token: response.id_token
    };

  } catch (err) {
    logger.error(`[AutoRefresh] Error: ${err.message}`);
    return null;
  }
}

module.exports = autoRefresh;
