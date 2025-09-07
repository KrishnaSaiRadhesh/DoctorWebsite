const PDFDocument = require('pdfkit');
const fs = require('fs');

const generatePDF = (submission, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);

    doc.fontSize(20).text('OralVis Healthcare Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Patient Name: ${submission.name}`);
    doc.text(`Patient ID: ${submission.patientId}`);
    doc.text(`Email: ${submission.email}`);
    doc.text(`Date: ${submission.createdAt.toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Notes: ${submission.note}`);
    
    if (submission.annotatedImage) {
      doc.moveDown();
      doc.text('Annotated Image:');
      doc.image(submission.annotatedImage, {
        fit: [500, 300],
        align: 'center'
      });
    }
    
    doc.end();
    
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};

module.exports = { generatePDF };