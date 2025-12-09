
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/admin/Dashboard';
import BranchForm from './components/BranchForm';
// Fix: Changed named import to default import for StaffList
import StaffList from './pages/admin/StaffList';
import Payroll from './pages/admin/Payroll';
import Settings from './pages/admin/Settings';
import EmployeeSettings from './pages/admin/EmployeeSettings'; 
import Expenses from './pages/admin/Expenses';
import LiveTracking from './pages/admin/LiveTracking';
import VendorAttachment from './pages/admin/VendorAttachment';
import Corporate from './pages/admin/Corporate';
import Documents from './pages/Documents';
import Leads from './pages/admin/Leads';
import TripEarning from './pages/admin/TripEarning';
import CustomerCare from './pages/admin/CustomerCare';
import EmailMarketing from './pages/admin/EmailMarketing'; 
import UserAttendance from './pages/user/UserAttendance';
import UserSalary from './pages/user/UserSalary';
import ApplyLeave from './pages/user/ApplyLeave';
import UserProfile from './pages/user/UserProfile'; 
import SecurityAccount from './pages/user/SecurityAccount'; 
import TaskManagement from './pages/TaskManagement';
import { UserRole } from './types';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; 
import { Loader2, Cloud } from 'lucide-react'; 
import { autoLoadFromCloud, syncToCloud, HARDCODED_FIREBASE_CONFIG } from './services/cloudService'; 
import { sendSystemNotification } from './services/cloudService'; 
import Reports from './pages/admin/Reports';
import CMS from './pages/admin/CMS'; 

/**
 * Main application component.
 * Handles authentication, routing, and global data initialization/sync.
 * This comment is added to force a cache bust.
 */
const App: React.FC = () => {
  // Initialize state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Auth and Data
  useEffect(() => {
    const initApp = async () => {
        // 1. Try to pull latest data from cloud if credentials exist
        await autoLoadFromCloud();

        // 2. Check Session
        const hasSession = !!localStorage.getItem('app_session_id');
        const savedRole = localStorage.getItem('user_role');
        
        if (hasSession && savedRole && Object.values(UserRole).includes(savedRole as UserRole)) {
          setIsAuthenticated(true);
          setUserRole(savedRole as UserRole);
        }
        
        setIsInitializing(false);
    };

    initApp();
  }, []);

  // --- AUTO SYNC (Start Collecting Data) ---
  useEffect(() => {
    if (!isAuthenticated) return;

    // Use a recursive setTimeout instead of setInterval to prevent overlapping sync calls
    // which can lead to "write stream exhausted" errors if network is slow.
    let timeoutId: any;
    
    const runSync = async () => {
        if (HARDCODED_FIREBASE_CONFIG.apiKey || localStorage.getItem('firebase_config')) {
            // Silently sync data to cloud
            await syncToCloud();
        }
        // Schedule next sync 30 seconds AFTER current sync finishes
        timeoutId = setTimeout(runSync, 30000); 
    };

    // Initial delay to let app load first
    timeoutId = setTimeout(runSync, 5000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(UserRole.ADMIN); 
    localStorage.removeItem('app_session_id'); 
    localStorage.removeItem('user_role'); 
  };

  if (isInitializing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
              <h2 className="text-lg font-bold text-gray-700">Syncing Database...</h2>
              <p className="text-sm text-gray-500">Connecting to Google Cloud Firebase</p>
          </div>
      );
  }

  // Determine home path based on role
  const homePath = userRole === UserRole.EMPLOYEE ? '/user' : '/admin';

  return (
    <ThemeProvider>
      <BrandingProvider>
        <NotificationProvider> 
          <HashRouter>
            {!isAuthenticated ? (
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
                <Layout role={userRole} onLogout={handleLogout}>
                  <Routes>
                    {/* Redirect root to appropriate home */}
                    <Route path="/" element={<Navigate to={homePath} replace />} />

                    {/* Admin Routes (Shared with Corporate, unless specified) */}
                    {(userRole === UserRole.ADMIN || userRole === UserRole.CORPORATE) && (
                      <>
                        <Route path="/admin" element={<Dashboard />} />
                        <Route path="/admin/reports" element={<Reports />} />
                        <Route path="/admin/customer-care" element={<CustomerCare role={userRole} />} />
                        <Route path="/admin/trip-earning" element={<TripEarning />} />
                        <Route path="/admin/tracking" element={<LiveTracking />} />
                        <Route path="/admin/leads" element={<Leads />} />
                        <Route path="/admin/tasks" element={<TaskManagement role={userRole} />} />
                        <Route path="/admin/attendance" element={<UserAttendance isAdmin={true} />} />
                        <Route path="/admin/branches" element={<BranchForm />} />
                        <Route path="/admin/staff" element={<StaffList />} />
                        <Route path="/admin/employee-settings" element={<EmployeeSettings />} />
                        <Route path="/admin/documents" element={<Documents role={userRole} />} />
                        <Route path="/admin/vendors" element={<VendorAttachment />} />
                        <Route path="/admin/payroll" element={<Payroll />} />
                        <Route path="/admin/expenses" element={<Expenses />} />
                        {/* NEW ROUTE: Finance & Expenses */}
                        <Route path="/admin/finance-and-expenses" element={<Expenses />} />
                        {/* NEW ROUTE: Admin Expenses */}
                        <Route path="/admin/admin-expenses" element={<Expenses />} />
                        {/* NEW ROUTE: Email Marketing */}
                        <Route path="/admin/email-marketing" element={<EmailMarketing />} />
                        {/* Settings Route - Accessible to Admin and Corporate */}
                        <Route path="/admin/settings" element={<Settings />} />
                        
                        {/* Corporate Management & CMS - Only Super Admin */}
                        {userRole === UserRole.ADMIN && (
                          <>
                            <Route path="/admin/corporate" element={<Corporate />} />
                            <Route path="/admin/cms" element={<CMS />} />
                          </>
                        )}
                      </>
                    )}

                    {/* Employee Routes */}
                    {userRole === UserRole.EMPLOYEE && (
                      <>
                        <Route path="/user" element={<UserAttendance isAdmin={false} />} />
                        <Route path="/user/customer-care" element={<CustomerCare role={userRole} />} />
                        <Route path="/user/trip-earning" element={<TripEarning />} />
                        <Route path="/user/tasks" element={<TaskManagement role={userRole} />} />
                        <Route path="/user/salary" element={<UserSalary />} />
                        <Route path="/user/apply-leave" element={<ApplyLeave />} />
                        <Route path="/user/profile" element={<UserProfile />} />
                        <Route path="/user/security-account" element={<SecurityAccount />} />
                        
                        {/* Conditional routes - checked by Layout links but routes must exist */}
                        <Route path="/user/documents" element={<Documents role={userRole} />} />
                        <Route path="/user/vendors" element={<VendorAttachment />} />
                        <Route path="/user/expenses" element={<Expenses />} />
                      </>
                    )}

                    {/* Fallback for unmatched routes */}
                    <Route path="*" element={<Navigate to={homePath} replace />} />
                  </Routes>
                </Layout>
            )}
          </HashRouter>
        </NotificationProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
};

export default App;
