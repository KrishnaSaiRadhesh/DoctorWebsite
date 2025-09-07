const express = require('express');
const router = express.Router();
const submissionsController = require('../controllers/submissionsController');

router.post('/upload', submissionsController.uploadSubmission);
router.get('/my-submissions', submissionsController.getMySubmissions);
router.get('/report/:id', submissionsController.downloadReport);
router.get('/annotated-image/:id', submissionsController.getAnnotatedImage);

module.exports = router;