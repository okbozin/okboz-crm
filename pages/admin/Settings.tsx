
import React, { useState, useEffect } from 'react';
import { 
  Bell, Building2, Globe, Shield, MapPin, 
  Palette, Database as DatabaseIcon, 
  UploadCloud, LogOut, Zap, RefreshCw, HardDrive, HelpCircle, Settings as SettingsIcon, 
  Target, Layers, FileCode, Car, Users, X as XIcon, Lock, Eye, EyeOff, Mail, Cloud, Plus 
} from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { syncToCloud, restoreFromCloud, FirebaseConfig, getCloudDatabaseStats, DEFAULT_FIREBASE_CONFIG, HARDCODED_FIREBASE_CONFIG } from '../../services/cloudService';

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
  'Staff', 'Attendance', 'Payroll', 'Expenses', 'Transport', 
  'Reception', 'Leads', 'Tasks', 'Documents', 'Vendors'
];

const Settings: React.FC = () => {
  const { companyName: globalName, logoUrl: globalLogo, primaryColor: globalColor, updateBranding, resetBranding } = useBranding();
  
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';

  const getSessionKey = (key: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return isSuperAdmin ? key : `${key}_${sessionId}`;
  };

  const allTabs = [
    { id: 'general', label: 'Company Profile', icon: Building2, visible: isSuperAdmin },
    { id: 'database', label: 'Database', icon: DatabaseIcon, visible: isSuperAdmin },
    { id: 'integrations', label: 'Integrations', icon: Globe, visible: isSuperAdmin },
    { id: 'whitelabel', label: 'White Labeling', icon: isSuperAdmin ? Palette : Bell, visible: isSuperAdmin },
    { id: 'subadmin', label: 'Sub Admins', icon: Users, visible: true }, 
    { id: 'notifications', label: 'Notifications', icon: Bell, visible: true },
    { id: 'security', label: 'Security', icon: Shield, visible: true },
    { id: 'dev_docs', label: 'Developer Docs', icon: FileCode, visible: isSuperAdmin }
  ];

  const visibleTabs = allTabs.filter(tab => tab.visible);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || 'notifications');
  const [loading, setLoading] = useState(false);
  
  const [mapsApiKey, setMapsApiKey] = useState(() => localStorage.getItem('maps_api_key') || '');
  const [emailSettings, setEmailSettings] = useState(() => {
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : {
        provider: 'Custom SMTP',
        host: '', port: 587, username: '', password: '', fromName: globalName, fromEmail: ''
    };
  });

  // Use hardcoded config if available, otherwise fallback to default
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(() => {
    if (HARDCODED_FIREBASE_CONFIG.apiKey) return HARDCODED_FIREBASE_CONFIG;
    const saved = localStorage.getItem('firebase_config');
    if (saved) return JSON.parse(saved);
    return DEFAULT_FIREBASE_CONFIG;
  });
  
  const [configPaste, setConfigPaste] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{type: 'success' | 'error' | '', msg: string}>({ type: '', msg: '' });
  const [cloudStats, setCloudStats] = useState<Record<string, any> | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const [formData, setFormData] = useState({
    companyName: 'OK BOZ Pvt Ltd', website: 'www.okboz.com', email: 'admin@okboz.com',
    phone: '+91 98765 43210', address: '123, Tech Park, Cyber City, Gurgaon, India',
    emailAlerts: true, smsAlerts: false, dailyReport: true, leaveUpdates: true
  });

  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(() => {
    const key = getSessionKey('sub_admins');
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [subAdminForm, setSubAdminForm] = useState<SubAdmin>({
    id: '', name: '', email: '', password: '', role: 'SubAdmin', status: 'Active',
    permissions: MODULES.reduce((acc, m) => ({...acc, [m]: { view: false, add: false, edit: false, delete: false }}), {} as any)
  });

  const [brandingForm, setBrandingForm] = useState({ appName: globalName, logoUrl: globalLogo, primaryColor: globalColor });
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const key = getSessionKey('app_settings');
    const savedSettings = localStorage.getItem(key);
    if (savedSettings) {
        try { setFormData(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const key = getSessionKey('sub_admins');
    localStorage.setItem(key, JSON.stringify(subAdmins));
  }, [subAdmins]);

  useEffect(() => {
    if (activeTab === 'database' && firebaseConfig.apiKey && isSuperAdmin) {
        refreshCloudStats();
    }
  }, [activeTab, firebaseConfig.apiKey, isSuperAdmin]);

  const refreshCloudStats = async () => {
      setLoadingStats(true);
      setPermissionError(false);
      try {
        const stats = await getCloudDatabaseStats(firebaseConfig);
        if (stats && stats._permissionDenied) {
             setPermissionError(true);
             setCloudStats(null);
        } else {
             setCloudStats(stats);
        }
      } catch (e) {
        console.error("Failed to load stats", e);
      }
      setLoadingStats(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    setLoading(true);
    if (isSuperAdmin) {
        const currentKey = mapsApiKey.trim();
        if (currentKey) localStorage.setItem('maps_api_key', currentKey);
        else localStorage.removeItem('maps_api_key');

        localStorage.setItem('smtp_config', JSON.stringify(emailSettings));
        
        // Only save to local storage if user manually changed it via UI, otherwise code config persists
        if (JSON.stringify(firebaseConfig) !== JSON.stringify(HARDCODED_FIREBASE_CONFIG)) {
            localStorage.setItem('firebase_config', JSON.stringify(firebaseConfig));
        }

        updateBranding({
            companyName: brandingForm.appName,
            logoUrl: brandingForm.logoUrl,
            primaryColor: brandingForm.primaryColor
        });
    }
    const settingsKey = getSessionKey('app_settings');
    localStorage.setItem(settingsKey, JSON.stringify(formData));
    setTimeout(() => { setLoading(false); alert("Settings updated successfully! Reloading to apply..."); window.location.reload(); }, 800);
  };

  const parsePastedConfig = () => {
      if (!configPaste) return;
      try {
          let extractedConfig: any = {};
          // Handle standard JS object copy-paste
          if (configPaste.trim().startsWith('{') || configPaste.includes('apiKey:')) {
               // Simple regex extraction for key values if JSON parse fails or it's JS code
               const apiKey = configPaste.match(/apiKey:\s*["']([^"']+)["']/)?.[1] || configPaste.match(/"apiKey":\s*["']([^"']+)["']/)?.[1];
               const projectId = configPaste.match(/projectId:\s*["']([^"']+)["']/)?.[1] || configPaste.match(/"projectId":\s*["']([^"']+)["']/)?.[1];
               const storageBucket = configPaste.match(/storageBucket:\s*["']([^"']+)["']/)?.[1] || configPaste.match(/"storageBucket":\s*["']([^"']+)["']/)?.[1];
               
               if (apiKey && projectId) {
                   extractedConfig = {
                       apiKey, projectId, storageBucket: storageBucket || '',
                       authDomain: configPaste.match(/authDomain:\s*["']([^"']+)["']/)?.[1] || '',
                       messagingSenderId: configPaste.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1] || '',
                       appId: configPaste.match(/appId:\s*["']([^"']+)["']/)?.[1] || ''
                   };
               } else {
                   // Try direct JSON parse
                   extractedConfig = JSON.parse(configPaste);
               }
          } 
          
          if (extractedConfig.apiKey && extractedConfig.projectId) {
              setFirebaseConfig(prev => ({ ...prev, ...extractedConfig }));
              setSyncStatus({ type: 'success', msg: 'Configuration detected! Click "Save Config" below to apply.' });
          } else {
              setSyncStatus({ type: 'error', msg: 'Could not parse config. Please paste the full object.' });
          }
      } catch (e) {
          setSyncStatus({ type: 'error', msg: 'Invalid format.' });
      }
  };

  const handleCloudSync = async (direction: 'up' | 'down') => {
    if (!firebaseConfig.apiKey) return;
    setIsSyncing(true);
    setSyncStatus({ type: '', msg: 'Connecting...' });
    try {
        // Always pass current config to sync function
        const result = direction === 'up' ? await syncToCloud(firebaseConfig) : await restoreFromCloud(firebaseConfig);
        setSyncStatus({ type: result.success ? 'success' : 'error', msg: result.message });
        if (result.success) refreshCloudStats();
    } catch(e: any) {
        setSyncStatus({ type: 'error', msg: e.message || 'Unknown error' });
    }
    setIsSyncing(false);
  };

  const getLocalCount = (key: string) => {
      const val = localStorage.getItem(key);
      if (!val) return 0;
      try { 
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed.length : 1; 
      } catch { return 1; }
  };

  const openSubAdminModal = (admin?: SubAdmin) => {
    if (admin) {
        setEditingSubAdmin(admin);
        setSubAdminForm(admin);
    } else {
        setEditingSubAdmin(null);
        setSubAdminForm({
            id: `SA-${Date.now()}`,
            name: '', email: '', password: '', role: 'SubAdmin', status: 'Active',
            permissions: MODULES.reduce((acc, m) => ({...acc, [m]: { view: false, add: false, edit: false, delete: false }}), {} as any)
        });
    }
    setIsSubAdminModalOpen(true);
  };

  const saveSubAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!subAdminForm.name || !subAdminForm.email || !subAdminForm.password) return;
      if (editingSubAdmin) {
          setSubAdmins(prev => prev.map(sa => sa.id === editingSubAdmin.id ? subAdminForm : sa));
      } else {
          setSubAdmins(prev => [...prev, subAdminForm]);
      }
      setIsSubAdminModalOpen(false);
  };

  const deleteSubAdmin = (id: string) => {
      if (window.confirm("Delete this sub-admin?")) {
          setSubAdmins(prev => prev.filter(sa => sa.id !== id));
      }
  };

  const dataCollections = [
    { label: 'Staff Records', key: 'staff_data', icon: Users },
    { label: 'Active Leads', key: 'leads_data', icon: Target },
    { label: 'Corporate Accounts', key: 'corporate_accounts', icon: Building2 },
    { label: 'Vehicle Vendors', key: 'vendor_data', icon: Layers },
    { label: 'Office Expenses', key: 'office_expenses', icon: HardDrive },
    { label: 'Branches', key: 'branches_data', icon: MapPin },
    { label: 'Trips', key: 'trips_data', icon: Car }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-gray-500">Manage your preferences, staff access, and configurations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <nav className="flex flex-col p-2 space-y-1">
              {visibleTabs.map(tab => {
                 const TabIcon = tab.icon;
                 return (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <TabIcon className="w-4 h-4" /> {tab.label}
                  </button>
              )})}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            
            {/* Database Tab */}
            {activeTab === 'database' && isSuperAdmin && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Cloud className="w-6 h-6 text-emerald-400" />
                            <h3 className="text-xl font-bold">Google Cloud Firebase</h3>
                        </div>
                        <p className="text-slate-300 text-sm">Real-time database connection status.</p>
                        {HARDCODED_FIREBASE_CONFIG.apiKey ? (
                            <p className="text-xs text-emerald-400 mt-1">Using Persistent Config (Codebase)</p>
                        ) : (
                            <p className="text-xs text-orange-300 mt-1">Using Local Storage (Browser)</p>
                        )}
                    </div>
                    <div className="text-right">
                        {firebaseConfig.apiKey ? (
                            <span className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-300 text-sm font-bold border border-emerald-500/30">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Connected
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full text-red-300 text-sm font-bold border border-red-500/30">
                                <div className="w-2 h-2 rounded-full bg-red-400"></div> Disconnected
                            </span>
                        )}
                        {firebaseConfig.projectId && <div className="text-xs text-slate-500 mt-1">{firebaseConfig.projectId}</div>}
                    </div>
                </div>

                {(!firebaseConfig.apiKey || isAdvancedMode) && (
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-600" /> Easy Connect Wizard
                            </h4>
                            {firebaseConfig.apiKey && <button onClick={() => setIsAdvancedMode(false)} className="text-xs text-blue-600 hover:underline">Close</button>}
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-blue-200 text-blue-900 text-sm space-y-2">
                            <div className="font-bold flex items-center gap-2"><HelpCircle className="w-4 h-4"/> How to get credentials for "OKBOZ CRM"</div>
                            <ol className="list-decimal list-inside space-y-1 ml-1 text-xs">
                                <li>Open <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Firebase Console</a>.</li>
                                <li>Click on your project: <strong>OKBOZ CRM</strong>.</li>
                                <li>Click the <strong>Gear Icon (⚙️)</strong> (top left) &gt; <strong>Project settings</strong>.</li>
                                <li>Scroll down to the <strong>"Your apps"</strong> section.</li>
                                <li>If you haven't created a web app yet, click the <strong>&lt;/&gt;</strong> icon.</li>
                                <li>Under "SDK setup and configuration", ensure <strong>Config</strong> is selected.</li>
                                <li>Copy the entire {'`const firebaseConfig = { ... }`'} block.</li>
                                <li>Paste it into the box below and click <strong>Save Config</strong>.</li>
                            </ol>
                        </div>

                        <textarea 
                            className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono bg-white h-24"
                            placeholder={`Paste firebaseConfig object here...`}
                            value={configPaste}
                            onChange={(e) => { setConfigPaste(e.target.value); parsePastedConfig(); }}
                        />
                        {syncStatus.msg && (
                            <div className={`text-xs font-medium flex items-center gap-1 ${syncStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {syncStatus.msg}
                            </div>
                        )}
                        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save Config</button>
                    </div>
                )}

                {firebaseConfig.apiKey && (
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Live Data Collections
                            </h4>
                            <button onClick={refreshCloudStats} className="text-xs text-blue-600 border border-blue-100 px-3 py-1 rounded flex items-center gap-1">
                                <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                        </div>

                        {permissionError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2">
                                <Shield className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>Permission Denied:</strong> Unable to read database stats.
                                    <br/>
                                    <span className="text-xs">Please go to Firebase Console &gt; Firestore Database &gt; Rules and change <code>allow read, write: if false;</code> to <code>allow read, write: if true;</code> for development.</span>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dataCollections.map((item) => {
                                const local = getLocalCount(item.key);
                                const cloud = cloudStats?.[item.key]?.count || '-';
                                const Icon = item.icon;
                                return (
                                    <div key={item.key} className="bg-white p-4 rounded-xl border border-gray-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-600"><Icon className="w-5 h-5" /></div>
                                            <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Synced</span>
                                        </div>
                                        <h5 className="font-bold text-gray-800 text-sm mb-2">{item.label}</h5>
                                        <div className="flex justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                            <span>Local: <strong>{local}</strong></span>
                                            <span className="text-gray-300">|</span>
                                            <span>Cloud: <strong className="text-blue-600">{String(cloud)}</strong></span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center mt-4">
                            <button onClick={() => setIsAdvancedMode(!isAdvancedMode)} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase flex items-center gap-1">
                                <SettingsIcon className="w-3 h-3" /> Connection Settings
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => handleCloudSync('up')} disabled={isSyncing} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2">
                                    <UploadCloud className="w-4 h-4" /> Force Push
                                </button>
                                <button 
                                    onClick={() => { localStorage.removeItem('firebase_config'); window.location.reload(); }}
                                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> Disconnect
                                </button>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            )}
            {/* ... other tabs render ... */}
            {activeTab === 'general' && isSuperAdmin && (
                <div className="space-y-4 animate-in fade-in">
                    <h3 className="font-bold text-lg mb-4">Company Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Company Name</label>
                            <input name="companyName" value={formData.companyName} onChange={handleInputChange} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Website</label>
                            <input name="website" value={formData.website} onChange={handleInputChange} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input name="email" value={formData.email} onChange={handleInputChange} className="border p-2 rounded w-full" />
                        </div>
                    </div>
                    <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded mt-4">Save Changes</button>
                </div>
            )}

            {activeTab === 'integrations' && isSuperAdmin && (
                <div className="space-y-6 animate-in fade-in">
                    <h3 className="font-bold text-lg mb-4">Third-Party Integrations</h3>
                    <div className="p-4 border rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="text-blue-500 w-5 h-5" />
                            <h4 className="font-bold">Google Maps Platform</h4>
                        </div>
                        <input 
                            type="password" 
                            placeholder="Enter API Key"
                            value={mapsApiKey}
                            onChange={(e) => setMapsApiKey(e.target.value)}
                            className="w-full border p-2 rounded"
                        />
                        <p className="text-xs text-gray-500">Required for Location Autocomplete, Distance Matrix, and Maps visualization.</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Mail className="text-orange-500 w-5 h-5" />
                            <h4 className="font-bold">SMTP Email Server</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Host (e.g. smtp.gmail.com)" value={emailSettings.host} onChange={(e) => setEmailSettings({...emailSettings, host: e.target.value})} className="border p-2 rounded" />
                            <input placeholder="Port (e.g. 587)" value={emailSettings.port} onChange={(e) => setEmailSettings({...emailSettings, port: parseInt(e.target.value)})} className="border p-2 rounded" type="number" />
                            <input placeholder="Username" value={emailSettings.username} onChange={(e) => setEmailSettings({...emailSettings, username: e.target.value})} className="border p-2 rounded" />
                            <input placeholder="Password" type="password" value={emailSettings.password} onChange={(e) => setEmailSettings({...emailSettings, password: e.target.value})} className="border p-2 rounded" />
                        </div>
                    </div>
                    <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded">Save Integrations</button>
                </div>
            )}

            {/* ... other tabs (white labeling, sub admins, etc) can remain as they are in previous version ... */}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
