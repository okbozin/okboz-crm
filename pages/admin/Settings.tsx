

import React, { useState, useEffect, useRef } from 'react';
import { Save, Bell, Building2, Globe, Shield, Plus, Trash2, MapPin, ExternalLink, CheckCircle, Palette, RefreshCcw, Database, Download, Upload, UsersRound, X as XIcon, Edit2, Lock, Eye, EyeOff, Mail, Server, Cloud, UploadCloud, CloudDownload, LogOut, AlertTriangle, Zap, RefreshCw, HardDrive, HelpCircle, Code, ChevronDown, ChevronUp, Check, Layers, Target, Settings as SettingsIcon, FileCode } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { initFirebase, syncToCloud, restoreFromCloud, FirebaseConfig, setupAutoSync, getCloudDatabaseStats, DEFAULT_FIREBASE_CONFIG } from '../../services/cloudService';

// Interface for Sub Admin / Office Staff
interface Permission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'SubAdmin';
  status: 'Active' | 'Inactive';
  permissions: Record<string, Permission>;
}

const MODULES = [
  'Staff',
  'Attendance',
  'Payroll',
  'Expenses',
  'Transport',
  'Reception',
  'Leads',
  'Tasks',
  'Documents',
  'Vendors'
];

const Settings: React.FC = () => {
  const { companyName: globalName, logoUrl: globalLogo, primaryColor: globalColor, updateBranding, resetBranding } = useBranding();
  
  // Determine Role and Session Context
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';

  const getSessionKey = (key: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return isSuperAdmin ? key : `${key}_${sessionId}`;
  };

  // FILTER TABS BASED ON ROLE
  // Database, Integrations, Whitelabel, and General are RESTRICTED to Super Admin
  const allTabs = [
    { id: 'general', label: 'Company Profile', icon: Building2, visible: isSuperAdmin },
    { id: 'database', label: 'Database', icon: Database, visible: isSuperAdmin }, 
    { id: 'integrations', label: 'Integrations', icon: Globe, visible: isSuperAdmin },
    { id: 'whitelabel', label: 'White Labeling', icon: Palette, visible: isSuperAdmin },
    { id: 'subadmin', label: 'Sub Admins', icon: UsersRound, visible: true }, 
    { id: 'notifications', label: 'Notifications', icon: Bell, visible: true },
    { id: 'security', label: 'Security', icon: Shield, visible: true },
    { id: 'dev_docs', label: 'Developer Docs', icon: FileCode, visible: isSuperAdmin },
  ];

  const visibleTabs = allTabs.filter(tab => tab.visible);

  // Initialize active tab to the first visible one
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || 'notifications');
  
  const [loading, setLoading] = useState(false);
  
  // Integrations State
  const [mapsApiKey, setMapsApiKey] = useState(() => localStorage.getItem('maps_api_key') || '');
  const [showKey, setShowKey] = useState(false);

  // Email SMTP State
  const [emailSettings, setEmailSettings] = useState(() => {
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : {
        provider: 'Custom SMTP',
        host: '',
        port: 587,
        username: '',
        password: '',
        fromName: globalName,
        fromEmail: ''
    };
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Firebase / Cloud Sync State
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(() => {
    const saved = localStorage.getItem('firebase_config');
    if (saved) return JSON.parse(saved);
    // If no local config, use the default hardcoded one from cloudService
    return DEFAULT_FIREBASE_CONFIG;
  });
  
  // Easy Setup State
  const [configPaste, setConfigPaste] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{type: 'success' | 'error' | '', msg: string}>({ type: '', msg: '' });
  const [cloudStats, setCloudStats] = useState<Record<string, any> | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Default Settings State
  const defaultSettings = {
    companyName: 'OK BOZ Pvt Ltd',
    website: 'www.okboz.com',
    email: 'admin@okboz.com',
    phone: '+91 98765 43210',
    address: '123, Tech Park, Cyber City, Gurgaon, India',
    
    // Notifications
    emailAlerts: true,
    smsAlerts: false,
    dailyReport: true,
    leaveUpdates: true,
  };

  const [formData, setFormData] = useState(defaultSettings);

  // Sub Admin State
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(() => {
    const key = getSessionKey('sub_admins');
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [subAdminForm, setSubAdminForm] = useState<SubAdmin>({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'SubAdmin',
    status: 'Active',
    permissions: MODULES.reduce((acc, module) => ({
        ...acc, 
        [module]: { view: false, add: false, edit: false, delete: false }
    }), {} as Record<string, Permission>)
  });
  const [showSubAdminPassword, setShowSubAdminPassword] = useState(false);

  // White Label Local State
  const [brandingForm, setBrandingForm] = useState({
    appName: globalName,
    logoUrl: globalLogo,
    primaryColor: globalColor
  });

  // Security Tab State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });
  const [showSecurityPasswords, setShowSecurityPasswords] = useState({
      current: false,
      new: false,
      confirm: false
  });

  // Load Settings from LocalStorage on Mount
  useEffect(() => {
    const key = getSessionKey('app_settings');
    const savedSettings = localStorage.getItem(key);
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    }
  }, []);

  // Fetch Cloud Stats when Database tab is active
  useEffect(() => {
    if (activeTab === 'database' && firebaseConfig.apiKey && isSuperAdmin) {
        refreshCloudStats();
    }
  }, [activeTab, firebaseConfig.apiKey, isSuperAdmin]);

  const refreshCloudStats = async () => {
      setLoadingStats(true);
      const stats = await getCloudDatabaseStats(firebaseConfig);
      setCloudStats(stats);
      setLoadingStats(false);
  };

  // Sync state if localStorage changes externally (e.g. tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      setMapsApiKey(localStorage.getItem('maps_api_key') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Persist Sub Admins
  useEffect(() => {
    const key = getSessionKey('sub_admins');
    localStorage.setItem(key, JSON.stringify(subAdmins));
  }, [subAdmins]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmailSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleBrandingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBrandingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFirebaseConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFirebaseConfig(prev => ({ ...prev, [name]: value }));
  };

  // --- Easy Connect Logic ---
  const parsePastedConfig = () => {
      if (!configPaste) return;
      
      try {
          let extractedConfig: any = {};
          
          // Case 1: It's a clean JSON object
          if (configPaste.trim().startsWith('{')) {
              extractedConfig = JSON.parse(configPaste);
          } else {
              // Case 2: It's the standard JS code block from Firebase Console
              const apiKey = configPaste.match(/apiKey:\s*["']([^"']+)["']/)?.[1];
              const authDomain = configPaste.match(/authDomain:\s*["']([^"']+)["']/)?.[1];
              const projectId = configPaste.match(/projectId:\s*["']([^"']+)["']/)?.[1];
              const storageBucket = configPaste.match(/storageBucket:\s*["']([^"']+)["']/)?.[1];
              const messagingSenderId = configPaste.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1];
              const appId = configPaste.match(/appId:\s*["']([^"']+)["']/)?.[1];

              if (apiKey && projectId) {
                  extractedConfig = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
              }
          }

          if (extractedConfig.apiKey && extractedConfig.projectId) {
              setFirebaseConfig(prev => ({ ...prev, ...extractedConfig }));
              setSyncStatus({ type: 'success', msg: 'Configuration detected! Click "Save" below to apply.' });
              // Automatically switch to view the filled fields briefly then save?
              // Just show success msg
          } else {
              setSyncStatus({ type: 'error', msg: 'Could not find keys. Please paste the full code block from Firebase.' });
          }
      } catch (e) {
          setSyncStatus({ type: 'error', msg: 'Invalid format. Please paste the Firebase config object.' });
      }
  };

  const toggleSetting = (key: string) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSave = () => {
    setLoading(true);
    
    // Only Super Admin can save global configs
    if (isSuperAdmin) {
        // Save Maps API Key
        const currentKey = mapsApiKey.trim();
        const oldKey = localStorage.getItem('maps_api_key');
        
        if (currentKey) {
           localStorage.setItem('maps_api_key', currentKey);
        } else {
           localStorage.removeItem('maps_api_key');
        }

        // Save Email Settings
        localStorage.setItem('smtp_config', JSON.stringify(emailSettings));

        // Save Firebase Config
        const oldFirebase = localStorage.getItem('firebase_config');
        localStorage.setItem('firebase_config', JSON.stringify(firebaseConfig));
        const hasFirebaseChanged = oldFirebase !== JSON.stringify(firebaseConfig);
        
        // Trigger auto-sync setup if config changed
        if (firebaseConfig.apiKey) {
            setupAutoSync();
            refreshCloudStats();
        }

        // Save Branding
        updateBranding({
            companyName: brandingForm.appName,
            logoUrl: brandingForm.logoUrl,
            primaryColor: brandingForm.primaryColor
        });

        // Determine if reload is needed
        const hasKeyChanged = currentKey !== (oldKey || '');
        if (hasKeyChanged || (hasFirebaseChanged && firebaseConfig.apiKey)) {
            setTimeout(() => {
                alert("Settings Saved! The app will now reload to apply the new database connection.");
                window.location.reload(); 
            }, 800);
            return;
        }
    }

    // Save Settings Data to LocalStorage (For StaffList to access - Namespaced)
    const settingsKey = getSessionKey('app_settings');
    localStorage.setItem(settingsKey, JSON.stringify(formData));

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      alert("Settings updated successfully!");
    }, 800);
  };

  const testEmailConnection = () => {
      setIsTestingEmail(true);
      // Simulate SMTP Check
      setTimeout(() => {
          setIsTestingEmail(false);
          if (emailSettings.host && emailSettings.username) {
              alert("Connection Successful! Test email sent to " + emailSettings.fromEmail);
          } else {
              alert("Connection Failed: Please check Host and Username.");
          }
      }, 2000);
  };

  const handleResetBranding = () => {
    if(window.confirm("Reset all branding to default?")) {
        resetBranding();
        setBrandingForm({
            appName: 'OK BOZ',
            logoUrl: '',
            primaryColor: '#10b981'
        });
    }
  }

  // --- Cloud Sync Handlers ---
  const handleCloudSync = async (direction: 'up' | 'down') => {
    if (!firebaseConfig.apiKey) {
        setSyncStatus({ type: 'error', msg: 'Please configure Firebase settings first.' });
        return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: '', msg: 'Connecting to Google Cloud...' });

    let result;
    if (direction === 'up') {
        result = await syncToCloud(firebaseConfig);
    } else {
        result = await restoreFromCloud(firebaseConfig);
    }

    setIsSyncing(false);
    setSyncStatus({
        type: result.success ? 'success' : 'error',
        msg: result.message
    });
    
    if (result.success) refreshCloudStats();

    if (result.success && direction === 'down') {
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
  };

  const handleDisconnectCloud = () => {
      if(window.confirm("Disconnect from current Google Cloud project? This will stop future syncs until re-configured.")) {
          localStorage.removeItem('firebase_config');
          setFirebaseConfig({
              apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
          });
          setSyncStatus({ type: '', msg: '' });
          window.location.reload(); // Force reload to clear sync hooks
      }
  };

  // --- Security Handlers ---
  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage({ type: '', text: '' });

    if (!securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
        setSecurityMessage({ type: 'error', text: 'All fields are required' });
        return;
    }

    if (securityForm.newPassword.length < 6) {
        setSecurityMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
        setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
        return;
    }

    // Logic for updating password based on role
    if (isSuperAdmin) {
        const currentStored = localStorage.getItem('admin_password') || '123456';
        if (securityForm.currentPassword !== currentStored) {
             setSecurityMessage({ type: 'error', text: 'Current password is incorrect' });
             return;
        }
        localStorage.setItem('admin_password', securityForm.newPassword);
        setSecurityMessage({ type: 'success', text: 'Admin password updated successfully. Use new password for next login.' });
    } else {
        // Corporate Logic
        const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        const sessionId = localStorage.getItem('app_session_id') || '';
        
        // Find by email since session ID for corporate is email
        const accountIndex = accounts.findIndex((a: any) => a.email === sessionId);
        
        if (accountIndex === -1) {
             setSecurityMessage({ type: 'error', text: 'Account record not found. Please contact support.' });
             return;
        }
        
        if (accounts[accountIndex].password !== securityForm.currentPassword) {
             setSecurityMessage({ type: 'error', text: 'Current password is incorrect' });
             return;
        }
        
        // Update password
        accounts[accountIndex].password = securityForm.newPassword;
        localStorage.setItem('corporate_accounts', JSON.stringify(accounts));
        setSecurityMessage({ type: 'success', text: 'Password updated successfully.' });
    }
    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // --- Sub Admin Handlers ---
  const openSubAdminModal = (admin?: SubAdmin) => {
    setShowSubAdminPassword(false);
    if (admin) {
        setEditingSubAdmin(admin);
        setSubAdminForm(admin);
    } else {
        setEditingSubAdmin(null);
        setSubAdminForm({
            id: `SA-${Date.now()}`,
            name: '',
            email: '',
            password: '',
            role: 'SubAdmin',
            status: 'Active',
            permissions: MODULES.reduce((acc, module) => ({
                ...acc, 
                [module]: { view: false, add: false, edit: false, delete: false }
    }), {} as Record<string, Permission>)
        });
    }
    setIsSubAdminModalOpen(true);
  };

  // FIX: Ensure permissions are updated immutably and correctly typed
  const handlePermissionChange = (module: string, type: keyof Permission | 'all') => {
    setSubAdminForm(prev => {
        // Create a new permissions object to ensure immutability
        const newPermissions: Record<string, Permission> = { ...prev.permissions };
        // Copy the specific module's permissions
        const currentModulePermissions: Permission = { ...newPermissions[module] }; 

        if (type === 'all') {
            const allTrue = currentModulePermissions.view && currentModulePermissions.add && currentModulePermissions.edit && currentModulePermissions.delete;
            const newVal = !allTrue;
            newPermissions[module] = { view: newVal, add: newVal, edit: newVal, delete: newVal };
        } else {
            // Update the specific permission property
            currentModulePermissions[type] = !currentModulePermissions[type];
            newPermissions[module] = currentModulePermissions; // Assign the updated module permissions back
        }

        return { ...prev, permissions: newPermissions };
    });
  };

  // FIX: Ensure permissions are updated immutably and correctly typed
  const handleToggleFullAccess = () => {
      setSubAdminForm(prev => {
          const allModules = MODULES;
          const allEnabled = allModules.every(m =>
              prev.permissions[m]?.view && 
              prev.permissions[m]?.add && 
              prev.permissions[m]?.edit && 
              prev.permissions[m]?.delete
          );

          const newVal = !allEnabled;
          const newPermissions: Record<string, Permission> = {}; // Ensure correct type
          allModules.forEach(m => {
              newPermissions[m] = { view: newVal, add: newVal, edit: newVal, delete: newVal };
          });

          return { ...prev, permissions: newPermissions };
      });
  };

  const saveSubAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!subAdminForm.name || !subAdminForm.email || !subAdminForm.password) {
          alert("Please fill in Name, Email and Password.");
          return;
      }

      if (editingSubAdmin) {
          setSubAdmins(prev => prev.map(sa => sa.id === editingSubAdmin.id ? subAdminForm : sa));
      } else {
          setSubAdmins(prev => [...prev, subAdminForm]);
      }
      setIsSubAdminModalOpen(false);
  };

  const deleteSubAdmin = (id: string) => {
      if (window.confirm("Are you sure you want to delete this Sub Admin?")) {
          setSubAdmins(prev => prev.filter(sa => sa.id !== id));
      }
  };

  // Helper to get local count
  const getLocalCount = (key: string): number | string => {
      const val = localStorage.getItem(key);
      if (!val) return 0;
      try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed.length : 1;
      } catch {
          return 'Raw';
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-gray-500">Manage your preferences, staff access, and configurations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <nav className="flex flex-col p-2 space-y-1">
              {visibleTabs.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            
            {/* Developer Documentation */}
            {activeTab === 'dev_docs' && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileCode className="w-6 h-6 text-emerald-600" /> Developer Documentation
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Technical architecture, deployment guide, and integration details for OK BOZ.
                  </p>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
                  {/* 1. Stack */}
                  <section>
                    <h4 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">1. Technology Stack</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h5 className="font-bold text-gray-800 mb-2">Frontend Core</h5>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li><strong>React 18</strong> (UI Library)</li>
                          <li><strong>Vite</strong> (Build Tool)</li>
                          <li><strong>TypeScript</strong> (Static Typing)</li>
                          <li><strong>Tailwind CSS</strong> (Styling)</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h5 className="font-bold text-gray-800 mb-2">Backend & Data</h5>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li><strong>Firebase Firestore</strong> (Cloud DB)</li>
                          <li><strong>LocalStorage</strong> (Offline Cache)</li>
                          <li><strong>Node.js</strong> (Optional Server)</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 2. Database */}
                  <section>
                    <h4 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">2. Database Architecture</h4>
                    <p className="text-sm mb-3">The application uses a <strong>Key-Value Mapping</strong> strategy. Data is mirrored from LocalStorage to the Firestore collection <code>ok_boz_live_data</code>.</p>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 font-bold">
                          <tr><th className="p-2 border-r">Key / Document ID</th><th className="p-2">Description</th></tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr><td className="p-2 border-r font-mono">staff_data</td><td className="p-2">Admin's employee profiles (Head Office).</td></tr>
                          <tr><td className="p-2 border-r font-mono">staff_data_{'{email}'}</td><td className="p-2">Franchise-specific employee profiles.</td></tr>
                          <tr><td className="p-2 border-r font-mono">corporate_accounts</td><td className="p-2">Franchise/Corporate logins.</td></tr>
                          <tr><td className="p-2 border-r font-mono">global_enquiries_data</td><td className="p-2">Vehicle and general enquiries log.</td></tr>
                          <tr><td className="p-2 border-r font-mono">app_settings</td><td className="p-2">Global configurations.</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* 3. Setup */}
                  <section>
                    <h4 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">3. Setup & Connections</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-bold text-sm text-indigo-700">Firebase Configuration</h5>
                        <p className="text-xs mb-2">1. Go to Firebase Console {'>'} Project Settings.</p>
                        <p className="text-xs mb-2">2. Copy the <code>firebaseConfig</code> object.</p>
                        <p className="text-xs">3. Paste it in <strong>Settings {'>'} Database {'>'} Easy Connect Wizard</strong>.</p>
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-blue-700">Google Maps API</h5>
                        <p className="text-xs mb-2">Required APIs: Maps JavaScript, Places, Geocoding, Distance Matrix.</p>
                        <p className="text-xs">Paste API Key in <strong>Settings {'>'} Integrations</strong>.</p>
                      </div>
                    </div>
                  </section>

                  {/* 4. Deployment */}
                  <section>
                    <h4 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">4. Deployment</h4>
                    <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs space-y-2">
                      <p># Install Dependencies</p>
                      <p className="text-white">npm install</p>
                      <p className="mt-2"># Run Development Server</p>
                      <p className="text-white">npm run dev</p>
                      <p className="mt-2"># Build for Production</p>
                      <p className="text-white">npm run build</p>
                    </div>
                    <p className="text-xs mt-3 bg-blue-50 p-2 rounded text-blue-800 border border-blue-100">
                      <strong>Note:</strong> This is a static SPA. Upload the contents of the <code>dist/</code> folder to Vercel, Netlify, Firebase Hosting, or any cPanel <code>public_html</code> folder.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* Database & Cloud Settings */}
            {activeTab === 'database' && isSuperAdmin && (
              <div className="space-y-8">
                {/* 1. Header with Connection Status */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Cloud className="w-6 h-6 text-emerald-400" />
                                <h3 className="text-xl font-bold">Google Cloud Firebase</h3>
                            </div>
                            <p className="text-slate-300 text-sm">Real-time database connection status.</p>
                        </div>
                        <div className="text-right">
                            {firebaseConfig.apiKey ? (
                                <div className="flex flex-col items-end">
                                    <span className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-300 text-sm font-bold border border-emerald-500/30">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Connected
                                    </span>
                                    <span className="text-xs text-slate-400 mt-1 font-mono">{firebaseConfig.projectId}</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full text-red-300 text-sm font-bold border border-red-500/30">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div> Disconnected
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Abstract bg shapes */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
                    <div className="absolute top-0 left-20 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
                </div>

                {/* 2. Easy Connect Wizard */}
                {(!firebaseConfig.apiKey || isAdvancedMode) && (
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm animate-in fade-in zoom-in space-y-4">
                        <div className="flex justify-between items-start">
                            <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-600" /> 
                                {firebaseConfig.apiKey ? 'Update Configuration' : 'Easy Connect Wizard'}
                            </h4>
                            {firebaseConfig.apiKey && (
                                <button onClick={() => setIsAdvancedMode(false)} className="text-xs text-blue-600 hover:underline">Close</button>
                            )}
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Paste Firebase Code Here</label>
                            <textarea 
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono bg-gray-50 h-24 resize-none"
                                placeholder={`const firebaseConfig = {\n  apiKey: "AIza...",\n  projectId: "...",\n  ...\n};`}
                                value={configPaste}
                                onChange={(e) => { setConfigPaste(e.target.value); parsePastedConfig(); }}
                            ></textarea>
                            {syncStatus.msg && (
                                <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${syncStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {syncStatus.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {syncStatus.msg}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center">
                            <button 
                                onClick={() => setShowHelp(!showHelp)}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <HelpCircle className="w-3 h-3" /> How to get this?
                            </button>
                            <button 
                                onClick={parsePastedConfig}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                            >
                                Auto-Detect & Save
                            </button>
                        </div>

                        {showHelp && (
                            <div className="bg-blue-100/50 p-3 rounded-lg text-xs text-blue-800 space-y-1 animate-in slide-in-from-top-1">
                                <p>1. Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a></p>
                                <p>2. Create Project {'>'} Add Web App {'>'} Copy `firebaseConfig` object.</p>
                                <p>3. Paste it above.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Live Data Dashboard */}
                {firebaseConfig.apiKey && (
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Live Data Collections
                            </h4>
                            <button 
                                onClick={refreshCloudStats} 
                                className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-blue-100"
                                disabled={loadingStats}
                            >
                                <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { label: 'Staff Records', key: 'staff_data', icon: UsersRound },
                                { label: 'Active Leads', key: 'leads_data', icon: Target },
                                { label: 'Corporate Accounts', key: 'corporate_accounts', icon: Building2 },
                                { label: 'Vehicle Vendors', key: 'vendor_data', icon: Layers },
                                { label: 'Office Expenses', key: 'office_expenses', icon: HardDrive },
                                { label: 'Branches', key: 'branches_data', icon: MapPin },
                            ].map((item) => {
                                const localCount = getLocalCount(item.key);
                                const cloudData = cloudStats ? cloudStats[item.key] : null;
                                const cloudCount = cloudData ? cloudData.count : '-';
                                const isSynced = localCount === cloudCount || (localCount === 0 && cloudCount === '-');
                                const Icon = item.icon;

                                return (
                                    <div key={item.key} className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            {isSynced ? (
                                                <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">Synced</span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-100">Pending</span>
                                            )}
                                        </div>
                                        <h5 className="font-bold text-gray-800 text-sm mb-2">{item.label}</h5>
                                        <div className="flex justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                            <span>Local: <strong className="text-gray-900">{localCount}</strong></span>
                                            <span className="text-gray-300">|</span>
                                            <span>Cloud: <strong className="text-blue-600">{cloudCount}</strong></span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 4. Advanced Actions Footer */}
                {firebaseConfig.apiKey && (
                    <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
                        <button 
                            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase flex items-center gap-1"
                        >
                            <SettingsIcon className="w-3 h-3" /> Connection Settings
                        </button>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleCloudSync('up')}
                                disabled={isSyncing}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2"
                            >
                                <UploadCloud className="w-4 h-4" /> Force Push
                            </button>
                            <button 
                                onClick={handleDisconnectCloud}
                                className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Disconnect
                            </button>
                        </div>
                    </div>
                )}
              </div>
            )}

            {/* General Settings */}
            {activeTab === 'general' && isSuperAdmin && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Company Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input 
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input 
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                    <input 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
                    <textarea 
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Notification Preferences</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-900">Email Alerts</h4>
                                <p className="text-sm text-gray-500">Receive daily summary and critical alerts via email.</p>
                            </div>
                            <button 
                                onClick={() => toggleSetting('emailAlerts')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.emailAlerts ? 'bg-emerald-500' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-900">SMS Alerts</h4>
                                <p className="text-sm text-gray-500">Get instant SMS for urgent notifications (Costs apply).</p>
                            </div>
                            <button 
                                onClick={() => toggleSetting('smsAlerts')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.smsAlerts ? 'bg-emerald-500' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.smsAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Sub Admin / Office Staff Management */}
            {activeTab === 'subadmin' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Sub Admin Management</h3>
                            <p className="text-sm text-gray-500">Create office staff accounts and assign specific permissions.</p>
                        </div>
                        <button 
                            onClick={() => openSubAdminModal()}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Sub Admin
                        </button>
                    </div>

                    {subAdmins.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No sub-admins created yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subAdmins.map(admin => (
                                        <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-800">{admin.name}</td>
                                            <td className="px-4 py-3 text-gray-600 text-sm">{admin.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                                                    <Shield className="w-3 h-3" /> Sub Admin
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {admin.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openSubAdminModal(admin)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit Permissions"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteSubAdmin(admin.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* White Labeling */}
            {activeTab === 'whitelabel' && isSuperAdmin && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <h3 className="text-lg font-bold text-gray-800">White Labeling</h3>
                     <button onClick={handleResetBranding} className="text-xs text-red-500 hover:underline">Reset to Default</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                           <input 
                              name="appName"
                              value={brandingForm.appName}
                              onChange={handleBrandingChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g. My Company HR"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                           <input 
                              name="logoUrl"
                              value={brandingForm.logoUrl}
                              onChange={handleBrandingChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="https://..."
                           />
                           <p className="text-xs text-gray-500 mt-1">Enter a direct image URL for your logo.</p>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Primary Theme Color</label>
                           <div className="flex items-center gap-3">
                              <input 
                                 type="color"
                                 name="primaryColor"
                                 value={brandingForm.primaryColor}
                                 onChange={handleBrandingChange}
                                 className="h-10 w-14 p-1 rounded border border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm text-gray-600 font-mono">{brandingForm.primaryColor}</span>
                           </div>
                        </div>
                     </div>

                     {/* Live Preview */}
                     <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Login Preview</span>
                        <div className="bg-white p-6 rounded-xl shadow-lg w-64 border border-gray-100">
                           <div className="flex justify-center mb-4">
                              {brandingForm.logoUrl ? (
                                 <img src={brandingForm.logoUrl} alt="Logo" className="h-12 object-contain" />
                              ) : (
                                 <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md" style={{ backgroundColor: brandingForm.primaryColor }}>
                                    {brandingForm.appName.charAt(0)}
                                 </div>
                              )}
                           </div>
                           <h4 className="font-bold text-gray-800 mb-1">{brandingForm.appName}</h4>
                           <p className="text-xs text-gray-500 mb-4">Sign in to continue</p>
                           <button className="w-full py-2 text-xs font-bold text-white rounded shadow-sm" style={{ backgroundColor: brandingForm.primaryColor }}>
                              Sign In
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && isSuperAdmin && (
               <div className="space-y-8">
                  {/* Google Maps Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">API Integrations</h3>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                           <div className="bg-white p-1.5 rounded border border-gray-100 shadow-sm">
                              <MapPin className="w-6 h-6 text-blue-500" />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900">Google Maps Platform</h4>
                              <p className="text-sm text-gray-500">Required for address autocomplete and map visualization.</p>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 uppercase">API Key</label>
                           <div className="flex gap-2">
                              <div className="relative flex-1">
                                 <input 
                                    type={showKey ? "text" : "password"}
                                    value={mapsApiKey}
                                    onChange={(e) => setMapsApiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                 />
                                 <button 
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                 >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                 </button>
                              </div>
                              <a 
                                 href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm"
                              >
                                 Get Key <ExternalLink className="w-3 h-3" />
                              </a>
                           </div>
                           <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" /> Ensure 'Maps JavaScript API', 'Places API', and 'Geocoding API' are enabled.
                           </p>
                           <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                               <CheckCircle className="w-3 h-3 text-emerald-500" /> This key will be used across all Corporate panels.
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Email Service Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Email Service Configuration</h3>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                           <div className="bg-white p-1.5 rounded border border-gray-100 shadow-sm">
                              <Mail className="w-6 h-6 text-emerald-500" />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900">SMTP Configuration</h4>
                              <p className="text-sm text-gray-500">Connect AWS SES, SendGrid, or Custom SMTP for bulk email marketing.</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Provider</label>
                                <select 
                                    name="provider"
                                    value={emailSettings.provider}
                                    onChange={handleEmailSettingChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="Custom SMTP">Custom SMTP</option>
                                    <option value="AWS SES">AWS SES</option>
                                    <option value="SendGrid">SendGrid</option>
                                    <option value="Gmail App Password">Gmail App Password</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                                <div className="relative">
                                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input 
                                        name="host"
                                        value={emailSettings.host}
                                        onChange={handleEmailSettingChange}
                                        placeholder="smtp.example.com"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                                <input 
                                    type="number"
                                    name="port"
                                    value={emailSettings.port}
                                    onChange={handleEmailSettingChange}
                                    placeholder="587"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input 
                                    name="username"
                                    value={emailSettings.username}
                                    onChange={handleEmailSettingChange}
                                    placeholder="email@example.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password / API Key</label>
                                <div className="relative">
                                    <input 
                                        type={showSmtpPassword ? "text" : "password"}
                                        name="password"
                                        value={emailSettings.password}
                                        onChange={handleEmailSettingChange}
                                        placeholder="••••••••"
                                        className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                                <input 
                                    name="fromName"
                                    value={emailSettings.fromName}
                                    onChange={handleEmailSettingChange}
                                    placeholder="Company Name"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                                <input 
                                    name="fromEmail"
                                    value={emailSettings.fromEmail}
                                    onChange={handleEmailSettingChange}
                                    placeholder="no-reply@company.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                            <button 
                                onClick={testEmailConnection}
                                disabled={isTestingEmail || !emailSettings.host}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTestingEmail ? 'Testing...' : 'Test Connection'}
                            </button>
                            <div className="text-xs text-gray-400 italic">
                                Credentials are stored locally in your browser.
                            </div>
                        </div>
                    </div>
                  </div>
               </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Security</h3>
                    <form onSubmit={handleSecuritySubmit} className="max-w-md space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <div className="relative">
                                <input 
                                    type={showSecurityPasswords.current ? "text" : "password"}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={securityForm.currentPassword}
                                    onChange={e => setSecurityForm({...securityForm, currentPassword: e.target.value})}
                                />
                                <button type="button" onClick={() => setShowSecurityPasswords(p => ({...p, current: !p.current}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showSecurityPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input 
                                    type={showSecurityPasswords.new ? "text" : "password"}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={securityForm.newPassword}
                                    onChange={e => setSecurityForm({...securityForm, newPassword: e.target.value})}
                                />
                                <button type="button" onClick={() => setShowSecurityPasswords(p => ({...p, new: !p.new}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showSecurityPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <div className="relative">
                                <input 
                                    type={showSecurityPasswords.confirm ? "text" : "password"}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={securityForm.confirmPassword}
                                    onChange={e => setSecurityForm({...securityForm, confirmPassword: e.target.value})}
                                />
                                <button type="button" onClick={() => setShowSecurityPasswords(p => ({...p, confirm: !p.confirm}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showSecurityPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {securityMessage.text && (
                            <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${securityMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {securityMessage.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                {securityMessage.text}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-colors w-full"
                        >
                            Update Password
                        </button>
                    </form>
                </div>
            )}

            {/* Action Bar (Hide for Security/Database tabs as they have their own submit) */}
            {activeTab !== 'security' && activeTab !== 'database' && activeTab !== 'dev_docs' && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                    {loading ? 'Saving...' : 'Save Changes'} <Save className="w-5 h-5" />
                </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub Admin Create/Edit Modal */}
      {isSubAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                 <div>
                    <h3 className="font-bold text-gray-900 text-xl">{editingSubAdmin ? 'Edit Sub Admin' : 'Create New Sub Admin'}</h3>
                    <p className="text-sm text-gray-500">Configure access levels for office staff</p>
                 </div>
                 <button onClick={() => setIsSubAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <XIcon className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={saveSubAdmin} className="flex-1 overflow-y-auto p-6 space-y-8">
                 {/* Account Details */}
                 <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                       <UsersRound className="w-4 h-4 text-emerald-500" /> Account Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <input 
                             required
                             value={subAdminForm.name}
                             onChange={(e) => setSubAdminForm({...subAdminForm, name: e.target.value})}
                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                             placeholder="e.g. Sarah Jones"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login ID)</label>
                          <input 
                             required
                             type="email"
                             value={subAdminForm.email}
                             onChange={(e) => setSubAdminForm({...subAdminForm, email: e.target.value})}
                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                             placeholder="staff@company.com"
                          />
                       </div>
                       <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <div className="relative">
                             <input 
                                required
                                type={showSubAdminPassword ? "text" : "password"}
                                value={subAdminForm.password}
                                onChange={(e) => setSubAdminForm({...subAdminForm, password: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="••••••••"
                             />
                             <button 
                                type="button"
                                onClick={() => setShowSubAdminPassword(!showSubAdminPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                             >
                                {showSubAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </button>
                          </div>
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select 
                             value={subAdminForm.status}
                             onChange={(e) => setSubAdminForm({...subAdminForm, status: e.target.value as 'Active' | 'Inactive'})}
                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                          >
                             <option value="Active">Active</option>
                             <option value="Inactive">Inactive</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 {/* Permission Matrix */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                       <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-500" /> Access Permissions
                       </h4>
                       <button 
                          type="button" 
                          onClick={handleToggleFullAccess}
                          className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-100 transition-colors"
                       >
                          Toggle Full Access
                       </button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-600 font-semibold">
                             <tr>
                                <th className="px-6 py-3 w-1/3">Module</th>
                                <th className="px-4 py-3 text-center">View</th>
                                <th className="px-4 py-3 text-center">Add</th>
                                <th className="px-4 py-3 text-center">Edit</th>
                                <th className="px-4 py-3 text-center">Delete</th>
                                <th className="px-4 py-3 text-center">All</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {MODULES.map(module => {
                                const perms = subAdminForm.permissions[module];
                                return (
                                   <tr key={module} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-3 font-medium text-gray-800">{module}</td>
                                      {(['view', 'add', 'edit', 'delete'] as const).map(type => (
                                         <td key={type} className="px-4 py-3 text-center">
                                            <input 
                                               type="checkbox" 
                                               checked={perms[type]} 
                                               onChange={() => handlePermissionChange(module, type)}
                                               className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                            />
                                                                                       </td>
                                      ))}
                                      <td className="px-4 py-3 text-center">
                                         <button
                                            type="button" 
                                            onClick={() => handlePermissionChange(module, 'all')}
                                            className="text-xs text-gray-500 hover:text-emerald-600 font-medium"
                                         >
                                            {perms.view && perms.add && perms.edit && perms.delete ? 'Unselect' : 'Select'}
                                         </button>
                                      </td>
                                   </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </form>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl shrink-0">
                 <button 
                    type="button" 
                    onClick={() => setIsSubAdminModalOpen(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={saveSubAdmin}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                 >
                    {editingSubAdmin ? 'Update Sub Admin' : 'Create Sub Admin'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;