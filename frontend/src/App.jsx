import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PatientDashboard from './components/Patient/PatientDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminSubmissionView from './components/Admin/AdminSubmissionView';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';

function App() {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" reverseOrder={false} />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/patient" element={<PatientDashboard />} />
          
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/submission/:id" element={
            <ProtectedRoute requiredRole="admin">
              <AdminSubmissionView />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={
            <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/patient') : '/login'} />
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
