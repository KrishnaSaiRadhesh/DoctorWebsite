import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';
import { Eye, Download, Users, FileText, Calendar, Mail, AlertCircle, CheckCircle, Clock, Search, Filter, Leaf, LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';

const colors = {
  primary: '#556B2F',   
  secondary: '#8FA31E',  
  accent: '#C6D870',    
  background: '#EFF5D2',
  text: '#2A2F1D',       
  textLight: '#5A5F4D',  
};

const AdminDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate(); 

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setError(null);
      const response = await axios.get('/admin/submissions');
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
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

  const generateReport = async (submissionId) => {
    try {
      setError(null);
      await axios.post(`/admin/generate-pdf/${submissionId}`);
      await fetchSubmissions();
    } catch (error) {
      console.error('Error generating report:', error);
      setError("Failed to generate report. Please try again.");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reported':
        return <CheckCircle className="w-4 h-4" style={{ color: colors.primary }} />;
      case 'annotated':
        return <AlertCircle className="w-4 h-4" style={{ color: colors.secondary }} />;
      case 'uploaded':
        return <Clock className="w-4 h-4" style={{ color: colors.accent }} />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
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

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = 
      submission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: submissions.length,
    uploaded: submissions.filter(s => s.status === 'uploaded').length,
    annotated: submissions.filter(s => s.status === 'annotated').length,
    reported: submissions.filter(s => s.status === 'reported').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.text }}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
       <div className="mb-8 flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl mb-4" style={{ backgroundColor: colors.primary }}>
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>
              Admin Dashboard
            </h1>
            <p style={{ color: colors.textLight }}>
              Manage patient submissions and generate reports
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
                <Users className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>Total Submissions</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>{statusCounts.all}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.accent}20` }}>
                <Clock className="w-6 h-6" style={{ color: colors.accent }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>Uploaded</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>{statusCounts.uploaded}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.secondary}20` }}>
                <AlertCircle className="w-6 h-6" style={{ color: colors.secondary }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>Annotated</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>{statusCounts.annotated}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: colors.primary }}>
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
                <CheckCircle className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colors.textLight }}>Reported</p>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>{statusCounts.reported}</p>
              </div>
            </div>
            </div>
        </div>

        {/* Filters and Search */}
        <div className="rounded-2xl border p-6 mb-6" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.textLight }} />
                <input
                  type="text"
                  placeholder="Search patients by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all"
                  style={{ borderColor: colors.accent, color: colors.text }}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5" style={{ color: colors.textLight }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all"
                style={{ borderColor: colors.accent, color: colors.text }}
              >
                <option value="all">All Status</option>
                <option value="uploaded">Uploaded</option>
                <option value="annotated">Annotated</option>
                <option value="reported">Reported</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: colors.accent }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: colors.accent }}>
            <h2 className="text-lg font-semibold" style={{ color: colors.text }}>All Submissions</h2>
          </div>
          
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textLight }} />
              <p style={{ color: colors.textLight }}>
                {searchTerm || statusFilter !== 'all' 
                  ? 'No submissions match your search criteria' 
                  : 'No submissions found'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: colors.background }}>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.text }}>
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.text }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.text }}>
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.text }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ color: colors.text }}>
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium" style={{ color: colors.text }}>
                            {submission.name}
                          </div>
                          <div className="text-sm flex items-center" style={{ color: colors.textLight }}>
                            <Mail className="w-4 h-4 mr-1" />
                            {submission.email}
                          </div>
                          <div className="text-sm" style={{ color: colors.textLight }}>
                            ID: {submission.patientId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                          {getStatusIcon(submission.status)}
                          <span className="ml-1 capitalize">{submission.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" style={{ color: colors.textLight }} />
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <Link
                          to={`/admin/submission/${submission._id}`}
                          className="inline-flex items-center px-3 py-1 border rounded-md transition-colors"
                          style={{ backgroundColor: `${colors.primary}20`, borderColor: colors.primary, color: colors.primary }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                        {submission.status === 'annotated' && (
                          <button
                            onClick={() => generateReport(submission._id)}
                            className="inline-flex items-center px-3 py-1 border rounded-md transition-colors"
                            style={{ backgroundColor: `${colors.secondary}20`, borderColor: colors.secondary, color: colors.secondary }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Generate PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;