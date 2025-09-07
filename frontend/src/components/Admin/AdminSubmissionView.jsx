import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Save, Download, RotateCcw, Send, User, Mail, Calendar, Clock, AlertCircle } from 'lucide-react';

const colors = {
  primary: '#556B2F',   
  secondary: '#8FA31E',
  accent: '#C6D870',     
  background: '#EFF5D2', 
  text: '#2A2F1D',       
  textLight: '#5A5F4D',  
};

const AdminSubmissionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [downloading, setDownloading] = useState(false); 
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [currentTool, setCurrentTool] = useState('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [description, setDescription] = useState('');

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    try {
      setError(null);
      setImageError(false);
      const response = await axios.get(`/admin/submissions/${id}`);
      setSubmission(response.data);
      if (response.data.annotationData) {
        setAnnotations(response.data.annotationData.annotations || []);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      setError('Failed to fetch submission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (e) => {
    const img = e.target;

    if (canvasRef.current && containerRef.current) {
      const container = containerRef.current;

      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;

      canvasRef.current.width = displayWidth;
      canvasRef.current.height = displayHeight;

      setImageDimensions({ width: displayWidth, height: displayHeight });

      drawAnnotations();
    }
  };

  const drawAnnotations = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    annotations.forEach((annotation, index) => {
      ctx.strokeStyle = annotation.color || colors.primary;
      ctx.lineWidth = annotation.strokeWidth || 3;
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
        ctx.lineTo(
          annotation.x + annotation.width - 10 * Math.cos(angle - Math.PI/6),
          annotation.y + annotation.height - 10 * Math.sin(angle - Math.PI/6)
        );
        ctx.moveTo(annotation.x + annotation.width, annotation.y + annotation.height);
        ctx.lineTo(
          annotation.x + annotation.width - 10 * Math.cos(angle + Math.PI/6),
          annotation.y + annotation.height - 10 * Math.sin(angle + Math.PI/6)
        );
      } else if (annotation.type === 'freehand' && annotation.points) {
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
        for (let i = 1; i < annotation.points.length; i++) {
          ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
      }
      
      ctx.stroke();

      // Highlight selected annotation
      if (selectedAnnotation === annotation) {
        ctx.strokeStyle = '#FF0000'; // Red outline for selected annotation
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    drawAnnotations();
  }, [annotations, selectedAnnotation]);

  const getCanvasCoordinates = (clientX, clientY) => {
    if (!canvasRef.current || !containerRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (submission?.status === 'reported') return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setSelectedAnnotation(null); 
    setDescription('');

    if (currentTool === 'freehand') {
      setAnnotations([...annotations, {
        type: 'freehand',
        points: [{ x, y }],
        color: colors.primary,
        strokeWidth: 3,
        description: ''
      }]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    if (currentTool === 'freehand') {
      const lastAnnotation = annotations[annotations.length - 1];
      if (lastAnnotation && lastAnnotation.type === 'freehand') {
        const updatedAnnotations = [...annotations];
        updatedAnnotations[updatedAnnotations.length - 1] = {
          ...lastAnnotation,
          points: [...lastAnnotation.points, { x, y }]
        };
        setAnnotations(updatedAnnotations);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const width = x - startPos.x;
    const height = y - startPos.y;

    if (currentTool !== 'freehand') {
      const newAnnotation = {
        type: currentTool,
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        color: colors.primary,
        strokeWidth: 3,
        description: '' 
      };
      setAnnotations([...annotations, newAnnotation]);
      setSelectedAnnotation(newAnnotation); 
    }

    setIsDrawing(false);
  };

  const handleCanvasClick = (e) => {
    if (submission?.status === 'reported') return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    // Check if click is within any annotation
    const clickedAnnotation = annotations.find(annotation => {
      if (annotation.type === 'rectangle') {
        return x >= annotation.x && x <= annotation.x + annotation.width &&
               y >= annotation.y && y <= annotation.y + annotation.height;
      } else if (annotation.type === 'circle') {
        const centerX = annotation.x + annotation.width / 2;
        const centerY = annotation.y + annotation.height / 2;
        const radius = Math.max(Math.abs(annotation.width), Math.abs(annotation.height)) / 2;
        return Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) <= radius;
      } else if (annotation.type === 'arrow') {
        // Simplified check for arrow (check along the line)
        const angle = Math.atan2(annotation.height, annotation.width);
        const length = Math.sqrt(annotation.width ** 2 + annotation.height ** 2);
        const dist = Math.abs((y - annotation.y) * Math.cos(angle) - (x - annotation.x) * Math.sin(angle)) / length;
        return dist <= 10; // Tolerance of 10 pixels
      } else if (annotation.type === 'freehand' && annotation.points) {
        for (let i = 0; i < annotation.points.length - 1; i++) {
          const p1 = annotation.points[i];
          const p2 = annotation.points[i + 1];
          const dist = Math.abs((y - p1.y) * (p2.x - p1.x) - (x - p1.x) * (p2.y - p1.y)) / 
                       Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          if (dist <= 10) return true;
        }
        return false;
      }
      return false;
    });

    if (clickedAnnotation) {
      setSelectedAnnotation(clickedAnnotation);
      setDescription(clickedAnnotation.description || '');
    } else {
      setSelectedAnnotation(null);
      setDescription('');
    }
  };

  const handleDescriptionSubmit = () => {
    if (selectedAnnotation && description.trim()) {
      const updatedAnnotations = annotations.map(ann =>
        ann === selectedAnnotation ? { ...ann, description: description.trim() } : ann
      );
      setAnnotations(updatedAnnotations);
      setSelectedAnnotation(null);
      setDescription('');
    } else if (selectedAnnotation) {
      setSelectedAnnotation(null);
      setDescription('');
    }
  };

  const saveAnnotations = async () => {
    setSaving(true);
    setError(null);
    try {
      const annotationData = {
        annotations,
        createdAt: new Date().toISOString()
      };
      console.log('Sending annotation data:', annotationData);
      const response = await axios.put(`/admin/annotate/${id}`, {
        annotationData
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Save response:', response.data);
      await fetchSubmission();
    } catch (error) {
      console.error('Error saving annotations:', error.response ? error.response.data : error.message);
      setError(error.response?.data?.error || 'Failed to save annotations. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    setSelectedAnnotation(null);
    setDescription('');
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    setError(null);
    try {
      await axios.post(`/admin/generate-pdf/${id}`);
      await fetchSubmission();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const resendReport = async () => {
    setSendingReport(true);
    setError(null);
    try {
      const response = await axios.post(`/admin/resend-report/${id}`);
      toast.success(`Report successfully sent to ${response.data.patientEmail}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    } catch (error) {
      console.error('Error resending report:', error);
      toast.error('Failed to resend report. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      setError('Failed to resend report. Please try again.');
    } finally {
      setSendingReport(false);
    }
  };

  const downloadReport = async () => {
    try {
      setError(null);
      setDownloading(true); 
      
      await axios.post(`/admin/generate-pdf/${id}`);
      
      const response = await axios.get(`/submissions/report/${id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dental-report-${submission.patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported':
        return `bg-[${colors.primary}20] text-[${colors.primary}]`;
      case 'annotated':
        return `bg-[${colors.secondary}20] text-[${colors.secondary}]`;
      case 'uploaded':
        return `bg-[${colors.accent}20] text-[${colors.accent}]`;
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.text }}>Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Submission not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      <ToastContainer />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center transition-colors duration-200"
            style={{ color: colors.primary }}
            aria-label="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submission.status)}`}>
              Status: {submission.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl p-4 flex items-center" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              &times;
            </button>
          </div>
        )}

        {/* Patient Info */}
        <div className="rounded-2xl border p-6 mb-8" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>Patient Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textLight }}>
                <User className="w-4 h-4 inline mr-2" />
                Name
              </label>
              <p className="text-sm" style={{ color: colors.text }}>{submission.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textLight }}>
                Patient ID
              </label>
              <p className="text-sm" style={{ color: colors.text }}>{submission.patientId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textLight }}>
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <p className="text-sm" style={{ color: colors.text }}>{submission.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textLight }}>
                <Calendar className="w-4 h-4 inline mr-2" />
                Upload Date
              </label>
              <p className="text-sm" style={{ color: colors.text }}>
                {new Date(submission.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {submission.note && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textLight }}>
                Notes
              </label>
              <p className="text-sm p-4 rounded-xl" style={{ backgroundColor: colors.background, color: colors.text }}>
                {submission.note}
              </p>
            </div>
          )}
        </div>

        {/* Annotation Tools */}
        <div className="rounded-2xl border p-6 mb-8" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: colors.text }}>Annotation Tools</h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            {['rectangle', 'circle', 'arrow', 'freehand'].map((tool) => (
              <button
                key={tool}
                onClick={() => setCurrentTool(tool)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors duration-200 ${
                  currentTool === tool
                    ? 'text-white' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                style={currentTool === tool ? { backgroundColor: colors.primary, borderColor: colors.primary } : {}}
                aria-label={`Select ${tool} tool`}
              >
                {tool.charAt(0).toUpperCase() + tool.slice(1)}
              </button>
            ))}
            
            <button
              onClick={clearAnnotations}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center text-sm font-medium transition-colors duration-200"
              aria-label="Clear annotations"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </button>
          </div>

          {/* Image and Canvas Area */}
          <div 
            ref={containerRef}
            className="relative border-2 rounded-xl overflow-hidden flex justify-center items-center min-h-[400px] mb-6"
            style={{ borderColor: colors.accent, backgroundColor: colors.background }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick} // Add click event to select annotations
          >
            {imageError ? (
              <div className="flex items-center justify-center h-64 text-red-600">
                Failed to load image
              </div>
            ) : (
              <>
                <img
                  ref={imageRef}
                  src={submission.originalImageUrl}
                  alt="Patient's dental photo"
                  className="max-w-full max-h-[600px] object-contain"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{ display: 'block' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ 
                    cursor: isDrawing ? 'crosshair' : 'default',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                  className="bg-transparent"
                />
              </>
            )}
          </div>

          {/* Description Text Area */}
          {selectedAnnotation && (
            <div className="my-4 p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${colors.accent}` }}>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textLight }}>
                Annotation Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded-md text-sm resize-y"
                style={{ borderColor: colors.accent, color: colors.text, minHeight: '100px' }}
                placeholder="Enter description (e.g., 'Cavity detected', multi-line supported)"
              />
              <button
                onClick={handleDescriptionSubmit}
                className="mt-2 px-4 py-2 text-white rounded-md hover:opacity-90 flex items-center text-sm font-medium transition-all duration-300"
                style={{ backgroundColor: colors.primary }}
                aria-label="Submit description"
              >
                Submit
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={saveAnnotations}
              disabled={saving || annotations.length === 0 || submission.status === 'reported'}
              className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-all duration-300"
              style={{ backgroundColor: colors.primary }}
              aria-label="Save annotations"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Annotations'}
            </button>

            {submission.status === 'annotated' && (
              <button
                onClick={generatePdf}
                disabled={generatingPdf}
                className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-all duration-300"
                style={{ backgroundColor: colors.secondary }}
                aria-label="Generate PDF report"
              >
                <Download className="w-4 h-4 mr-2" />
                {generatingPdf ? 'Generating...' : 'Generate PDF Report'}
              </button>
            )}

            {submission.status === 'reported' && submission.pdfReport && (
              <>
                <button
                  onClick={downloadReport}
                  disabled={downloading}
                  className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-all duration-300"
                  style={{ backgroundColor: colors.primary }}
                  aria-label="Download report"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? 'Downloading...' : 'Download Report'}
                </button>
                
                <button
                  onClick={resendReport}
                  disabled={sendingReport}
                  className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-all duration-300"
                  style={{ backgroundColor: colors.secondary }}
                  aria-label="Resend report to patient"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingReport ? 'Sending...' : 'Resend to Patient'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSubmissionView;