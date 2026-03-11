const { sendRequestCiam } = require('../requestClient');
const { makeAxApiSignature, getTsGmt7 } = require('../../utils/cryptoHelpers');
const logger = require('../../utils/logger');
const helpers = require('../../utils/helpers');

/**
 * Service untuk Submit OTP (Login)
 * @param {string} contactType 'SMS' atau 'DEVICEID'
 * @param {string} contact Nomor HP atau Device ID
 * @param {string} code Kode OTP
 * @param {string} axFp Device Fingerprint
 * @returns {Promise<Object>} Token OAuth (access_token, id_token, dll)
 */
const submitOtp = async (contactType, contact, code, axFp) => {
  let finalContact = "";
  let finalCode = "";
  
  // 1. Validasi & Format Kontak
  if (contactType === 'SMS') {
    finalContact = helpers.formatNomor(contact);
    if (!finalContact) {
      throw new Error("Invalid contact number format");
    }
    finalCode = code;
  } else if (contactType === 'DEVICEID') {
    // Device ID butuh di-base64 kan untuk payload
    finalContact = Buffer.from(String(contact)).toString('base64');
    finalCode = code;
  } else {
    throw new Error(`Unsupported contact type: ${contactType}`);
  }
  
  // 2. Persiapan Timestamp & Signature
  const now = new Date();
  
  // Timestamp untuk Signature (Current Time)
  const tsForSign = getTsGmt7(now); 
  
  // Timestamp untuk Header (Mundur 5 menit untuk toleransi waktu server CIAM)
  const headerDate = new Date(now.getTime() - 5 * 60000);
  const tsHeader = getTsGmt7(headerDate); 
  
  const signature = makeAxApiSignature(tsForSign, finalContact, code, contactType);

  // 3. Persiapan Payload (x-www-form-urlencoded)
  const params = new URLSearchParams();
  params.append('contactType', contactType);
  params.append('code', finalCode);
  params.append('grant_type', 'password');
  params.append('contact', finalContact);
  params.append('scope', 'openid');

  try {
    logger.info(`[AuthService] Submitting OTP for ${contactType}...`);

    const response = await sendRequestCiam(
      'realms/xl-ciam/protocol/openid-connect/token',
      'POST',
      params.toString(),
      {}, // No query params
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Ax-Api-Signature': signature,
        'Ax-Request-At': tsHeader
      },
      axFp
    );
    
    // Cek jika response 200 OK tapi isinya error (kasus jarang di OpenID)
    if (response.error) {
      logger.error(`[AuthService] API Logic Error: ${JSON.stringify(response)}`);
      throw new Error(response.error_description || response.error);
    }

    logger.info(`[AuthService] Login successful for ${contactType}.`);
    return response;

  } catch (error) {
    logger.error(`[AuthService] Error submitting OTP: ${error.message}`);
    // Re-throw agar ditangkap Controller
    throw error;
  }
};

module.exports = { submitOtp };
