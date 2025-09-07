import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { Upload, Download, Eye, Calendar,User,Mail,FileText,ImageIcon,Clock,AlertCircle,CheckCircle,XCircle,Plus,Sparkles,
  X,Loader,Leaf,LogOut} from 'lucide-react';


const colors = {
  primary: '#556B2F',    
  secondary: '#8FA31E',  
  accent: '#C6D870',     
  background: '#EFF5D2', 
  text: '#2A2F1D',       
  textLight: '#5A5F4D',  
};

const PatientDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('submissions');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate(); 

  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setError(null);
      const response = await axios.get("/submissions/my-submissions");
      setSubmissions(response.data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setError("Failed to fetch submissions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout'); 
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token'); 
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization']; 
      navigate('/login'); 
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;


    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const simulateUploadProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 100);
    return interval;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError("Please select an image file first");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const progressInterval = simulateUploadProgress();

    const toBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

    try {
      const base64Image = await toBase64(selectedFile);

      await axios.post("/submissions/upload", {
        name: e.target.name.value,
        email: e.target.email.value,
        note: e.target.note.value,
        image: base64Image,
      });

      setSuccess("Dental image uploaded successfully! Analysis in progress.");
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      await fetchSubmissions();
      e.target.reset();
    } catch (error) {
      console.error("Upload failed:", error);
      setError(error.response?.data?.error || "Upload failed. Please try again.");
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
    }
  };

  const downloadReport = async (submissionId, patientId) => {
    try {
      setError(null);
      const response = await axios.get(`/submissions/report/${submissionId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `dental-report-${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Download failed:", error);
      setError(error.response?.data?.error || "Download failed. Please try again.");
    }
  };

  const viewAnnotatedImage = async (submissionId) => {
    try {
      setError(null);
      const response = await axios.get(`/submissions/annotated-image/${submissionId}`);
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error("Error viewing annotated image:", error);
      setError(error.response?.data?.error || "Failed to view annotated image. Please try again.");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reported':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'annotated':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'uploaded':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported':
        return 'bg-green-100 text-green-800';
      case 'annotated':
        return 'bg-amber-100 text-amber-800';
      case 'uploaded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.text }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Header */}
     <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl mb-4" style={{ backgroundColor: colors.primary }}>
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>
              DentalVision Portal
            </h1>
            <p style={{ color: colors.textLight }}>
              Advanced dental analysis and visualization platform
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-md"
            style={{ backgroundColor: colors.secondary, color: 'white' }}
            title="Log out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}>
                <FileText className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>Total Submissions</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>{submissions.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.secondary}20` }}>
                <CheckCircle className="w-6 h-6" style={{ color: colors.secondary }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>Completed Reports</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>
                  {submissions.filter(s => s.status === 'reported').length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.accent}20` }}>
                <Clock className="w-6 h-6" style={{ color: colors.accent }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>In Progress</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>
                  {submissions.filter(s => s.status !== 'reported').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-8 rounded-2xl p-2 w-fit mx-auto" style={{ backgroundColor: `${colors.primary}10` }}>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'submissions' 
                ? 'text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === 'submissions' ? { backgroundColor: colors.primary } : {}}
          >
            My Submissions
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'upload' 
                ? 'text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === 'upload' ? { backgroundColor: colors.primary } : {}}
          >
            New Analysis
          </button>
        </div>

        {/* Notifications */}
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

        {success && (
          <div className="mb-6 rounded-2xl p-4 flex items-center" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <p className="text-green-700">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              &times;
            </button>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'upload' ? (
          <div className="rounded-2xl border p-8 mb-8" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center mb-8">
              <div className="p-3 rounded-xl" style={{ backgroundColor: colors.primary }}>
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold ml-4" style={{ color: colors.text }}>New Dental Analysis</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
                    <User className="w-4 h-4 inline mr-2" style={{ color: colors.primary }} />
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    style={{ borderColor: colors.accent }}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
                    <Mail className="w-4 h-4 inline mr-2" style={{ color: colors.secondary }} />
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    style={{ borderColor: colors.accent }}
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
                  <FileText className="w-4 h-4 inline mr-2" style={{ color: colors.accent }} />
                  Clinical Notes (Optional)
                </label>
                <textarea
                  name="note"
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  style={{ borderColor: colors.accent }}
                  placeholder="Describe your dental concerns or symptoms..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
                  <ImageIcon className="w-4 h-4 inline mr-2" style={{ color: colors.primary }} />
                  Upload Dental Image
                </label>
                
                {!selectedFile ? (
                  <div className="border-2 border-dashed rounded-2xl p-8 text-center transition-colors" style={{ borderColor: colors.accent, backgroundColor: `${colors.background}80` }}>
                    <input
                      name="image"
                      type="file"
                      accept="image/*"
                      required
                      className="hidden"
                      id="file-upload"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer block"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-3 rounded-full mb-4" style={{ backgroundColor: `${colors.primary}20` }}>
                          <Upload className="w-6 h-6" style={{ color: colors.primary }} />
                        </div>
                        <p className="font-medium" style={{ color: colors.text }}>
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm mt-2" style={{ color: colors.textLight }}>
                          PNG, JPG, JPEG up to 5MB
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Image Preview */}
                    <div className="border rounded-2xl p-4" style={{ borderColor: colors.accent, backgroundColor: `${colors.background}80` }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium" style={{ color: colors.text }}>
                          Selected Image
                        </span>
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: colors.accent }}>
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
                            {selectedFile.name}
                          </p>
                          <p className="text-xs" style={{ color: colors.textLight }}>
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          
                          {/* Upload Progress Bar */}
                          {uploading && (
                            <div className="mt-2">
                              <div className="w-full rounded-full h-2" style={{ backgroundColor: `${colors.accent}40` }}>
                                <div 
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%`, backgroundColor: colors.primary }}
                                ></div>
                              </div>
                              <p className="text-xs mt-1" style={{ color: colors.textLight }}>
                                Uploading... {uploadProgress}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Upload Status Indicators */}
                    {uploading && (
                      <div className="mt-4 flex items-center justify-center p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}10` }}>
                        <Loader className="w-4 h-4 animate-spin mr-2" style={{ color: colors.primary }} />
                        <span className="text-sm" style={{ color: colors.text }}>
                          Processing your dental image...
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* File Requirements Hint */}
                <p className="text-xs mt-2" style={{ color: colors.textLight }}>
                  Supported formats: JPEG, PNG, GIF. Maximum size: 5MB.
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full text-white py-4 px-6 rounded-xl font-medium focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: uploading || !selectedFile ? `${colors.primary}80` : colors.primary,
                  boxShadow: !uploading && selectedFile ? `0 10px 25px -5px ${colors.primary}40` : 'none'
                }}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Uploading Image...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Begin Advanced Analysis
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border p-8" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.secondary}20` }}>
                  <FileText className="w-6 h-6" style={{ color: colors.secondary }} />
                </div>
                <h2 className="text-2xl font-bold ml-4" style={{ color: colors.text }}>My Analysis History</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${colors.primary}10`, color: colors.text }}>
                {submissions.length} records
              </span>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 rounded-2xl inline-block mb-4" style={{ backgroundColor: `${colors.background}80` }}>
                  <FileText className="w-12 h-12" style={{ color: colors.textLight }} />
                </div>
                <p className="mb-2" style={{ color: colors.textLight }}>No analysis submissions yet</p>
                <p className="text-sm" style={{ color: colors.textLight }}>
                  Start by uploading your first dental image for analysis
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="mt-4 text-white px-6 py-2 rounded-xl transition-all"
                  style={{ backgroundColor: colors.primary }}
                >
                  Start Analysis
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {submissions.map((submission) => (
                  <div key={submission._id} className="border rounded-2xl p-6 transition-all duration-300 group" style={{ borderColor: colors.accent, backgroundColor: '#FFFFFF' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <h3 className="font-semibold text-lg group-hover:underline transition-colors" style={{ color: colors.text }}>
                            {submission.name}
                          </h3>
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)} flex items-center`}>
                            {getStatusIcon(submission.status)}
                            <span className="ml-1 capitalize">{submission.status}</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4" style={{ color: colors.textLight }}>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            ID: {submission.patientId}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(submission.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {new Date(submission.createdAt).toLocaleTimeString()}
                          </div>
                        </div>

                        {submission.note && (
                          <p className="text-sm p-4 rounded-xl" style={{ backgroundColor: colors.background, color: colors.text }}>
                            {submission.note}
                          </p>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        {submission.status === "annotated" && submission.annotatedImageUrl && (
                          <button
                            onClick={() => viewAnnotatedImage(submission._id)}
                            className="px-4 py-2 rounded-xl text-sm flex items-center transition-colors"
                            style={{ backgroundColor: `${colors.secondary}20`, color: colors.secondary }}
                            title="View annotated analysis"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        )}

                        {submission.status === "reported" && (
                          <button
                            onClick={() => downloadReport(submission._id, submission.patientId)}
                            className="px-4 py-2 rounded-xl text-sm flex items-center transition-all transform hover:-translate-y-0.5"
                            style={{ backgroundColor: colors.primary, color: 'white' }}
                            title="Download comprehensive report"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;