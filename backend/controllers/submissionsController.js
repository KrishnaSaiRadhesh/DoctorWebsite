const Submission = require('../models/submission');
const auth = require('../middleware/auth');
const s3 = require('../config/awsConfig');
const { v4: uuidv4 } = require('uuid');

const uploadSubmission = async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, email, note, image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }
    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const fileKey = `submissions/${uuidv4()}.jpg`;
    await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: 'image/jpeg',
    }).promise();
    const patientId = `PAT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const submission = new Submission({
      patient: req.user._id,
      name,
      patientId,
      email,
      note,
      originalImage: fileKey,
    });
    await submission.save();
    res.json(submission);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ patient: req.user._id });
    const signedSubmissions = await Promise.all(submissions.map(async (sub) => {
      let originalImageUrl = null;
      let annotatedImageUrl = null;
      let pdfReportUrl = null;
      if (sub.originalImage) {
        originalImageUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: sub.originalImage,
          Expires: 60 * 5,
        });
      }
      if (sub.annotatedImage) {
        annotatedImageUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: sub.annotatedImage,
          Expires: 60 * 5,
        });
      }
      if (sub.pdfReport) {
        pdfReportUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: sub.pdfReport,
          Expires: 60 * 5,
        });
      }
      return {
        ...sub._doc,
        originalImageUrl,
        annotatedImageUrl,
        pdfReportUrl
      };
    }));
    res.json(signedSubmissions);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: error.message });
  }
};

const downloadReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission || !submission.pdfReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const pdfObject = await s3.getObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: submission.pdfReport
    }).promise();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${submission.patientId}.pdf"`);
    res.send(pdfObject.Body);
  } catch (error) {
    console.error('Download error:', error);
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({ 
        error: 'Report not available. Please ask the admin to regenerate it.' 
      });
    }
    res.status(500).json({ error: error.message });
  }
};

const getAnnotatedImage = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (submission.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!submission || !submission.annotatedImage) {
      return res.status(404).json({ error: 'Annotated image not found' });
    }
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: submission.annotatedImage,
      Expires: 60 * 5,
    });
    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Error fetching annotated image:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadSubmission,
  getMySubmissions,
  downloadReport,
  getAnnotatedImage,
};