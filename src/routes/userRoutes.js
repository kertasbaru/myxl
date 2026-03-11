const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Dashboard & Profile
router.post('/balance', userController.getBalance);
router.post('/profile', userController.getProfile);
router.post('/segments', userController.getSegments);

// Notifications
router.post('/notifications', userController.getNotifications);
router.post('/notification/read', userController.readNotification);

// Packages
router.post('/packages', userController.getPackageDetails);
router.post('/package/unsub', userController.unsubPackage);

// Lock Pulsa
router.post('/lock/info', userController.getLockInfo);
router.post('/lock/set', userController.lockUnlockSet); // NEW

module.exports = router;
