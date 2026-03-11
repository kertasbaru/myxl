const express = require('express');
const circleController = require('../controllers/circleController');

const router = express.Router();

router.post('/status', circleController.status);
router.post('/group', circleController.groupInfo);
router.post('/validate', circleController.validate);
router.post('/invite', circleController.invite);
router.post('/accept', circleController.accept);
router.post('/remove', circleController.remove);

// Bonus Circle
router.post('/bonus', circleController.bonus);
router.post('/redeem-bonus', circleController.redeemBonus);

module.exports = router;
