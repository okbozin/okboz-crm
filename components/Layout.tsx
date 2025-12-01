
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Calendar, DollarSign, Briefcase, Menu, X, LogOut, UserCircle, Building, Settings, Target, CreditCard, ClipboardList, ReceiptIndianRupee, Navigation, Car, Building2, PhoneIncoming, GripVertical, Edit2, Check, FileText, Layers, PhoneCall, Bus, Bell, Sun, Moon, Monitor, Mail, UserCog, CarFront } from 'lucide-react';
import { UserRole } from '../types';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  onLogout: () => void;
}

// Define the Master List of all possible Admin/Corporate links with unique IDs
const MASTER_ADMIN_LINKS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'marketing', path: '/admin/marketing', label: 'Email Marketing', icon: Mail },
  { id: 'reception', path: '/admin/reception', label: 'Reception Desk', icon: PhoneCall },
  { id: 'vehicle-enquiries', path: '/admin/vehicle-enquiries', label: 'Vehicle Enquiries', icon: Car },
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
  { id: 'subscription', path: '/admin/subscription', label: 'Subscription', icon: CreditCard },
  { id: 'corporate', path: '/admin/corporate', label: 'Corporate', icon: Building2 },
  { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
];

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const location = useLocation();
  const { companyName, logoUrl, primaryColor } = useBranding();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  
  // State to manage the ordered list of links
  const [orderedLinks, setOrderedLinks] = useState(MASTER_ADMIN_LINKS);

  // State for User Profile Display
  const [userName, setUserName] = useState('');
  const [userSubtitle, setUserSubtitle] = useState('');

  // Notification State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Lead Assigned', message: 'Rahul Gupta has been assigned to you.', time: '10 min ago', unread: true },
    { id: 2, title: 'Meeting Reminder', message: 'Team sync at 4:00 PM.', time: '1 hr ago', unread: true },
    { id: 3, title: 'Task Completed', message: 'Monthly Report task marked as done.', time: '3 hrs ago', unread: false },
    { id: 4, title: 'System Alert', message: 'Server maintenance scheduled for Sunday.', time: '5 hrs ago', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

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
        const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        const account = accounts.find((acc: any) => acc.email === sessionId);
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
         const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
         let emp = adminStaff.find((e: any) => e.id === sessionId);
         
         if (!emp) {
            // 2. Check All Corporate Staff Lists
            const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            for (const acc of accounts) {
                const corpStaffKey = `staff_data_${acc.email}`;
                const corpStaff = JSON.parse(localStorage.getItem(corpStaffKey) || '[]');
                emp = corpStaff.find((e: any) => e.id === sessionId);
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

  // Click outside to close notifications and theme menu
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
    
    // 2. "Subscription" is hidden for Corporate users
    if (link.id === 'subscription' && role === UserRole.CORPORATE) return false;

    // 3. "Franchisee Leads" is hidden for Corporate users
    if (link.id === 'leads' && role === UserRole.CORPORATE) return false;

    // 4. "Employee Setting" hidden for Corporate users
    if (link.id === 'employee-settings' && role === UserRole.CORPORATE) return false;

    return true;
  });

  const userLinks = [
    { path: '/user', label: 'My Attendance', icon: Calendar },
    { path: '/user/tasks', label: 'My Tasks', icon: ClipboardList },
    { path: '/user/reception', label: 'Reception Desk', icon: PhoneCall },
    { path: '/user/vendors', label: 'Vendor Attachment', icon: Car },
    { path: '/user/salary', label: 'My Salary', icon: DollarSign },
    { path: '/user/documents', label: 'Documents', icon: FileText },
    { path: '/user/apply-leave', label: 'Apply Leave', icon: Briefcase },
    // { path: '/user/profile', label: 'My Profile', icon: UserCircle }, // Removed Profile (Settings) as requested
  ];

  // Decide which set of links to render
  const displayLinks = (role === UserRole.ADMIN || role === UserRole.CORPORATE) ? visibleAdminLinks : userLinks;
  
  // Only Super Admin can drag, AND only when in edit mode
  const canDrag = role === UserRole.ADMIN && isEditingSidebar;

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
                   <Icon className={`w-5 h-5 shrink-0 ${isActive ? '' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`} style={isActive ? { color: primaryColor } : {}} />
                   <span className={`truncate ${isActive ? '' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>{link.label}</span>
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

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">Notifications</h3>
                    {unreadCount > 0 && (
                      <span 
                        className="text-xs text-emerald-600 font-medium cursor-pointer hover:underline" 
                        onClick={() => setNotifications(prev => prev.map(n => ({...n, unread: false})))}
                      >
                        Mark all read
                      </span>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer ${n.unread ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <p className={`text-sm font-medium ${n.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</p>
                            <span className="text-[10px] text-gray-400">{n.time}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">No notifications</div>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/50">
                    <button className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">View All Activity</button>
                  </div>
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
              onClick={onLogout}
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
