const PDFDocument = require('pdfkit');
const Submission = require('../models/submission');
const s3 = require('../config/awsConfig');
const { PassThrough } = require('stream');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper: Generate signed URL
const getSignedUrl = (key) => {
  if (!key) return null;
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Expires: 60 * 5, // 5 minutes
  });
};

// Helper function to generate annotated image with actual drawings
async function generateAnnotatedImage(imageBuffer, annotationData) {
  try {
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    
    if (annotationData && annotationData.annotations) {
      annotationData.annotations.forEach(annotation => {
        ctx.strokeStyle = annotation.color || '#ff0000';
        ctx.lineWidth = annotation.strokeWidth || 2;
        ctx.beginPath();
        
        if (annotation.type === 'rectangle') {
          ctx.rect(annotation.x, annotation.y, annotation.width, annotation.height);
        } else if (annotation.type === 'circle') {
          ctx.arc(
            annotation.x + annotation.width / 2,
            annotation.y + annotation.height / 2,
            Math.max(Math.abs(annotation.width), Math.abs(annotation.height)) / 2,
            0,
            2 * Math.PI
          );
        } else if (annotation.type === 'arrow') {
          ctx.moveTo(annotation.x, annotation.y);
          ctx.lineTo(annotation.x + annotation.width, annotation.y + annotation.height);
          const angle = Math.atan2(annotation.height, annotation.width);
          const headLength = 15;
          ctx.lineTo(
            annotation.x + annotation.width - headLength * Math.cos(angle - Math.PI/6),
            annotation.y + annotation.height - headLength * Math.sin(angle - Math.PI/6)
          );
          ctx.moveTo(annotation.x + annotation.width, annotation.y + annotation.height);
          ctx.lineTo(
            annotation.x + annotation.width - headLength * Math.cos(angle + Math.PI/6),
            annotation.y + annotation.height - headLength * Math.sin(angle + Math.PI/6)
          );
        } else if (annotation.type === 'freehand' && annotation.points) {
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
          for (let i = 1; i < annotation.points.length; i++) {
            ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
          }
        }
        ctx.stroke();
      });
    }
    return canvas.toBuffer('image/jpeg', { quality: 0.9 });
  } catch (error) {
    console.error('Error generating annotated image:', error);
    throw error;
  }
}

const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find().populate('patient', 'name email');
    const submissionsWithUrls = submissions.map(sub => {
      const obj = sub.toObject();
      obj.originalImageUrl = getSignedUrl(sub.originalImage);
      obj.annotatedImageUrl = getSignedUrl(sub.annotatedImage);
      obj.pdfReportUrl = getSignedUrl(sub.pdfReport);
      return obj;
    });
    res.json(submissionsWithUrls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('patient', 'name email');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    const submissionObj = submission.toObject();
    submissionObj.originalImageUrl = getSignedUrl(submission.originalImage);
    submissionObj.annotatedImageUrl = getSignedUrl(submission.annotatedImage);
    submissionObj.pdfReportUrl = getSignedUrl(submission.pdfReport);
    res.json(submissionObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAnnotation = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (!submission.originalImage) {
      return res.status(400).json({ error: 'Original image not found for annotation' });
    }
    const originalImage = await s3.getObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: submission.originalImage
    }).promise();
    const annotatedImageBuffer = await generateAnnotatedImage(originalImage.Body, req.body.annotationData);
    const annotatedImageKey = `annotated/${submission._id}_${Date.now()}.jpg`;
    await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: annotatedImageKey,
      Body: annotatedImageBuffer,
      ContentType: 'image/jpeg'
    }).promise();
    submission.annotationData = req.body.annotationData;
    submission.annotatedImage = annotatedImageKey;
    submission.status = 'annotated';
    await submission.save();
    res.json(submission);
  } catch (error) {
    console.error('Annotation error:', error);
    res.status(500).json({ error: 'Internal server error while saving annotations', details: error.message });
  }
};

const generatePdf = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('patient', 'name email');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'DentalVision Patient Report',
        Author: 'DentalVision Clinic',
      },
    });
    const pdfStream = new PassThrough();
    doc.pipe(pdfStream);
    doc.registerFont('Helvetica', 'Helvetica');
    doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#556B2F').text('DentalVision Clinic', 50, 30);
    doc.font('Helvetica').fontSize(12).fillColor('#5A5F4D').text('Advanced Dental Analysis Report', 50, 50);
    doc.fontSize(10).text(`Report Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 50, 70);
    doc.moveTo(50, 90).lineTo(550, 90).strokeColor('#C6D870').stroke();
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#2A2F1D').text('Patient Information', 50, 120);
    doc.moveTo(50, 140).lineTo(550, 140).strokeColor('#C6D870').stroke();
    doc.font('Helvetica').fontSize(12).fillColor('#2A2F1D');
    doc.text(`Name: ${submission.name}`, 50, 160);
    doc.text(`Patient ID: ${submission.patientId}`, 50, 180);
    doc.text(`Email: ${submission.email}`, 50, 200);
    doc.text(`Submission Date: ${new Date(submission.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 50, 220);
    doc.text(`Status: ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}`, 50, 240);
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Clinical Notes', 50, 270);
    doc.moveTo(50, 290).lineTo(550, 290).strokeColor('#C6D870').stroke();
    doc.font('Helvetica').fontSize(12);
    doc.text(submission.note || 'No clinical notes provided.', 50, 310, { width: 500, align: 'justify' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Dental Analysis', 50, 340);
    doc.moveTo(50, 360).lineTo(550, 360).strokeColor('#C6D870').stroke();
    doc.font('Helvetica').fontSize(12);
    if (submission.annotatedImage) {
      try {
        doc.text('Annotated Dental Image:', 50, 380);
        doc.moveDown();
        const imageData = await s3.getObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: submission.annotatedImage,
        }).promise();
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const maxImageHeight = 300;
        const image = await sharp(imageData.Body).metadata();
        const aspectRatio = image.width / image.height;
        let imageWidth = pageWidth;
        let imageHeight = pageWidth / aspectRatio;
        if (imageHeight > maxImageHeight) {
          imageHeight = maxImageHeight;
          imageWidth = maxImageHeight * aspectRatio;
        }
        doc.image(imageData.Body, 50, doc.y, {
          width: imageWidth,
          height: imageHeight,
          align: 'center',
        });
        if (submission.annotationData && submission.annotationData.annotations && submission.annotationData.annotations.length > 0) {
          const startY = doc.y + imageHeight + 20;
          doc.font('Helvetica-Bold').fontSize(14).text('Doctor\'s Observations', 50, startY);
          doc.moveTo(50, startY + 25).lineTo(550, startY + 25).strokeColor('#C6D870').stroke();
          doc.font('Helvetica').fontSize(12).fillColor('#2A2F1D');
          submission.annotationData.annotations.forEach((annotation, index) => {
            if (annotation.description && annotation.description.trim()) {
              const observationText = `${index + 1}. ${annotation.description.trim()}.`;
              doc.text(observationText, 60, startY + 30 + (index * 20), { width: 480, align: 'justify' });
            }
          });
        }
      } catch (imageError) {
        console.error('Error adding annotated image to PDF:', imageError);
        doc.font('Helvetica').fontSize(12).fillColor('#2A2F1D').text('Note: Could not include annotated image in this report.', 50, doc.y + 20);
      }
    } else {
      doc.text('No annotated image available for this report.', 50, doc.y + 20);
    }
    doc.on('pageAdded', () => {
      const pageHeight = doc.page.height - doc.page.margins.bottom;
      doc.font('Helvetica').fontSize(10).fillColor('#5A5F4D');
      doc.text('DentalVision Clinic | 123 Health St, Medical City | contact@dentalvision.com', 50, pageHeight - 20, { align: 'center' });
      doc.text(`Page ${doc.page.number}`, 500, pageHeight - 20, { align: 'right' });
    });
    doc.end();
    const pdfKey = `reports/${submission._id}.pdf`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: pdfKey,
      Body: pdfStream,
      ContentType: 'application/pdf',
    };
    const uploadResult = await s3.upload(uploadParams).promise();
    submission.pdfReport = pdfKey;
    submission.status = 'reported';
    await submission.save();
    res.json({
      message: 'PDF report generated successfully',
      pdfUrl: uploadResult.Location,
      submissionId: submission._id,
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Internal server error while generating PDF', details: error.message });
  }
};

const resendReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('patient', 'email');
    if (!submission || !submission.pdfReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const reportUrl = getSignedUrl(submission.pdfReport);
    res.json({
      message: 'Report sent to patient',
      reportUrl: reportUrl,
      patientEmail: submission.patient.email,
    });
  } catch (error) {
    console.error('Error resending report:', error);
    res.status(500).json({ error: 'Internal server error while resending report', details: error.message });
  }
};

module.exports = {
  getAllSubmissions,
  getSubmission,
  updateAnnotation,
  generatePdf,
  resendReport,
  requireAdmin,
};