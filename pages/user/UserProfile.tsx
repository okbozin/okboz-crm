
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, CreditCard, Shield, 
  Edit2, AlertCircle, Lock, CheckCircle, Eye, EyeOff, Building, Heart, Baby, BookUser, Home,
  Clock, Settings, Upload, Download, Loader2, Paperclip, X, UserX, FileText // Added FileText
} from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee, CorporateAccount } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService'; // Import uploadFileToCloud

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<Employee | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  // Form data for editable fields in profile
  const [profileFormData, setProfileFormData] = useState<Partial<Employee>>({});

  // Password Change State
  const [passwords, setPasswords] = useState({
      current: '',
      new: '',
      confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, newConfirm: false });
  const [msg, setMsg] = useState({ type: '', text: '' }); // General messages for profile and password

  // File Upload States for ID Proofs
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);

  // Helper to find employee by ID across all storage locations
  const findEmployeeById = (id: string): Employee | undefined => {
      // 1. Check Admin Staff
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        let found = adminStaff.find((e: any) => e.id === id);
        if (found) return found;
      } catch(e) {}

      // 2. Check Corporate Staff
      try {
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        for (const corp of corporates) {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
            const found = cStaff.find((e: any) => e.id === id);
            if (found) return found;
        }
      } catch(e) {}

      return MOCK_EMPLOYEES.find(e => e.id === id);
  };

  // Load user data on mount
  useEffect(() => {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (storedSessionId) {
          const found = findEmployeeById(storedSessionId);
          setUser(found || MOCK_EMPLOYEES[0]);
          // Initialize form data with user's current profile, ensure date is in YYYY-MM-DD
          setProfileFormData(found ? { ...found, dob: found.dob ? found.dob.split('T')[0] : '' } : {});
      } else {
          setUser(MOCK_EMPLOYEES[0]);
          setProfileFormData({ ...MOCK_EMPLOYEES[0], dob: MOCK_EMPLOYEES[0].dob ? MOCK_EMPLOYEES[0].dob.split('T')[0] : '' });
      }
  }, []);

  // Update form data if user prop changes (e.g., after a successful save)
  useEffect(() => {
    if (user) {
        setProfileFormData({ ...user, dob: user.dob ? user.dob.split('T')[0] : '' });
    }
  }, [user]);

  // Handle profile form input changes
  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle saving profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Basic validation
    if (!profileFormData.email) {
        setMsg({ type: 'error', text: 'Email is required.' });
        return;
    }

    // Determine the correct storage key based on user's corporateId
    const sessionId = localStorage.getItem('app_session_id');
    const isSuperAdmin = (user.corporateId === 'admin' || !user.corporateId); // User added by admin
    const storageKey = isSuperAdmin ? 'staff_data' : `staff_data_${user.corporateId}`;

    let updated = false;
    try {
        const existingStaff: Employee[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedStaff = existingStaff.map(emp => {
            if (emp.id === user.id) {
                updated = true;
                return { ...emp, ...profileFormData }; // Update all fields from profileFormData
            }
            return emp;
        });

        localStorage.setItem(storageKey, JSON.stringify(updatedStaff));
        if (updated) {
            setUser(prev => ({ ...prev!, ...profileFormData })); // Update local user state
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditingProfile(false);
            setTimeout(() => setMsg({ type: '', text: '' }), 3000);
        } else {
            setMsg({ type: 'error', text: 'Could not find user to update. Contact admin.' });
        }
    } catch (e) {
        console.error("Error saving profile:", e);
        setMsg({ type: 'error', text: 'Failed to save profile. Data might be corrupted.' });
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      if (passwords.current !== user.password) {
          setMsg({ type: 'error', text: 'Current password is incorrect.' });
          return;
      }

      if (passwords.new.length < 6) {
          setMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
          return;
      }

      if (passwords.new !== passwords.confirm) {
          setMsg({ type: 'error', text: 'New passwords do not match.' });
          return;
      }

      // Save Logic
      let updated = false;
      
      const storageKey = user.corporateId ? `staff_data_${user.corporateId}` : 'staff_data';

      try {
        const existingStaff: Employee[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedStaff = existingStaff.map(emp => {
            if (emp.id === user.id) {
                updated = true;
                return { ...emp, password: passwords.new };
            }
            return emp;
        });
        localStorage.setItem(storageKey, JSON.stringify(updatedStaff));
      } catch (e) {
        console.error("Error updating password in local storage:", e);
      }

      if (updated) {
          setMsg({ type: 'success', text: 'Password updated successfully!' });
          setUser({ ...user, password: passwords.new });
          setTimeout(() => {
              setIsEditingPassword(false);
              setMsg({ type: '', text: '' }); // Clear message
              setPasswords({ current: '', new: '', confirm: '' });
              setShowPasswords({ current: false, new: false, newConfirm: false });
          }, 1500);
      } else {
          setMsg({ type: 'error', text: 'Could not update password. Please contact Admin.' });
      }
  };

  const handleIdProofUpload = async (file: File | null, field: 'idProof1Url' | 'idProof2Url') => {
      if (!file || !user) return;

      const setter = field === 'idProof1Url' ? setUploadingAadhar : setUploadingPan;
      setter(true);
      setMsg({ type: '', text: '' });

      try {
          const path = `employee_docs/${user.id}/${field}_${file.name}`;
          const url = await uploadFileToCloud(file, path);

          if (url) {
              setProfileFormData(prev => ({ ...prev, [field]: url }));
              setMsg({ type: 'success', text: `${field.replace('idProof', 'ID Proof ').replace('Url', '')} uploaded successfully!` });
          } else {
              // Fallback to Base64 if cloud upload fails
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              setProfileFormData(prev => ({ ...prev, [field]: base64 }));
              setMsg({ type: 'success', text: `${field.replace('idProof', 'ID Proof ').replace('Url', '')} uploaded (local fallback).` });
          }
      } catch (error) {
          console.error("Upload failed:", error);
          setMsg({ type: 'error', text: `Failed to upload ${field.replace('idProof', 'ID Proof ').replace('Url', '')}.` });
      } finally {
          setter(false);
          setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      }
  };

  const handleRemoveIdProof = (field: 'idProof1Url' | 'idProof2Url') => {
    if (!user || !window.confirm("Are you sure you want to remove this document?")) return;

    setProfileFormData(prev => ({ ...prev, [field]: '' }));
    setMsg({ type: 'success', text: `${field.replace('idProof', 'ID Proof ').replace('Url', '')} removed.` });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const openFileViewer = (url: string, name: string) => {
    // Simple viewer: open in new tab
    if (url) {
        window.open(url, '_blank');
    }
  }


  if (!user) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
           <p className="text-gray-500">Manage your personal information</p>
        </div>
        {!isEditingProfile ? (
            <button 
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
        ) : (
            <div className="flex gap-2">
                <button 
                    onClick={() => { setIsEditingProfile(false); setMsg({ type: '', text: '' }); setProfileFormData({ ...user, dob: user.dob ? user.dob.split('T')[0] : '' }); }} // Reset form data to current user on cancel
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                </button>
            </div>
        )}
      </div>

      {msg.text && (
        <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
            {msg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row justify-between items-end -mt-12 mb-6 gap-4">
            <div className="flex items-end gap-6">
               <img 
                 src={user.avatar} 
                 alt={user.name} 
                 className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white object-cover" 
               />
               <div className="mb-1">
                 <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                 <p className="text-gray-500 font-medium">{user.role}</p>
               </div>
            </div>
            <div className="mb-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {user.status || 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* My Employment Details Card - Directly below profile header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
           <Briefcase className="w-5 h-5 text-emerald-500" />
           My Employment Details
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <User className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Employee ID</p>
                  <p className="text-gray-800 font-medium font-mono">{user.id}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Date of Joining</p>
                  <p className="text-gray-800 font-medium">{new Date(user.joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Department</p>
                  <p className="text-gray-800 font-medium">{user.department || 'N/A'}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <BookUser className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Job Role</p>
                  <p className="text-gray-800 font-medium">{user.role || 'N/A'}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <Building className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Assigned Branch</p>
                  <p className="text-gray-800 font-medium">{user.branch || 'N/A'}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Working Hours (Shift)</p>
                  <p className="text-gray-800 font-medium">{user.workingHours || 'N/A'}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
               <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Weekly Off</p>
                  <p className="text-gray-800 font-medium">{user.weekOff || 'N/A'}</p>
               </div>
            </div>
            {user.corporateId && user.corporateId !== 'admin' && (
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Corporate / Franchise</p>
                        <p className="text-gray-800 font-medium">{user.corporateId || 'N/A'}</p>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* My Personal Settings Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-500" />
          My Personal Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
              <User className="w-4 h-4 text-emerald-500"/> Basic Info
            </h4>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <User className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Full Name</p>
                  {isEditingProfile ? (
                      <input 
                          type="text" 
                          name="name"
                          value={profileFormData.name || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-gray-800 font-medium">{user.name}</p>
                  )}
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Email Address</p>
                  {isEditingProfile ? (
                      <input 
                          type="email" 
                          name="email"
                          value={profileFormData.email || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-gray-800 font-medium break-all">{user.email || 'Not Provided'}</p>
                  )}
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
                  {isEditingProfile ? (
                      <input 
                          type="tel" 
                          name="phone"
                          value={profileFormData.phone || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-gray-800 font-medium">{user.phone || 'Not Provided'}</p>
                  )}
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Date of Birth</p>
                  {isEditingProfile ? (
                      <input 
                          type="date" 
                          name="dob"
                          value={profileFormData.dob || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-gray-800 font-medium">{user.dob || 'Not Provided'}</p>
                  )}
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <BookUser className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Gender</p>
                  {isEditingProfile ? (
                      <select 
                          name="gender"
                          value={profileFormData.gender || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                  ) : (
                      <p className="text-gray-800 font-medium">{user.gender || 'Not Provided'}</p>
                  )}
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <Heart className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Blood Group</p>
                  {isEditingProfile ? (
                      <input 
                          type="text" 
                          name="bloodGroup"
                          value={profileFormData.bloodGroup || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                          placeholder="e.g. O+"
                      />
                  ) : (
                      <p className="text-gray-800 font-medium">{user.bloodGroup || 'Not Provided'}</p>
                  )}
               </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <User className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Marital Status</p>
                  {isEditingProfile ? (
                      <select 
                          name="maritalStatus"
                          value={profileFormData.maritalStatus || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                  ) : (
                      <p className="text-gray-800 font-medium">{user.maritalStatus || 'Not Provided'}</p>
                  )}
               </div>
            </div>
            {profileFormData.maritalStatus === 'Married' && (
                <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                   <User className="w-5 h-5 text-gray-400 mt-0.5" />
                   <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Spouse Name</p>
                      {isEditingProfile ? (
                          <input 
                              type="text" 
                              name="spouseName"
                              value={profileFormData.spouseName || ''} 
                              onChange={handleProfileInputChange}
                              className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                          />
                      ) : (
                          <p className="text-gray-800 font-medium">{user.spouseName || 'Not Provided'}</p>
                      )}
                   </div>
                </div>
            )}
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
               <Baby className="w-5 h-5 text-gray-400 mt-0.5" />
               <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Number of Children</p>
                  {isEditingProfile ? (
                      <input 
                          type="number" 
                          name="children"
                          value={profileFormData.children?.toString() || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-gray-800 font-medium">{user.children ?? 'Not Provided'}</p>
                  )}
               </div>
            </div>
          </section>

          {/* Contact and Emergency Details */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                 <Building className="w-4 h-4 text-emerald-500" />
                 Work & Home Address
               </h4>
               <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                     <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Work Branch</p>
                        <p className="text-gray-800 font-medium">{user.branch || 'Main Branch'}</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                     <Home className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Home Address</p>
                        {isEditingProfile ? (
                            <textarea
                                name="homeAddress"
                                value={profileFormData.homeAddress || ''}
                                onChange={handleProfileInputChange}
                                className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium resize-y"
                                rows={2}
                            />
                        ) : (
                            <p className="text-gray-800 font-medium">{user.homeAddress || 'Not Provided'}</p>
                        )}
                     </div>
                  </div>
               </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                 <Phone className="w-4 h-4 text-orange-500" />
                 Emergency Contact
               </h4>
               <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                     <User className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Contact Name</p>
                        {isEditingProfile ? (
                            <input 
                                type="text" 
                                name="emergencyContactName"
                                value={profileFormData.emergencyContactName || ''} 
                                onChange={handleProfileInputChange}
                                className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium">{user.emergencyContactName || 'Not Provided'}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                     <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
                        {isEditingProfile ? (
                            <input 
                                type="tel" 
                                name="emergencyContactPhone"
                                value={profileFormData.emergencyContactPhone || ''} 
                                onChange={handleProfileInputChange}
                                className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium">{user.emergencyContactPhone || 'Not Provided'}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                     <Heart className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Relationship</p>
                        {isEditingProfile ? (
                            <input 
                                type="text" 
                                name="emergencyContactRelationship"
                                value={profileFormData.emergencyContactRelationship || ''} 
                                onChange={handleProfileInputChange}
                                className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                                placeholder="e.g. Mother, Brother, Friend"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium">{user.emergencyContactRelationship || 'Not Provided'}</p>
                        )}
                     </div>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </form> {/* End of form wrapper */}

      {/* Banking & KYC */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
           <Shield className="w-5 h-5 text-emerald-500" />
           KYC & Banking
         </h3>
         
         <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">PAN Number</p>
                  {isEditingProfile ? (
                      <input 
                          type="text" 
                          name="pan"
                          value={profileFormData.pan || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-sm font-bold text-gray-800 font-mono">{user.pan || 'Not Provided'}</p>
                  )}
               </div>
               <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Aadhar Number</p>
                  {isEditingProfile ? (
                      <input 
                          type="text" 
                          name="aadhar"
                          value={profileFormData.aadhar || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-sm font-bold text-gray-800 font-mono">{user.aadhar || 'Not Provided'}</p>
                  )}
               </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Bank Account Number</p>
                  {isEditingProfile ? (
                      <input 
                          type="text" 
                          name="accountNumber"
                          value={profileFormData.accountNumber || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-sm font-bold text-gray-800 font-mono">{user.accountNumber || 'Not Provided'}</p>
                  )}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">IFSC Code</p>
                  {isEditingProfile ? (
                      <input 
                          type="text" 
                          name="ifsc"
                          value={profileFormData.ifsc || ''} 
                          onChange={handleProfileInputChange}
                          className="w-full p-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500 bg-transparent text-gray-800 font-medium"
                      />
                  ) : (
                      <p className="text-sm font-bold text-gray-800 font-mono">{user.ifsc || 'Not Provided'}</p>
                  )}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4" /> ID Proof Documents
                </h4>
                {/* ID Proof 1 */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        className="hidden" 
                        ref={aadharInputRef} 
                        onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof1Url')} 
                        disabled={!isEditingProfile || uploadingAadhar}
                    />
                    <button 
                        type="button"
                        onClick={() => aadharInputRef.current?.click()}
                        disabled={!isEditingProfile || uploadingAadhar}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileFormData.idProof1Url ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {uploadingAadhar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {profileFormData.idProof1Url ? 'Change Aadhar/ID 1' : 'Upload Aadhar/ID 1'}
                    </button>
                    {profileFormData.idProof1Url && (
                        <div className="flex gap-1">
                            <button 
                                type="button"
                                onClick={() => openFileViewer(profileFormData.idProof1Url!, 'Aadhar')}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                title="View Document"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            {isEditingProfile && (
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveIdProof('idProof1Url')}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Remove Document"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {/* ID Proof 2 */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        className="hidden" 
                        ref={panInputRef} 
                        onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof2Url')} 
                        disabled={!isEditingProfile || uploadingPan}
                    />
                    <button 
                        type="button"
                        onClick={() => panInputRef.current?.click()}
                        disabled={!isEditingProfile || uploadingPan}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileFormData.idProof2Url ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {uploadingPan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {profileFormData.idProof2Url ? 'Change PAN/ID 2' : 'Upload PAN/ID 2'}
                    </button>
                    {profileFormData.idProof2Url && (
                        <div className="flex gap-1">
                            <button 
                                type="button"
                                onClick={() => openFileViewer(profileFormData.idProof2Url!, 'PAN')}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                title="View Document"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            {isEditingProfile && (
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveIdProof('idProof2Url')}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Remove Document"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
               <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
               <p>To update sensitive banking or tax information (or if documents are incorrect), please contact the HR department directly.</p>
            </div>
         </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-500" /> Security
              </h3>
              {!isEditingPassword && (
                  <button 
                    onClick={() => setIsEditingPassword(true)}
                    className="text-sm text-emerald-600 font-medium hover:underline"
                  >
                      Change Password
                  </button>
              )}
          </div>

          {!isEditingPassword ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                  <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  </div>
                  <span className="ml-2">Last changed: Recently</span>
              </div>
          ) : (
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Password</label>
                      <div className="relative">
                          <input 
                              type={showPasswords.current ? "text" : "password"}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={passwords.current}
                              onChange={e => setPasswords({...passwords, current: e.target.value})}
                          />
                          <button type="button" onClick={() => setShowPasswords(p => ({...p, current: !p.current}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                          <div className="relative">
                              <input 
                                  type={showPasswords.new ? "text" : "password"}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  value={passwords.new}
                                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                              />
                              <button type="button" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                          <div className="relative">
                              <input 
                                  type={showPasswords.newConfirm ? "text" : "password"} // Added newConfirm visibility state
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  value={passwords.confirm}
                                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                              />
                              <button type="button" onClick={() => setShowPasswords(p => ({...p, newConfirm: !p.newConfirm}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                  {showPasswords.newConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                  </div>
                  
                  {msg.text && (
                      <div className={`text-xs p-2 rounded flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {msg.type === 'error' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {msg.text}
                      </div>
                  )}

                  <div className="flex gap-3">
                      <button 
                          type="button" 
                          onClick={() => { setIsEditingPassword(false); setMsg({type:'', text:''}); setPasswords({ current: '', new: '', confirm: '' }); setShowPasswords({ current: false, new: false, newConfirm: false });}}
                          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          type="submit"
                          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                          Update Password
                      </button>
                  </div>
              </form>
          )}
      </div>
    </div>
  );
};

export default UserProfile;
