
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, Lock as LockIcon, 
  LogOut, Cloud, Database, Globe, Palette, Save,
  UploadCloud, DownloadCloud, Loader2, Map as MapIcon, Check,
  Users, Target, Building2, Car, Wallet, MapPin, Truck, Layers, RefreshCw, Eye,
  Phone, DollarSign, Plane, Briefcase as BriefcaseIcon, Clock, Calendar, X,
  EyeOff, AlertCircle, Info, ExternalLink, IndianRupee
} from 'lucide-react';
import { 
  HARDCODED_FIREBASE_CONFIG, getCloudDatabaseStats,
  syncToCloud, restoreFromCloud 
} from '../../services/cloudService';
import { useBranding } from '../../context/BrandingContext';

const Settings: React.FC = () => {
  const { companyName, primaryColor, updateBranding } = useBranding();
  const [stats, setStats] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'Connected' | 'Disconnected' | 'Error'>('Disconnected');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [collectionStats, setCollectionStats] = useState<any[]>([]);

  // Local state for branding form
  const [brandName, setBrandName] = useState(companyName);
  const [brandColor, setBrandColor] = useState(primaryColor);

  // Maps API Key State
  const [mapsKey, setMapsKey] = useState(localStorage.getItem('maps_api_key') || '');
  const [showMapsInput, setShowMapsInput] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Collection Viewer Modal State
  const [showCollectionViewer, setShowCollectionViewer] = useState(false);
  const [currentViewingCollection, setCurrentViewingCollection] = useState<string | null>(null);
  const [collectionContent, setCollectionContent] = useState<any[] | string | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const isPermanent = !!(HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5);

  useEffect(() => {
    try {
      if (isSuperAdmin) {
        checkConnection();
      }
    } catch (e) {
      console.error("Connection check failed on mount", e);
    }
  }, [isSuperAdmin]);

  const generateCollectionStats = (cloudData: any) => {
    const collections = [
        { key: 'staff_data', label: 'Staff Records', icon: Users, color: 'text-gray-600' },
        { key: 'leads_data', label: 'Active Leads', icon: Target, color: 'text-gray-600' },
        { key: 'corporate_accounts', label: 'Corporate Accounts', icon: Building2, color: 'text-gray-600' },
        { key: 'vendor_data', label: 'Vehicle Vendors', icon: Layers, color: 'text-gray-600' },
        { key: 'driver_payments_data', label: 'Driver Payments', icon: Car, color: 'text-gray-600' }, // New
        { key: 'office_expenses', label: 'Finance & Expenses', icon: Wallet, color: 'text-gray-600' },
        { key: 'branches_data', label: 'Branches', icon: MapPin, color: 'text-gray-600' },
        { key: 'trips_data', label: 'Trips', icon: Truck, color: 'text-gray-600' },
        { key: 'global_enquiries_data', label: 'Customer Enquiries', icon: Globe, color: 'text-gray-600' },
        { key: 'call_enquiries_history', label: 'Call History', icon: Phone, color: 'text-gray-600' },
        { key: 'reception_recent_transfers', label: 'Reception Transfers', icon: Layers, color: 'text-gray-600' },
        { key: 'payroll_history', label: 'Payroll History', icon: DollarSign, color: 'text-gray-600' },
        { key: 'leave_history', label: 'Leave History', icon: Plane, color: 'text-gray-600' },
        { key: 'app_settings', label: 'App Settings', icon: SettingsIcon, color: 'text-gray-600' },
        { key: 'transport_pricing_rules_v2', label: 'Transport Prices', icon: Car, color: 'text-gray-600' },
        { key: 'transport_rental_packages_v2', label: 'Rental Packages', icon: BriefcaseIcon, color: 'text-gray-600' },
        { key: 'company_departments', label: 'Departments', icon: Building2, color: 'text-gray-600' },
        { key: 'company_roles', label: 'Roles', icon: BriefcaseIcon, color: 'text-gray-600' },
        { key: 'company_shifts', label: 'Shifts', icon: Clock, color: 'text-gray-600' },
        { key: 'company_payout_dates', label: 'Payout Dates', icon: Calendar, color: 'text-gray-600' },
        { key: 'company_global_payout_day', label: 'Global Payout Day', icon: Calendar, color: 'text-gray-600' },
        { key: 'salary_advances', label: 'Salary Advances', icon: Wallet, color: 'text-gray-600' },
        { key: 'app_branding', label: 'App Branding', icon: Palette, color: 'text-gray-600' },
        { key: 'app_theme', label: 'App Theme', icon: Palette, color: 'text-gray-600' },
        { key: 'maps_api_key', label: 'Maps API Key', icon: MapIcon, color: 'text-gray-600' },
    ];

    return collections.map(col => {
        // Get Local Count
        let localCount: string | number = 0; 
        let localContent: any = null;
        let localStr: string | null = null;
        try {
            localStr = localStorage.getItem(col.key);
            if (localStr) {
                localContent = JSON.parse(localStr);
                localCount = Array.isArray(localContent) ? localContent.length : 1; 
            }
        } catch(e) {
            localCount = 'Err'; 
            localContent = localStr; 
        }

        // Get Cloud Count
        let cloudCount: string | number = '-';
        if (cloudData && cloudData[col.key]) {
            cloudCount = cloudData[col.key].count as string | number;
        }

        return {
            ...col,
            local: localCount,
            localContent: localContent,
            cloud: cloudCount,
            status: 'Synced' 
        };
    });
  };

  const checkConnection = async () => {
    setIsRefreshing(true);
    try {
      const s = await getCloudDatabaseStats();
      
      const statsList = generateCollectionStats(s);
      setCollectionStats(statsList);

      if (s) {
        setStats(s);
        setDbStatus('Connected');
      } else {
        setDbStatus('Disconnected');
      }
    } catch (e) {
      console.error("Failed to check connection", e);
      setDbStatus('Error');
    } finally {
        setIsRefreshing(false);
    }
  };

  const handleSaveBranding = () => {
    updateBranding({ companyName: brandName, primaryColor: brandColor });
    alert("Site settings saved!");
  };

  const handleSaveMapsKey = async () => {
      if (!mapsKey.trim()) {
          alert("Please enter a valid API Key.");
          return;
      }

      setIsSavingKey(true);
      
      // 1. Save locally immediately to ensure it works offline
      localStorage.setItem('maps_api_key', mapsKey);
      
      try {
          // 2. Try to sync to cloud
          await syncToCloud();
          alert("Maps Key Saved! The page will now reload.");
      } catch (e) {
          console.warn("Cloud sync failed:", e);
          // Don't show error page, just warn
          alert("Key saved locally (Offline Mode). The page will reload to apply changes.");
      } finally {
          setIsSavingKey(false);
          setShowMapsInput(false);
          window.location.reload();
      }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
        const result = await syncToCloud();
        alert(result.message);
        checkConnection();
    } catch (e) {
        alert("Backup failed. Check internet connection.");
    }
    setIsBackingUp(false);
  };

  const handleRestore = async () => {
    if (window.confirm("⚠️ WARNING: Restoring will overwrite all current local data with data from the Cloud. Are you sure?")) {
        setIsRestoring(true);
        try {
            const result = await restoreFromCloud();
            alert(result.message);
            if (result.success) {
                window.location.reload();
            }
        } catch (e) {
            alert("Restore failed.");
        }
        setIsRestoring(false);
    }
  };

  const handleViewCollection = (collectionKey: string, content: any) => {
    setCurrentViewingCollection(collectionKey);
    setCollectionError(null);

    if (content === null || content === undefined || (typeof content === 'string' && content.trim() === '')) {
        setCollectionContent("No data available locally.");
    } else if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            setCollectionContent(parsed);
        } catch (e) {
            setCollectionContent(content); 
            setCollectionError("Content is not valid JSON.");
        }
    } else {
        setCollectionContent(content);
    }
    setShowCollectionViewer(true);
  };

  const closeCollectionViewer = () => {
    setShowCollectionViewer(false);
    setCurrentViewingCollection(null);
    setCollectionContent(null);
    setCollectionError(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordMessage(null); 

      if (newPassword.length < 6) {
          setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
          return;
      }
      if (newPassword !== confirmNewPassword) {
          setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
          return;
      }

      if (isSuperAdmin) {
          const storedAdminPass = localStorage.getItem('admin_password') || '123456';
          if (currentPassword !== storedAdminPass) {
              setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' });
              return;
          }
          localStorage.setItem('admin_password', newPassword);
      } else {
          // Corporate Logic
          try {
              const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
              // Find the corporate account using sessionId (which is the email)
              const accountIndex = accounts.findIndex((a: any) => a.email === sessionId);
              
              if (accountIndex === -1) {
                  setPasswordMessage({ type: 'error', text: 'Account not found. Please re-login.' });
                  return;
              }
              
              if (accounts[accountIndex].password !== currentPassword) {
                  setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' });
                  return;
              }
              
              accounts[accountIndex].password = newPassword;
              localStorage.setItem('corporate_accounts', JSON.stringify(accounts));
          } catch(e) {
              setPasswordMessage({ type: 'error', text: 'Error updating password.' });
              return;
          }
      }

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswords({ current: false, new: false, confirm: false });

      setTimeout(() => setPasswordMessage(null), 3000); 
  };


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" /> Site Settings
        </h2>
        <p className="text-gray-500">System configuration and security management</p>
      </div>

      {isSuperAdmin && (
      <>
        {/* API Key Missing Warning */}
        {!mapsKey && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 shrink-0" />
                <div>
                    <h3 className="font-bold text-red-800">Google Maps API Key Missing</h3>
                    <p className="text-sm text-red-700 mt-1">
                        Live Tracking, Pickup/Drop Autocomplete, and Map views will <strong>not work</strong> without a valid API Key.
                        <br/>Please add your key in the "Integrations" section below.
                    </p>
                    <button 
                        onClick={() => setShowMapsInput(true)} 
                        className="mt-2 text-sm font-bold text-red-800 hover:underline"
                    >
                        Add Key Now &rarr;
                    </button>
                </div>
            </div>
        )}

        {/* General / Branding Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" /> General Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (App Title)</label>
                <input 
                    type="text" 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. OK BOZ CRM"
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme Primary Color</label>
                <div className="flex items-center gap-3">
                    <input 
                        type="color" 
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-20 p-1 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <span className="text-sm font-mono text-gray-500">{brandColor}</span>
                </div>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                onClick={handleSaveBranding}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                >
                <Save className="w-4 h-4" /> Save Changes
                </button>
            </div>
        </div>

        {/* Integrations Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">Integrations</h3>
            <div className="space-y-4">
                <div className={`p-4 border rounded-lg ${!mapsKey ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 rounded text-yellow-600">
                            <MapIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Google Maps API</h4>
                            <p className="text-xs text-gray-500">For location tracking and address search</p>
                        </div>
                    </div>
                    <button 
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${!mapsKey ? 'bg-red-600 text-white hover:bg-red-700' : 'text-blue-600 hover:underline border border-blue-200 hover:bg-blue-50'}`}
                        onClick={() => setShowMapsInput(!showMapsInput)}
                    >
                        {showMapsInput ? 'Cancel' : (mapsKey ? 'Edit Key' : 'Configure Now')}
                    </button>
                </div>
                
                {showMapsInput && (
                    <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                        {/* INSTRUCTIONS BLOCK */}
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                            <h5 className="font-bold flex items-center gap-2 mb-2 text-blue-900">
                                <Info className="w-4 h-4"/> Steps to Enable Google Maps:
                            </h5>
                            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-blue-800">
                                <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3"/></a>.</li>
                                <li>Create a new project (or select an existing one).</li>
                                <li><strong className="text-red-600">Crucial:</strong> Enable Billing for your project (Maps API requires a billing account, though there is a free tier).</li>
                                <li>Go to <strong>APIs & Services {'>'} Library</strong> and enable these 3 APIs:
                                    <ul className="list-disc pl-5 mt-1 font-semibold">
                                        <li>Maps JavaScript API</li>
                                        <li>Places API (New)</li>
                                        <li>Distance Matrix API</li>
                                    </ul>
                                </li>
                                <li>Go to <strong>APIs & Services {'>'} Credentials</strong>.</li>
                                <li>Click <strong>Create Credentials {'>'} API Key</strong>.</li>
                                <li>Copy the generated key and paste it below.</li>
                            </ol>
                        </div>

                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Enter API Key</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={mapsKey}
                                onChange={(e) => setMapsKey(e.target.value)}
                                placeholder="Paste your AIza... API Key here"
                                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button 
                                onClick={handleSaveMapsKey}
                                disabled={isSavingKey}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm disabled:opacity-50 transition-colors"
                            >
                                {isSavingKey ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}
                                Save & Apply
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>

        {/* Cloud Sync Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" /> Cloud Database
            </h3>
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                dbStatus === 'Connected' ? 'bg-green-100 text-green-700' : 
                dbStatus === 'Error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}>
                <div className={`w-2 h-2 rounded-full ${
                dbStatus === 'Connected' ? 'bg-green-500' : dbStatus === 'Error' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                {dbStatus}
            </div>
            </div>
            
            <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Connection Info
                    </h4>
                    <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                        <span className="opacity-70">Project ID:</span>
                        <span className="font-mono font-bold">{HARDCODED_FIREBASE_CONFIG.projectId || 'Not Configured'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Status:</span>
                        <span className="font-bold">{isPermanent ? 'Permanent Link' : 'Temporary'}</span>
                    </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-700 mb-2">Database Stats</h4>
                    {stats ? (
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Collections:</span>
                            <span className="font-bold text-gray-900">{stats ? Object.keys(stats).length : 0}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Staff Records:</span>
                            <span className="font-bold text-gray-900">{stats['staff_data']?.count || 0}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Last Cloud Update:</span>
                            <span className="font-bold text-gray-900">
                                {stats['staff_data']?.lastUpdated ? new Date(stats['staff_data'].lastUpdated).toLocaleDateString() : '-'}
                            </span>
                        </div>
                    </div>
                    ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                        {dbStatus === 'Connected' ? 'Loading stats...' : 'No connection'}
                    </div>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center mt-4">
                <span className="text-xs text-gray-400">
                    {isPermanent ? '🔒 Connected via Hardcoded Config' : 'ℹ️ Using Temporary Config'}
                </span>
                
                <div className="flex gap-3">
                    {/* Backup & Restore Controls */}
                    <button 
                        onClick={handleRestore}
                        disabled={isRestoring || dbStatus !== 'Connected'}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isRestoring ? <Loader2 className="w-4 h-4 animate-spin"/> : <DownloadCloud className="w-4 h-4" />}
                        Restore
                    </button>
                    <button 
                        onClick={handleBackup}
                        disabled={isBackingUp || dbStatus !== 'Connected'}
                        className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4" />}
                        Backup
                    </button>

                    {!isPermanent && (
                        <button 
                            onClick={() => { localStorage.removeItem('firebase_config'); window.location.reload(); }}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> Disconnect
                        </button>
                    )}
                </div>
            </div>
            </div>
        </div>

        {/* --- LIVE DATA COLLECTIONS SECTION --- */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-500" /> LIVE DATA COLLECTIONS
                </h3>
                <button 
                    onClick={checkConnection}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-70"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collectionStats.map(stat => (
                    <div key={stat.key} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-gray-600 border border-gray-100">
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                {stat.status}
                            </span>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-800 text-lg mb-4">{stat.label}</h4>
                            <div className="flex items-center text-sm bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <div className="flex-1">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1 tracking-wider">Local</span>
                                    <span className="text-xl font-bold text-gray-800">{stat.local}</span>
                                </div>
                                <div className="w-px h-8 bg-gray-200 mx-4"></div>
                                <div className="flex-1 text-right">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1 tracking-wider">Cloud</span>
                                    <span className="text-xl font-bold text-blue-600">{stat.cloud}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button 
                                onClick={() => handleViewCollection(stat.key, stat.localContent)}
                                className="w-full px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Eye className="w-4 h-4" /> View Items
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </>
      )}
      
      {/* Security & Account Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-red-500" /> Security & Account
          </h3>
          <div className="space-y-4">
              {/* Change Password Card */}
              <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <LockIcon className="w-4 h-4 text-gray-500" /> {isSuperAdmin ? 'Change Admin Password' : 'Change Password'}
                  </h4>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                          <div className="relative">
                              <input
                                  type={showPasswords.current ? "text" : "password"}
                                  value={currentPassword}
                                  onChange={(e) => setCurrentPassword(e.target.value)}
                                  className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                  placeholder="••••••••"
                                  required
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <div className="relative">
                              <input
                                  type={showPasswords.new ? "text" : "password"}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="••••••••"
                                  required
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                          <div className="relative">
                              <input
                                  type={showPasswords.confirm ? "text" : "password"}
                                  value={confirmNewPassword}
                                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                                  className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="••••••••"
                                  required
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      {passwordMessage && (
                          <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${passwordMessage.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                              {passwordMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                              <span>{passwordMessage.text}</span>
                          </div>
                      )}
                      <div className="pt-2 flex justify-end">
                          <button
                              type="submit"
                              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                          >
                              <Save className="w-4 h-4" /> Update Password
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>

      {/* Collection Viewer Modal */}
      {showCollectionViewer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">Viewing Collection: {currentViewingCollection}</h3>
              <button onClick={closeCollectionViewer} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 text-sm bg-gray-50 text-gray-800 font-mono">
                {collectionError ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-center">
                        {collectionError}
                    </div>
                ) : (
                    <>
                        {Array.isArray(collectionContent) ? (
                            collectionContent.length > 0 ? (
                                <ul className="space-y-3">
                                    {collectionContent.map((item, index) => (
                                        <li key={index} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                            <pre className="whitespace-pre-wrap break-all text-xs">
                                                {JSON.stringify(item, null, 2)}
                                            </pre>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500">This collection is empty.</p>
                            )
                        ) : (
                            typeof collectionContent === 'object' && collectionContent !== null ? (
                                <pre className="whitespace-pre-wrap break-all text-xs">
                                    {JSON.stringify(collectionContent, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-center text-gray-500">{collectionContent || "No content available."}</p>
                            )
                        )}
                    </>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
              <button 
                onClick={closeCollectionViewer} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
