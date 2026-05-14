import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import LoginPage from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import SetPassword from './pages/SetPassword';
import ResetPassword from './pages/ResetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import { FullPageLoader } from './components/ui/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function MainApp() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePageChange = (newPage) => {
    setActivePage(newPage);
    setSearchQuery(''); // Reset search when switching pages
  };

  const renderDashboard = () => {
    switch (user.role) {
      case 'Admin':
        return <AdminDashboard currentPage={activePage} onNavigate={handlePageChange} searchQuery={searchQuery} />;
      case 'Faculty':
        return <FacultyDashboard currentPage={activePage} onNavigate={handlePageChange} searchQuery={searchQuery} />;
      case 'Student':
        return <StudentDashboard currentPage={activePage} onNavigate={handlePageChange} searchQuery={searchQuery} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <DashboardLayout activePage={activePage} onPageChange={handlePageChange} searchQuery={searchQuery} onSearch={setSearchQuery}>
      {renderDashboard()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DialogProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot password" element={<ForgotPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </DialogProvider>
    </BrowserRouter>
  );
}