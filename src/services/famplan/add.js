const { sendRequestCommon } = require('../requestClient');
const logger = require('../../utils/logger');
const { getFamDashboard } = require('./dashboard');

const addMember = async (idToken, slotId, parentAlias, memberAlias, msisdn) => {
    try {
        // 1. Ambil Dashboard untuk cek Slot
        const dashboard = await getFamDashboard(idToken);

        // Cari slot kosong atau slot yang sesuai
        const memberSlot = dashboard.members.find((p) => p.slot_id === slotId);

        if (!memberSlot) {
            throw new Error(`Slot ID ${slotId} not found or invalid`);
        }
        
        // Opsional: Cek apakah slot sudah terisi?
        // if (memberSlot.msisdn) { throw new Error("Slot is already occupied"); }

        logger.info(`[FamAdd] Adding ${msisdn} to Slot ${slotId}...`);

        const path = 'sharings/api/v8/family-plan/change-member';
        const payload = {
            is_enterprise: false,
            lang: 'id',
            slot_id: slotId,
            family_member_id: memberSlot.family_member_id,
            parent_alias: parentAlias,
            alias: memberAlias,
            msisdn: msisdn
        };

        const res = await sendRequestCommon(path, payload, idToken, 'POST');
        
        if (res.status !== 'SUCCESS') {
            throw new Error(res.message || "Failed to add member");
        }
        
        return res;

    } catch (err) {
        logger.error(`[FamAdd] Error: ${err.message}`);
        throw err;
    }
};

module.exports = addMember;
