
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/admin/Dashboard';
import BranchForm from './components/BranchForm';
import StaffList from './pages/admin/StaffList';
import Payroll from './pages/admin/Payroll';
import Settings from './pages/admin/Settings';
import EmployeeSettings from './pages/admin/EmployeeSettings'; 
import Subscription from './pages/admin/Subscription';
import Expenses from './pages/admin/Expenses';
import LiveTracking from './pages/admin/LiveTracking';
import VendorAttachment from './pages/admin/VendorAttachment';
import Corporate from './pages/admin/Corporate';
import Documents from './pages/Documents';
import Leads from './pages/admin/Leads';
import Reception from './pages/admin/Reception';
import VehicleEnquiries from './pages/admin/VehicleEnquiries'; // Import New Page
import UserAttendance from './pages/user/UserAttendance';
import UserSalary from './pages/user/UserSalary';
import ApplyLeave from './pages/user/ApplyLeave';
import UserProfile from './pages/user/UserProfile'; 
import TaskManagement from './pages/TaskManagement';
import AiAssistant from './components/AiAssistant';
import EmailMarketing from './pages/admin/EmailMarketing'; 
import { UserRole } from './types';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import { setupAutoSync, hydrateFromCloud } from './services/cloudService';
import { Loader2, Cloud } from 'lucide-react';

const App: React.FC = () => {
  // Initialize state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [isCloudInitialized, setIsCloudInitialized] = useState(false);

  // Initialize Cloud & Auth
  useEffect(() => {
    const initApp = async () => {
      // 1. Pull latest data from cloud (Hydration)
      // This ensures we have the latest "total website" data before showing anything
      // Errors are caught internally
      await hydrateFromCloud();
      
      // 2. Setup listeners for future changes (Instant Backup)
      setupAutoSync();

      // 3. Check Auth (after hydration to ensure we have latest session data)
      const hasSession = !!localStorage.getItem('app_session_id');
      const savedRole = localStorage.getItem('user_role');
      
      if (hasSession && savedRole && Object.values(UserRole).includes(savedRole as UserRole)) {
        setIsAuthenticated(true);
        setUserRole(savedRole as UserRole);
      }

      // 4. Ready to render
      setIsCloudInitialized(true);
    };

    initApp();
  }, []);

  // Handle Login
  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(UserRole.ADMIN); // Reset default
    localStorage.removeItem('app_session_id'); // Clear session ID
    localStorage.removeItem('user_role'); // Clear user role
  };

  // Determine home path based on role
  const homePath = userRole === UserRole.EMPLOYEE ? '/user' : '/admin';

  // AI Assistant Config
  const hrAssistantSystemInstruction = `You are an expert HR assistant for a small business staff management platform called OK BOZ. 
  Your goal is to help the admin or employee with questions about labor laws in India, leave policies, or drafting announcements.
  Keep answers concise, professional, and helpful.`;
  const hrAssistantInitialMessage = 'Hi! I am your OK BOZ HR Assistant. Ask me about leave policies, labor laws, or how to manage your staff.';

  // Loading Screen (Hydration Phase)
  if (!isCloudInitialized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-600 gap-4">
        <div className="relative">
           <Cloud className="w-16 h-16 text-emerald-500 animate-bounce" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
           </div>
        </div>
        <div className="text-center">
           <h2 className="text-xl font-bold text-gray-800">OK BOZ Cloud</h2>
           <p className="text-sm">Syncing your total website data...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrandingProvider>
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
                    {/* Email Marketing - Only Super Admin */}
                    <Route 
                      path="/admin/marketing" 
                      element={userRole === UserRole.ADMIN ? <EmailMarketing /> : <Navigate to="/admin" replace />} 
                    />
                    <Route path="/admin/reception" element={<Reception />} />
                    <Route path="/admin/vehicle-enquiries" element={<VehicleEnquiries />} />
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
                    <Route path="/admin/subscription" element={<Subscription />} />
                    <Route path="/admin/settings" element={<Settings />} />
                    {/* Corporate Management - Only Super Admin */}
                    {userRole === UserRole.ADMIN && (
                       <Route path="/admin/corporate" element={<Corporate />} />
                    )}
                    <Route path="/admin/*" element={<div className="p-8 text-center text-gray-500">Page under construction</div>} />
                  </>
                )}

                {/* User Routes */}
                {userRole === UserRole.EMPLOYEE && (
                  <>
                    <Route path="/user" element={<UserAttendance />} />
                    <Route path="/user/tasks" element={<TaskManagement role={UserRole.EMPLOYEE} />} />
                    {/* Removed Reception Desk from Employee portal */}
                    {/* <Route path="/user/reception" element={<Reception />} /> */}
                    <Route path="/user/vehicle-enquiries" element={<VehicleEnquiries />} /> {/* Added Vehicle Enquiries */}
                    <Route path="/user/vendors" element={<VendorAttachment />} />
                    <Route path="/user/salary" element={<UserSalary />} />
                    <Route path="/user/documents" element={<Documents role={UserRole.EMPLOYEE} />} />
                    <Route path="/user/apply-leave" element={<ApplyLeave />} />
                    <Route path="/user/profile" element={<UserProfile />} />
                    <Route path="/user/*" element={<div className="p-8 text-center text-gray-500">Page under construction</div>} />
                  </>
                )}

                {/* Catch all redirect */}
                <Route path="*" element={<Navigate to={homePath} replace />} />
              </Routes>
            </Layout>
          )}
          
          {/* AI Assistant is available for both roles when authenticated */}
          {isAuthenticated && 
            <AiAssistant 
              systemInstruction={hrAssistantSystemInstruction} 
              initialMessage={hrAssistantInitialMessage} 
              triggerButtonLabel="Ask HR AI" 
            />
          }
        </HashRouter>
      </BrandingProvider>
    </ThemeProvider>
  );
};

export default App;
