
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Calendar, DollarSign, Briefcase, Menu, X, LogOut, UserCircle, Building, Settings, Target, CreditCard, ClipboardList, ReceiptIndianRupee, Navigation, Car, Building2, PhoneIncoming, GripVertical, Edit2, Check, FileText, Layers, PhoneCall, Bus, Bell, Sun, Moon, Monitor, Mail, UserCog, CarFront, BellRing, BarChart3, Map, Headset, BellDot, Pencil, Lock } from 'lucide-react';
import { UserRole, Enquiry, CorporateAccount, Employee } from '../types';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  onLogout: () => void;
}

// Define the Master List of all possible Admin/Corporate links with unique IDs
const MASTER_ADMIN_LINKS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reports', path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { id: 'reception', path: '/admin/reception', label: 'Reception Desk', icon: PhoneCall },
  { id: 'customer-care', path: '/admin/customer-care', label: 'Customer Care', icon: Headset },
  { id: 'trips', path: '/admin/trips', label: 'Trip Booking', icon: Map },
  { id: 'tracking', path: '/admin/tracking', label: 'Live Tracking', icon: Navigation },
  
  { id: 'leads', path: '/admin/leads', label: 'Franchisee Leads', icon: Layers },
  { id: 'tasks', path: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'attendance', path: '/admin/attendance', label: 'Attendance', icon: Calendar },
  { id: 'branches', path: '/admin/branches', label: 'Branches', icon: Building },
  { id: 'staff', path: '/admin/staff', label: 'Staff Management', icon: Users },
  { id: 'employee-settings', path: '/admin/employee-settings', label: 'Employee Setting', icon: UserCog },
  { id: 'documents', path: '/admin/documents', label: 'Documents', icon: FileText },
  { id: 'vendors', path: '/admin/vendors', label: 'Vendor Attachment', icon: CarFront },
  { id: 'payroll', path: '/admin/payroll', label: 'Payroll', icon: DollarSign },
  { id: 'finance-and-expenses', path: '/admin/finance-and-expenses', label: 'Finance & Expenses', icon: CreditCard }, 
  { id: 'corporate', path: '/admin/corporate', label: 'Corporate', icon: Building2 },
  { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
  { id: 'cms', path: '/admin/cms', label: 'CMS', icon: Pencil }, 
];

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); 
  const { companyName, logoUrl, primaryColor } = useBranding();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  
  // NEW: Notification Context
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useNotification();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null); 
  
  const themeRef = useRef<HTMLDivElement>(null); 

  // Calculate new task count for Tasks tab (can be enhanced to include notifications for tasks)
  const [newTaskCount, setNewTaskCount] = useState(0);

  // Load user details based on role and session
  const [userName, setUserName] = useState('');
  const [userSubtitle, setUserSubtitle] = useState('');
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  const calculateNewTaskCount = () => {
    try {
        const enquiriesJson = localStorage.getItem('global_enquiries_data');
        if (!enquiriesJson) {
            setNewTaskCount(0);
            return;
        }
        const allEnquiries: Enquiry[] = JSON.parse(enquiriesJson);
        
        let relevantNewEnquiries: Enquiry[] = [];
        const sessionId = localStorage.getItem('app_session_id');

        if (role === UserRole.ADMIN) {
            // Super Admin sees all new enquiries
            relevantNewEnquiries = allEnquiries.filter(e => e.status === 'New');
        } else if (role === UserRole.CORPORATE) {
            // Corporate sees new enquiries for their city
            const corporates: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            const currentCorporate = corporates.find((c: CorporateAccount) => c.email === sessionId);
            
            if (currentCorporate && currentCorporate.city) {
                relevantNewEnquiries = allEnquiries.filter(e => 
                    e.status === 'New' && e.city === currentCorporate.city
                );
            }
        } else if (role === UserRole.EMPLOYEE) {
            // Employee sees new enquiries assigned to them
            relevantNewEnquiries = allEnquiries.filter(e => 
                e.status === 'New' && e.assignedTo === sessionId
            );
        }
        setNewTaskCount(relevantNewEnquiries.length);
    } catch (e) {
        console.error("Error calculating new task count:", e);
        setNewTaskCount(0);
    }
  };


  // Load user details based on role and session
  useEffect(() => {
    const sessionId = localStorage.getItem('app_session_id');
    
    if (role === UserRole.ADMIN) {
      setUserName('Senthil Kumar');
      setUserSubtitle('CEO & Founder');
    } 
    else if (role === UserRole.CORPORATE) {
      try {
        const accounts: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        const account = accounts.find((acc: CorporateAccount) => acc.email === sessionId);
        if (account) {
            setUserName(account.companyName);
            setUserSubtitle(account.city ? `${account.city} Branch` : 'Corporate Partner');
        } else {
            setUserName('Franchise Partner');
            setUserSubtitle('Corporate');
        }
      } catch (e) {
        setUserName('Franchise Partner');
        setUserSubtitle('Corporate');
      }
    } 
    else if (role === UserRole.EMPLOYEE) {
       // Lookup Employee details using session ID (Employee ID)
       let foundName = 'Team Member';
       let foundRole = 'Employee';
       let emp: Employee | undefined;
       
       try {
         // 1. Check Admin Staff
         const adminStaff: Employee[] = JSON.parse(localStorage.getItem('staff_data') || '[]');
         emp = adminStaff.find((e: Employee) => e.id === sessionId);
         
         if (!emp) {
            // 2. Check All Corporate Staff Lists
            const accounts: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            for (const acc of accounts) {
                const corpStaffKey = `staff_data_${acc.email}`;
                const corpStaff: Employee[] = JSON.parse(localStorage.getItem(corpStaffKey) || '[]');
                emp = corpStaff.find((e: Employee) => e.id === sessionId);
                if (emp) break;
            }
         }
         
         if (emp) {
             foundName = emp.name;
             foundRole = emp.role;
             setCurrentEmployee(emp);
         }
       } catch(e) {
         console.error("Error fetching employee details", e);
       }
       
       setUserName(foundName);
       setUserSubtitle(foundRole);
    }
  }, [role]);

  // Load order from local storage on mount
  const [orderedLinks, setOrderedLinks] = useState(MASTER_ADMIN_LINKS); 
  useEffect(() => {
    if (role === UserRole.ADMIN || role === UserRole.CORPORATE) {
      const savedOrder = localStorage.getItem('admin_sidebar_order');
      if (savedOrder) {
        try {
          const orderIds: string[] = JSON.parse(savedOrder);
          const sorted = [...MASTER_ADMIN_LINKS].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
          });
          setOrderedLinks(sorted);
        } catch (e) {}
      }
    }
  }, [role]);

  // Effect to calculate new task count and listen for storage changes
  useEffect(() => {
      calculateNewTaskCount(); 
      window.addEventListener('storage', calculateNewTaskCount);
      return () => window.removeEventListener('storage', calculateNewTaskCount);
  }, [role]); 

  // Click outside listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notificationId: string, link?: string) => {
    markNotificationAsRead(notificationId);
    setNotificationsOpen(false);
    if (link) {
      navigate(link);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLAnchorElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('dragIndex');
    if (!dragIndexStr) return;
    
    const dragIndex = parseInt(dragIndexStr, 10);
    if (dragIndex === dropIndex) return;

    const newLinks = [...orderedLinks];
    const [movedItem] = newLinks.splice(dragIndex, 1);
    newLinks.splice(dropIndex, 0, movedItem);

    setOrderedLinks(newLinks);
    const orderIds = newLinks.map(link => link.id);
    localStorage.setItem('admin_sidebar_order', JSON.stringify(orderIds));
  };

  // Filter Admin/Corporate Links
  const visibleAdminLinks = orderedLinks.filter(link => {
    if (link.id === 'corporate' && role !== UserRole.ADMIN) return false;
    if (link.id === 'leads' && role === UserRole.CORPORATE) return false;
    if (link.id === 'employee-settings' && role === UserRole.CORPORATE) return false;
    if (link.id === 'reception' && role === UserRole.CORPORATE) return false;
    if (link.id === 'settings' && role === UserRole.CORPORATE) return false;
    if (link.id === 'finance-and-expenses' && role === UserRole.EMPLOYEE) return false;
    if (link.id === 'cms' && role !== UserRole.ADMIN) return false;
    return true;
  });

  // Dynamic Employee Links based on Allowed Modules
  const employeeLinks = useMemo(() => {
      const baseLinks = [
        { id: 'attendance', path: '/user', label: 'My Attendance', icon: Calendar },
        { id: 'tasks', path: '/user/tasks', label: 'My Tasks', icon: ClipboardList },
        { id: 'customer-care', path: '/user/customer-care', label: 'Customer Care', icon: Headset }, 
        { id: 'vendors', path: '/user/vendors', label: 'Vendor Attachment', icon: Car },
        { id: 'salary', path: '/user/salary', label: 'My Salary', icon: DollarSign },
        { id: 'leave', path: '/user/apply-leave', label: 'Apply Leave', icon: Briefcase },
        { id: 'profile', path: '/user/profile', label: 'My Profile', icon: UserCircle }, 
        { id: 'security', path: '/user/security-account', label: 'Security & Account', icon: Lock }, 
      ];

      // Add extra modules if permitted
      if (currentEmployee?.allowedModules?.includes('documents')) {
          baseLinks.splice(5, 0, { id: 'documents', path: '/user/documents', label: 'Documents', icon: FileText });
      }
      if (currentEmployee?.allowedModules?.includes('expenses')) {
          baseLinks.splice(5, 0, { id: 'expenses', path: '/user/expenses', label: 'My Expenses', icon: CreditCard });
      }
      if (currentEmployee?.allowedModules?.includes('trip_booking')) {
          baseLinks.splice(3, 0, { id: 'trip-booking', path: '/user/trip-booking', label: 'Trip Booking', icon: Map });
      }
      if (currentEmployee?.allowedModules?.includes('franchisee_leads')) {
          baseLinks.splice(3, 0, { id: 'leads', path: '/user/leads', label: 'Franchisee Leads', icon: Layers });
      }
      if (currentEmployee?.allowedModules?.includes('attendance_manager')) {
          baseLinks.splice(3, 0, { id: 'attendance-admin', path: '/user/attendance-admin', label: 'Attendance (Admin)', icon: Calendar });
      }
      if (currentEmployee?.allowedModules?.includes('payroll')) {
          baseLinks.splice(5, 0, { id: 'payroll', path: '/user/payroll', label: 'Payroll', icon: DollarSign });
      }
      if (currentEmployee?.allowedModules?.includes('live_tracking')) {
          baseLinks.splice(3, 0, { id: 'tracking', path: '/user/tracking', label: 'Live Tracking', icon: Navigation });
      }

      return baseLinks;
  }, [currentEmployee]);

  const displayLinks = (role === UserRole.ADMIN || role === UserRole.CORPORATE) ? visibleAdminLinks : employeeLinks;
  
  const canDrag = role === UserRole.ADMIN && isEditingSidebar;

  const handleLogout = async () => {
    onLogout();
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex overflow-hidden transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {companyName.charAt(0)}
              </div>
            )}
            <span className="text-xl font-bold text-gray-800 dark:text-white truncate">{companyName}</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-gray-500 dark:text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
           <nav className="space-y-1">
             {displayLinks.map((link, index) => {
               const Icon = link.icon;
               const isActive = location.pathname === link.path;
               
               const dragProps = canDrag ? {
                 draggable: true,
                 onDragStart: (e: React.DragEvent<HTMLAnchorElement>) => handleDragStart(e, index),
                 onDragOver: handleDragOver,
                 onDrop: (e: React.DragEvent<HTMLAnchorElement>) => handleDrop(e, index),
               } : {};

               return (
                 <Link
                   key={link.path}
                   to={canDrag ? '#' : link.path}
                   onClick={(e) => {
                     if (canDrag) e.preventDefault();
                     else setSidebarOpen(false);
                   }}
                   {...dragProps}
                   className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${canDrag ? 'cursor-move border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 bg-gray-50 dark:bg-gray-800' : ''}`}
                   style={!canDrag ? {
                     backgroundColor: isActive ? `${primaryColor}15` : 'transparent',
                     color: isActive ? primaryColor : '',
                     fontWeight: isActive ? 500 : 400
                   } : {}}
                 >
                   {canDrag && (
                     <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                   )}
                   <Icon className={`w-5 h-5 shrink-0 ${isActive ? '' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-200'}`} style={isActive ? { color: primaryColor } : {}} />
                   <span className={`truncate ${isActive ? '' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>{link.label}</span>
                   {(link.id === 'tasks' || link.path === '/user/tasks') && newTaskCount > 0 && (
                     <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] text-center">
                       {newTaskCount}
                     </span>
                   )}
                 </Link>
               );
             })}
           </nav>
        </div>

        {/* Admin Sidebar Customization Footer */}
        {role === UserRole.ADMIN && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
             <button 
               onClick={() => setIsEditingSidebar(!isEditingSidebar)}
               className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isEditingSidebar ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
             >
                {isEditingSidebar ? (
                  <>
                    <Check className="w-4 h-4" /> Done
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" /> Customize Menu
                  </>
                )}
             </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors duration-200">
          <button 
            className="lg:hidden text-gray-600 dark:text-gray-300 p-2 -ml-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 max-w-xl mx-auto text-center hidden md:block">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {role === UserRole.ADMIN ? 'Super Admin Panel' : role === UserRole.CORPORATE ? 'Franchise Panel' : 'Employee Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors relative ${unreadCount > 0 && !notificationsOpen ? 'animate-blink-bell' : ''}`}
                title="Notifications"
              >
                <BellRing className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center px-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-gray-800 dark:text-white text-sm">Notifications ({unreadCount})</h4>
                    <button 
                      onClick={() => { markAllNotificationsAsRead(); setNotificationsOpen(false); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      disabled={unreadCount === 0}
                    >
                      Mark All as Read
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">No new notifications.</p>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id, notif.link)}
                        className={`flex flex-col gap-1 px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-b-0
                                    ${notif.read ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700' : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white hover:bg-emerald-50 dark:hover:bg-gray-700'}`}
                      >
                        <p className={`font-semibold text-sm ${notif.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{notif.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{notif.message}</p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={themeRef}>
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors"
                title="Switch Theme"
              >
                {theme === 'light' && <Sun className="w-5 h-5" />}
                {theme === 'dark' && <Moon className="w-5 h-5" />}
                {theme === 'system' && <Monitor className="w-5 h-5" />}
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={() => { setTheme('light'); setThemeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${theme === 'light' ? 'text-emerald-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                  <button 
                    onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${theme === 'dark' ? 'text-emerald-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                  <button 
                    onClick={() => { setTheme('system'); setThemeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${theme === 'system' ? 'text-emerald-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <Monitor className="w-4 h-4" /> System
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <img 
                src={role === UserRole.ADMIN 
                  ? "https://picsum.photos/id/1077/40/40" 
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=random&color=fff`
                } 
                alt="Profile" 
                className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
              />
              <div className="hidden sm:block text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-200">
                  {userName || (role === UserRole.ADMIN ? 'Senthil Kumar' : 'Loading...')}
                </div>
                <div className="text-gray-400 text-xs">
                  {userSubtitle || (role === UserRole.ADMIN ? 'CEO & Founder' : 'User')}
                </div>
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 px-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline font-medium">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 text-gray-800 dark:text-gray-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
