const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/submissions', adminController.getAllSubmissions);
router.get('/submissions/:id', adminController.getSubmission);
router.put('/annotate/:id', adminController.updateAnnotation);
router.post('/generate-pdf/:id', adminController.generatePdf);
router.post('/resend-report/:id', adminController.resendReport);

module.exports = router;