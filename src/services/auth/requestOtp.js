const { sendRequestCiam } = require('../requestClient');
const logger = require('../../utils/logger');
const helpers = require('../../utils/helpers');

/**
 * Service untuk meminta OTP Login
 * @param {string} contact Nomor HP (08xx/62xx)
 * @param {string} axFp Device Fingerprint
 * @returns {Promise<Object>} Respon dari MyXL
 */
const requestOtp = async (contact, axFp) => {
  try {
    // 1. Sanitasi Nomor HP
    const formattedContact = helpers.formatNomor(contact);

    logger.info(`[AuthService] Requesting OTP for ${formattedContact}...`);
    
    // 2. Request ke CIAM
    const response = await sendRequestCiam(
      'realms/xl-ciam/auth/otp',
      'GET',
      null, // Body null untuk GET
      {
        contact: formattedContact,
        contactType: 'SMS',
        alternateContact: 'false'
      },
      { 'Content-Type': 'application/json' },
      axFp
    );
    
    return response;

  } catch (error) {
    logger.error(`[AuthService] Error requesting OTP for ${contact}: ${error.message}`);
    // Re-throw error agar Controller bisa menangani respons HTTP yang tepat (400/500)
    throw error;
  }
};

module.exports = { requestOtp };
