const express = require('express');
const storeController = require('../controllers/storeController');

const router = express.Router();

// Get Family List (Kategori Paket)
router.post('/family', storeController.storeFamily);

// Get Package by Option Code
router.post('/option-detail', storeController.storePackage);

// Get Package by Hierarchy (Family -> Variant -> Order)
router.post('/package-detail', storeController.storePackageDetail);

module.exports = router;
