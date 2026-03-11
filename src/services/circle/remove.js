const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { getCircleDetails } = require('./group'); // Perbaikan Path Import

const removeMember = async (idToken, targetMsisdn) => {
  try {
    // 1. Ambil Data Group
    const group = await getCircleDetails(idToken);
    
    // 2. Cari Member yang akan dikick
    const member = group.members.find((p) => p.msisdn === targetMsisdn);
    const parent = group.members.find((p) => p.member_role === 'PARENT'); // Asumsi kita login sebagai parent/bisa akses data parent
    
    if (!member) {
      throw new Error(`Member ${targetMsisdn} not found in circle`);
    }

    if (!parent) {
      throw new Error("Parent data not found");
    }
    
    // 3. Validasi Aturan Bisnis
    if (member.member_role === 'PARENT') {
      throw new Error("Cannot remove the Parent/Owner");
    }
    
    // Cek apakah ini member terakhir selain parent
    if (group.members.length <= 2) { 
       // Logic MyXL: Biasanya butuh minimal 2 orang (Parent + 1) untuk disebut Circle?
       // Jika aturan Anda tidak boleh hapus member terakhir, biarkan ini.
       // Jika boleh kosong, hapus blok ini.
       // throw new Error("Cannot remove the last member");
    }
    
    // 4. Eksekusi Remove
    const path = 'family-hub/api/v8/members/remove';
    const payload = {
      is_enterprise: false,
      lang: 'id',
      is_last_member: false, // Set true jika member terakhir (logic frontend MyXL biasanya menghitung ini)
      group_id: group.group_id,
      member_id_parent: parent.member_id,
      member_id: member.member_id
    };
    
    logger.info(`[CircleRemove] Removing ${targetMsisdn}...`);
    const res = await sendRequestCommon(path, payload, idToken, 'POST');
    
    if (res.status !== 'SUCCESS') {
      throw new Error(res.message || "Failed to remove member");
    }
    
    return {
      success: true,
      msisdn: targetMsisdn,
      message: res.data.message
    };

  } catch (err) {
    logger.error(`[CircleRemove] Error: ${err.message}`);
    throw err;
  }
};

module.exports = removeMember;
