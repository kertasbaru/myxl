const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

router.post('/payment-methods', purchaseController.paymentMethods);
router.post('/balance', purchaseController.balance);
router.post('/qris', purchaseController.qris);

module.exports = router;
