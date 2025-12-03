
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Lock as LockIcon, 
  LogOut, Cloud, Database, Globe, Palette, Save,
  UploadCloud, DownloadCloud, Loader2, Map as MapIcon, Check
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

  // Local state for branding form
  const [brandName, setBrandName] = useState(companyName);
  const [brandColor, setBrandColor] = useState(primaryColor);

  // Maps API Key State
  const [mapsKey, setMapsKey] = useState(localStorage.getItem('maps_api_key') || '');
  const [showMapsInput, setShowMapsInput] = useState(false);

  const isPermanent = !!(HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const s = await getCloudDatabaseStats();
    if (s) {
      setStats(s);
      setDbStatus('Connected');
    } else {
      setDbStatus('Disconnected');
    }
  };

  const handleSaveBranding = () => {
    updateBranding({ companyName: brandName, primaryColor: brandColor });
    alert("Site settings saved!");
  };

  const handleSaveMapsKey = () => {
      localStorage.setItem('maps_api_key', mapsKey);
      setShowMapsInput(false);
      alert("Google Maps API Key saved. Please refresh the page to apply changes.");
      window.location.reload();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" /> Site Settings
        </h2>
        <p className="text-gray-500">System configuration, branding, and data management</p>
      </div>

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

      {/* Cloud Sync Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" /> Cloud Database
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
            dbStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
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
                         <span className="font-bold text-gray-900">{Object.keys(stats).length}</span>
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
      
      {/* Integrations Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
         <h3 className="font-bold text-gray-800 mb-4">Integrations</h3>
         <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
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
                      className="text-xs font-bold text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      onClick={() => setShowMapsInput(!showMapsInput)}
                   >
                      {showMapsInput ? 'Cancel' : (mapsKey ? 'Edit Key' : 'Configure')}
                   </button>
               </div>
               
               {showMapsInput && (
                   <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                       <div className="flex gap-2">
                           <input 
                               type="text" 
                               value={mapsKey}
                               onChange={(e) => setMapsKey(e.target.value)}
                               placeholder="Paste your AIza... API Key here"
                               className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                           />
                           <button 
                               onClick={handleSaveMapsKey}
                               className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm"
                           >
                               <Check className="w-4 h-4" /> Save
                           </button>
                       </div>
                       <p className="text-[10px] text-gray-400 mt-1">Get this key from Google Cloud Console (Maps JavaScript API)</p>
                   </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Settings;
