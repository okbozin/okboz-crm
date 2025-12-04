
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Calendar, DollarSign, Briefcase, Menu, X, LogOut, UserCircle, Building, Settings, Target, CreditCard, ClipboardList, ReceiptIndianRupee, Navigation, Car, Building2, PhoneIncoming, GripVertical, Edit2, Check, FileText, Layers, PhoneCall, Bus, Bell, Sun, Moon, Monitor, Mail, UserCog, CarFront, BellRing, BarChart3, Map, Headset } from 'lucide-react';
import { UserRole, Enquiry, CorporateAccount, Employee } from '../types';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
// import { useNotification } from '../context/NotificationContext'; // Removed: Import useNotification
// import { sendSystemNotification } from '../services/cloudService'; // Removed: Import sendSystemNotification

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  onLogout: () => void;
}

// Define the Master List of all possible Admin/Corporate links with unique IDs
const MASTER_ADMIN_LINKS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reports', path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { id: 'marketing', path: '/admin/marketing', label: 'Email Marketing', icon: Mail },
  { id: 'reception', path: '/admin/reception', label: 'Reception Desk', icon: PhoneCall },
  { id: 'vehicle-enquiries', path: '/admin/vehicle-enquiries', label: 'Vehicle Enquiries', icon: Car },
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
  { id: 'expenses', path: '/admin/expenses', label: 'Office Expenses', icon: ReceiptIndianRupee },
  { id: 'admin-finance', path: '/admin/admin-finance', label: 'Admin Finance', icon: ReceiptIndianRupee }, // New entry for Super Admin
  { id: 'corporate', path: '/admin/corporate', label: 'Corporate', icon: Building2 },
  { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
];

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); // Use useNavigate for redirection
  const { companyName, logoUrl, primaryColor } = useBranding();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  
  // Notification Context (Removed)
  // const { notifications, markNotificationAsRead, playAlarmSound } = useNotification();
  
  // State to manage the ordered list of links
  const [orderedLinks, setOrderedLinks] = useState(MASTER_ADMIN_LINKS);

  // State for User Profile Display
  const [userName, setUserName] = useState('');
  const [userSubtitle, setUserSubtitle] = useState('');

  // State for new enquiry count for Tasks tab
  const [newTaskCount, setNewTaskCount] = useState(0);

  // Notification State (Simplified/Removed)
  // const [notificationsOpen, setNotificationsOpen] = useState(false);
  // const notificationRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null); // Still needed for theme toggle

  // Calculate new task count based on role and enquiries
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
      // Lookup Corporate Account details using the session ID (email)
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
       
       try {
         // 1. Check Admin Staff
         const adminStaff: Employee[] = JSON.parse(localStorage.getItem('staff_data') || '[]');
         let emp = adminStaff.find((e: Employee) => e.id === sessionId);
         
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
         }
       } catch(e) {
         console.error("Error fetching employee details", e);
       }
       
       setUserName(foundName);
       setUserSubtitle(foundRole);
    }
  }, [role]);

  // Load order from local storage on mount
  useEffect(() => {
    if (role === UserRole.ADMIN || role === UserRole.CORPORATE) {
      const savedOrder = localStorage.getItem('admin_sidebar_order');
      if (savedOrder) {
        try {
          const orderIds: string[] = JSON.parse(savedOrder);
          
          // Sort MASTER_ADMIN_LINKS based on saved order
          const sorted = [...MASTER_ADMIN_LINKS].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            
            // If both exist in saved order, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            // If only A exists, it comes first
            if (indexA !== -1) return -1;
            // If only B exists, it comes first
            if (indexB !== -1) return 1;
            // If neither exists (new features), keep original order (or append to end)
            return 0;
          });
          
          setOrderedLinks(sorted);
        } catch (e) {
          console.error("Failed to load sidebar order", e);
        }
      }
    }
  }, [role]);

  // Effect to calculate new task count and listen for storage changes
  useEffect(() => {
      calculateNewTaskCount(); // Initial calculation on mount
      window.addEventListener('storage', calculateNewTaskCount);
      return () => window.removeEventListener('storage', calculateNewTaskCount);
  }, [role]); // Re-run if role changes

  // Click outside to close notifications and theme menu (notifications part removed)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
      //   setNotificationsOpen(false);
      // }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Removed: Handle click on notification: mark read and redirect
  // const handleNotificationClick = (notificationId: string, link?: string) => {
  //   const userId = localStorage.getItem('app_session_id') || 'guest';
  //   markNotificationAsRead(notificationId, userId);
  //   setNotificationsOpen(false);
  //   if (link) {
  //     navigate(link);
  //   }
  // };

  // Removed: handleMarkAllRead
  // const handleMarkAllRead = () => {
  //   const userId = localStorage.getItem('app_session_id') || 'guest';
  //   notifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id, userId));
  // }

  // Removed: unreadCount
  // const unreadCount = notifications.filter(n => !n.read).length;

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLAnchorElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('dragIndex');
    if (!dragIndexStr) return;
    
    const dragIndex = parseInt(dragIndexStr, 10);
    if (dragIndex === dropIndex) return;

    // Reorder
    const newLinks = [...orderedLinks];
    const [movedItem] = newLinks.splice(dragIndex, 1);
    newLinks.splice(dropIndex, 0, movedItem);

    setOrderedLinks(newLinks);

    // Save new order to local storage (Shared with Corporate)
    const orderIds = newLinks.map(link => link.id);
    localStorage.setItem('admin_sidebar_order', JSON.stringify(orderIds));
  };

  // Filter links based on Role Permissions
  const visibleAdminLinks = orderedLinks.filter(link => {
    // 1. "Corporate" tab is ONLY for Super Admin
    if (link.id === 'corporate' && role !== UserRole.ADMIN) return false;
    
    // 2. "Franchisee Leads" is hidden for Corporate users
    if (link.id === 'leads' && role === UserRole.CORPORATE) return false;

    // 3. "Employee Setting" hidden for Corporate users
    if (link.id === 'employee-settings' && role === UserRole.CORPORATE) return false;

    // 4. "Email Marketing" is hidden for Corporate users
    if (link.id === 'marketing' && role === UserRole.CORPORATE) return false;

    // 5. "Reception Desk" is hidden for Corporate users
    if (link.id === 'reception' && role === UserRole.CORPORATE) return false;

    // 6. "Settings" is hidden for Corporate users (Franchise Panel)
    if (link.id === 'settings' && role === UserRole.CORPORATE) return false;

    // 7. "Admin Finance" is ONLY for Super Admin
    if (link.id === 'admin-finance' && role !== UserRole.ADMIN) return false;

    // 8. "Vehicle Enquiries" is hidden for ALL Admin roles
    if (link.id === 'vehicle-enquiries') return false;

    return true;
  });

  const userLinks = [
    { path: '/user', label: 'My Attendance', icon: Calendar },
    { path: '/user/tasks', label: 'My Tasks', icon: ClipboardList },
    // { path: '/user/vehicle-enquiries', label: 'Vehicle Enquiries', icon: CarFront }, // Removed: Vehicle Enquiries for Employee
    { path: '/user/customer-care', label: 'Customer Care', icon: Headset }, // Added: Customer Care for Employee
    { path: '/user/vendors', label: 'Vendor Attachment', icon: Car },
    { path: '/user/salary', label: 'My Salary', icon: DollarSign },
    { path: '/user/documents', label: 'Documents', icon: FileText },
    { path: '/user/apply-leave', label: 'Apply Leave', icon: Briefcase },
    // { path: '/user/reception', label: 'Reception Desk', icon: PhoneCall }, // Removed Reception Desk
    // { path: '/user/profile', label: 'My Profile', icon: UserCircle }, // Removed Profile (Settings) as requested
  ];

  // Decide which set of links to render
  const displayLinks = (role === UserRole.ADMIN || role === UserRole.CORPORATE) ? visibleAdminLinks : userLinks;
  
  // Only Super Admin can drag, AND only when in edit mode
  const canDrag = role === UserRole.ADMIN && isEditingSidebar;

  const handleLogout = async () => {
    // Removed: If logging out an employee, send a logout notification
    // const loggedInEmployeeName = localStorage.getItem('logged_in_employee_name');
    // const loggedInEmployeeId = localStorage.getItem('logged_in_employee_id');
    // const loggedInEmployeeCorporateId = localStorage.getItem('logged_in_employee_corporate_id');

    // if (loggedInEmployeeName && loggedInEmployeeId && role === UserRole.EMPLOYEE) {
    //     await sendSystemNotification({
    //         id: `logout-${Date.now()}`,
    //         type: 'logout',
    //         title: 'Employee Logged Out',
    //         message: `${loggedInEmployeeName} (${loggedInEmployeeId}) has logged out.`,
    //         timestamp: new Date().toISOString(),
    //         read: false,
    //         targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
    //         corporateId: loggedInEmployeeCorporateId === 'admin' ? 'admin' : loggedInEmployeeCorporateId || undefined,
    //         employeeName: loggedInEmployeeName,
    //         employeeId: loggedInEmployeeId,
    //         link: `/admin/staff`
    //     });
    //     // Clear stored employee details
    //     localStorage.removeItem('logged_in_employee_name');
    //     localStorage.removeItem('logged_in_employee_id');
    //     localStorage.removeItem('logged_in_employee_corporate_id');
    // }
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
               
               // Special props for draggable items
               const dragProps = canDrag ? {
                 draggable: true,
                 onDragStart: (e: React.DragEvent<HTMLAnchorElement>) => handleDragStart(e, index),
                 onDragOver: handleDragOver,
                 onDrop: (e: React.DragEvent<HTMLAnchorElement>) => handleDrop(e, index),
               } : {};

               return (
                 <Link
                   key={link.path}
                   to={canDrag ? '#' : link.path} // Disable nav while dragging
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
                   {/* New Task Count Badge */}
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
            
            {/* Theme Toggle */}
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