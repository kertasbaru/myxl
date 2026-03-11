const express = require('express');
const famplanController = require('../controllers/famplanController');

const router = express.Router();

router.post('/dashboard', famplanController.getDashboard);
router.post('/validate', famplanController.getValidation);
router.post('/add', famplanController.addMember);
router.post('/member-details', famplanController.detailQuotas);
router.post('/remove', famplanController.remove);
router.post('/set-quota', famplanController.setQuota);

module.exports = router;
