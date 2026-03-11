const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Route: Request OTP
router.post('/request-otp', authController.requestOtp);

// Route: Login (Submit OTP)
router.post('/login', authController.loginSubmit);

// Route: Refresh Token
router.post('/refresh-token', authController.refreshSession);

module.exports = router;
