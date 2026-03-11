const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');

const userLockInfo = async (idToken) => {
  const path = 'api/v8/profile-setting/get-lockunlock';
  const payload = {
    is_enterprise: false,
    lang: 'id'
  };
  
  try {
    logger.info(`[LockService] Fetching Lock-Unlock Info...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    return res;
  } catch (error) {
    logger.error(`[LockService] Error Info: ${error.message}`);
    throw error;
  }
}

const setLockUnlock = async (idToken) => {
  try {
    // 1. Ambil status saat ini
    const lockInfo = await userLockInfo(idToken);
    
    if (!lockInfo || !lockInfo.data || !lockInfo.data.balance_lock_status) {
      throw new Error("Gagal mengambil status Lock saat ini");
    }

    // 2. Tentukan Logic Toggle (Jika semua locked -> Unlock, jika ada yg kebuka -> Lock All)
    const isCurrentlyLocked = lockInfo.data.balance_lock_status.every(status => status.is_locked);
    const targetStatus = !isCurrentlyLocked;

    const path = 'api/v8/profile-setting/set-lockunlock';
    const basePayload = {
      is_enterprise: false,
      lang: 'id',
      is_locked: targetStatus
    };

    logger.info(`[LockService] Setting Lock Status to: ${targetStatus}...`);

    // 3. Eksekusi Request Paralel
    const requests = [
      sendRequestCommon(path, { ...basePayload, type: 'SMSBANK' }, idToken, 'POST'),
      sendRequestCommon(path, { ...basePayload, type: 'RBTSMS' }, idToken, 'POST'),
      sendRequestCommon(path, { ...basePayload, type: 'DATA' }, idToken, 'POST')
    ];

    const results = await Promise.all(requests);
    
    // Kembalikan status akhir sukses
    return {
      status: 'SUCCESS',
      code: '200',
      message: `Services ${targetStatus ? 'LOCKED' : 'UNLOCKED'} successfully`,
      data: {
        results: results,
        balance_lock_status: lockInfo.data.balance_lock_status // Mengembalikan status lama sebagai referensi
      }
    };

  } catch (error) {
    logger.error(`[LockService] Error Set Lock: ${error.message}`);
    throw error;
  }
}

module.exports = {
  userLockInfo,
  setLockUnlock
};
