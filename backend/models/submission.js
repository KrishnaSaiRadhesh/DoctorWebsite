const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  patientId: { type: String}, 
  email: { type: String, required: true },
  note: { type: String },
  originalImage: { type: String, required: true },
  annotatedImage: { type: String },
  annotationData: { type: Object },
  pdfReport: { type: String },
  status: { 
    type: String, 
    enum: ['uploaded', 'annotated', 'reported'], 
    default: 'uploaded' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);