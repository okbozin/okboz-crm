
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, CreditCard, Shield, 
  Edit2, AlertCircle, CheckCircle, Building, Heart, Baby, BookUser, Home,
  Clock, Settings, Upload, Loader2, Paperclip, X, Eye, FileText, Ban
} from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService'; 

// Helper to ensure string fields are never null/undefined for controlled inputs
const ensureString = (value: string | number | null | undefined) => {
    if (typeof value === 'object' && value !== null) return ''; // Prevent [object Object]
    return (value ?? '').toString();
};
// Helper to ensure number fields are never null/undefined for controlled inputs
const ensureNumber = (value: number | null | undefined) => value ?? 0;

const UserProfile: React.FC = () => { 
  const [user, setUser] = useState<Employee | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false); 
  
  // Form data for editable fields in profile
  const [profileFormData, setProfileFormData] = useState<Partial<Employee>>({});

  // Feedback Message
  const [msg, setMsg] = useState<{ type: '' | 'success' | 'error' | 'warning', text: string }>({ type: '', text: '' }); 

  // File Upload States
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);

  // Helper to find employee by ID across all storage locations
  const findEmployeeById = (id: string): Employee | undefined => {
      // 1. Check Admin Staff
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]').filter((item: any) => item && typeof item === 'object');
        let found = adminStaff.find((e: any) => e.id === id);
        if (found) return found;
      } catch(e) {}

      // 2. Check Corporate Staff
      try {
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
        for (const corp of corporates) {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]').filter((item: any) => item && typeof item === 'object');
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
          if (found) {
              setUser(found);
              initializeProfileFormData(found);
          } else {
              setUser(MOCK_EMPLOYEES[0]);
              initializeProfileFormData(MOCK_EMPLOYEES[0]);
          }
      }
  }, []);

  const initializeProfileFormData = (employee: Employee) => {
    setProfileFormData({ 
        ...employee,
        // Basic Info - LOCKED
        name: ensureString(employee.name),
        email: ensureString(employee.email),
        phone: ensureString(employee.phone),
        role: ensureString(employee.role),
        department: ensureString(employee.department),
        branch: ensureString(employee.branch),
        joiningDate: employee.joiningDate,
        
        // Personal Details (Editable)
        dob: employee.dob ? employee.dob.split('T')[0] : '', 
        gender: ensureString(employee.gender),
        bloodGroup: ensureString(employee.bloodGroup),
        maritalStatus: ensureString(employee.maritalStatus),
        spouseName: ensureString(employee.spouseName),
        children: ensureNumber(employee.children),
        homeAddress: ensureString(employee.homeAddress),
        
        // Emergency Contact (Editable)
        emergencyContactName: ensureString(employee.emergencyContactName),
        emergencyContactPhone: ensureString(employee.emergencyContactPhone),
        emergencyContactRelationship: ensureString(employee.emergencyContactRelationship),
        
        // KYC & Banking (Editable)
        aadhar: ensureString(employee.aadhar),
        pan: ensureString(employee.pan),
        accountNumber: ensureString(employee.accountNumber),
        ifsc: ensureString(employee.ifsc),
        upiId: ensureString(employee.upiId),
        
        // Docs
        idProof1Url: ensureString(employee.idProof1Url),
        idProof2Url: ensureString(employee.idProof2Url),
        avatar: ensureString(employee.avatar),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
        setProfileFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setProfileFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Use correct storage key logic
    const storageKey = (user.corporateId && user.corporateId !== 'admin') ? `staff_data_${user.corporateId}` : 'staff_data';

    try {
        const existingStaff: Employee[] = JSON.parse(localStorage.getItem(storageKey) || '[]').filter((item: any) => item && typeof item === 'object');
        
        let updated = false;
        const updatedStaff = existingStaff.map(emp => {
            if (emp.id === user.id) {
                updated = true;
                return { 
                    ...emp, 
                    ...profileFormData,
                    // Prevent overwriting locked fields just in case
                    name: emp.name,
                    email: emp.email,
                    phone: emp.phone,
                    role: emp.role,
                    department: emp.department,
                    branch: emp.branch,
                    joiningDate: emp.joiningDate,
                    children: typeof profileFormData.children === 'number' ? profileFormData.children : ensureNumber(profileFormData.children),
                }; 
            }
            return emp;
        });

        if (updated) {
            localStorage.setItem(storageKey, JSON.stringify(updatedStaff));
            setUser(prev => ({ ...prev!, ...profileFormData })); 
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditingProfile(false);
            setTimeout(() => setMsg({ type: '', text: '' }), 3000);
        } else {
            setMsg({ type: 'error', text: 'Could not update profile in database.' });
        }
    } catch (e) {
        console.error("Error saving profile:", e);
        setMsg({ type: 'error', text: 'Failed to save profile.' });
    }
  };

  // Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
        const path = `avatars/${user.corporateId || 'admin'}/${user.id}_${file.name}`;
        const cloudUrl = await uploadFileToCloud(file, path);
        const finalUrl = cloudUrl || await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });

        setProfileFormData(prev => ({ ...prev, avatar: finalUrl }));
        // Auto-save avatar specifically
        const storageKey = (user.corporateId && user.corporateId !== 'admin') ? `staff_data_${user.corporateId}` : 'staff_data';
        const existingStaff: Employee[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedStaff = existingStaff.map(emp => emp.id === user.id ? { ...emp, avatar: finalUrl } : emp);
        localStorage.setItem(storageKey, JSON.stringify(updatedStaff));
        setUser(prev => ({ ...prev!, avatar: finalUrl }));
        
    } catch (error) {
        console.error("Avatar upload failed", error);
    } finally {
        setUploadingAvatar(false);
    }
  };

  // Doc Upload
  const handleIdProofUpload = async (file: File | null, field: 'idProof1Url' | 'idProof2Url') => {
      if (!file || !user) return;
      const setter = field === 'idProof1Url' ? setUploadingAadhar : setUploadingPan;
      setter(true);
      try {
          const path = `employee_docs/${user.id}/${field}_${file.name}`;
          const cloudUrl = await uploadFileToCloud(file, path);
          const finalUrl = cloudUrl || await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
          });
          setProfileFormData(prev => ({ ...prev, [field]: finalUrl }));
          setMsg({ type: 'success', text: 'Document uploaded!' });
      } catch (error) {
          setMsg({ type: 'error', text: 'Upload failed.' });
      } finally {
          setter(false);
      }
  };

  const openFileViewer = (url: string) => window.open(url, '_blank');

  if (!user || !Object.keys(profileFormData).length) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
           <p className="text-gray-500">View and manage your personal information</p>
        </div>
        {!isEditingProfile ? (
            <button 
                onClick={() => {setIsEditingProfile(true); setMsg({ type: '', text: '' });}}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
        ) : (
            <div className="flex gap-3">
                <button 
                    onClick={() => { 
                      setIsEditingProfile(false); 
                      setMsg({ type: '', text: '' }); 
                      initializeProfileFormData(user); 
                    }} 
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <CheckCircle className="w-4 h-4" /> Save Changes
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

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Core Work Info (Read Only) */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center">
                <div className="relative mb-4 group">
                    <div className="w-32 h-32 rounded-full p-1 bg-white border-2 border-emerald-100 shadow-sm overflow-hidden">
                        <img 
                            src={profileFormData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    {/* Avatar edit overlay - only if editing */}
                    {isEditingProfile && (
                        <div 
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        >
                            <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                            {uploadingAvatar ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
                        </div>
                    )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-500 font-medium">{user.role}</p>
                <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">{user.status}</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">{user.id}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Employment Data
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Department</span>
                        <span className="font-medium text-gray-900">{user.department}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Branch</span>
                        <span className="font-medium text-gray-900">{user.branch || 'Main Branch'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Joining Date</span>
                        <span className="font-medium text-gray-900">{new Date(user.joiningDate).toLocaleDateString()}</span>
                    </div>
                    {user.corporateId && user.corporateId !== 'admin' && (
                        <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-500">Corporate</span>
                            <span className="font-medium text-gray-900">{user.corporateId}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Editable Forms */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Identity Information - LOCKED */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" /> Identity Information
                    </h4>
                    {isEditingProfile && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Protected Fields
                        </span>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                value={profileFormData.name} 
                                readOnly 
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                value={profileFormData.email} 
                                readOnly 
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                value={profileFormData.phone} 
                                readOnly 
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal Details - Editable */}
            <div className={`bg-white rounded-xl shadow-sm border p-6 ${isEditingProfile ? 'border-blue-200 ring-1 ring-blue-50' : 'border-gray-200'}`}>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" /> Personal Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                        <input 
                            type="date" 
                            name="dob"
                            value={profileFormData.dob} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                        <select 
                            name="gender"
                            value={profileFormData.gender} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                        >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Blood Group</label>
                        <input 
                            type="text" 
                            name="bloodGroup"
                            value={profileFormData.bloodGroup} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marital Status</label>
                        <select 
                            name="maritalStatus"
                            value={profileFormData.maritalStatus} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                        >
                            <option value="">Select</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                        </select>
                    </div>
                    {profileFormData.maritalStatus === 'Married' && (
                        <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Spouse Name</label>
                            <input 
                                type="text" 
                                name="spouseName"
                                value={profileFormData.spouseName} 
                                onChange={handleInputChange}
                                disabled={!isEditingProfile}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Children</label>
                            <input 
                                type="number" 
                                name="children"
                                value={profileFormData.children} 
                                onChange={handleInputChange}
                                disabled={!isEditingProfile}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        </>
                    )}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Home Address</label>
                        <textarea 
                            name="homeAddress"
                            rows={2}
                            value={profileFormData.homeAddress} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Emergency Contact - Editable */}
            <div className={`bg-white rounded-xl shadow-sm border p-6 ${isEditingProfile ? 'border-orange-200 ring-1 ring-orange-50' : 'border-gray-200'}`}>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-orange-500" /> Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Name</label>
                        <input 
                            type="text" 
                            name="emergencyContactName"
                            value={profileFormData.emergencyContactName} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Phone</label>
                        <input 
                            type="tel" 
                            name="emergencyContactPhone"
                            value={profileFormData.emergencyContactPhone} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Relationship</label>
                        <input 
                            type="text" 
                            name="emergencyContactRelationship"
                            value={profileFormData.emergencyContactRelationship} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Banking & KYC - Editable */}
            <div className={`bg-white rounded-xl shadow-sm border p-6 ${isEditingProfile ? 'border-purple-200 ring-1 ring-purple-50' : 'border-gray-200'}`}>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-500" /> Banking & KYC
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Aadhar Number</label>
                        <input 
                            type="text" 
                            name="aadhar"
                            value={profileFormData.aadhar} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PAN Number</label>
                        <input 
                            type="text" 
                            name="pan"
                            value={profileFormData.pan} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Account No.</label>
                        <input 
                            type="text" 
                            name="accountNumber"
                            value={profileFormData.accountNumber} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IFSC Code</label>
                        <input 
                            type="text" 
                            name="ifsc"
                            value={profileFormData.ifsc} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UPI ID</label>
                        <input 
                            type="text" 
                            name="upiId"
                            value={profileFormData.upiId} 
                            onChange={handleInputChange}
                            disabled={!isEditingProfile}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-4 space-y-4">
                     <h5 className="font-medium text-gray-700 text-sm">Upload Documents</h5>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                            <input type="file" ref={aadharInputRef} onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof1Url')} className="hidden" accept="image/*,.pdf" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-gray-600">ID Proof 1 (Aadhar)</p>
                                {profileFormData.idProof1Url ? (
                                    <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Uploaded</span>
                                ) : (
                                    <span className="text-[10px] text-gray-400">Not uploaded</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {profileFormData.idProof1Url && (
                                    <button onClick={() => openFileViewer(profileFormData.idProof1Url!)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Eye className="w-4 h-4"/></button>
                                )}
                                <button 
                                    onClick={() => aadharInputRef.current?.click()} 
                                    disabled={!isEditingProfile || uploadingAadhar}
                                    className="text-gray-500 hover:bg-gray-100 p-1.5 rounded disabled:opacity-50"
                                >
                                    {uploadingAadhar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                </button>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                            <input type="file" ref={panInputRef} onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof2Url')} className="hidden" accept="image/*,.pdf" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-gray-600">ID Proof 2 (PAN)</p>
                                {profileFormData.idProof2Url ? (
                                    <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Uploaded</span>
                                ) : (
                                    <span className="text-[10px] text-gray-400">Not uploaded</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {profileFormData.idProof2Url && (
                                    <button onClick={() => openFileViewer(profileFormData.idProof2Url!)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Eye className="w-4 h-4"/></button>
                                )}
                                <button 
                                    onClick={() => panInputRef.current?.click()} 
                                    disabled={!isEditingProfile || uploadingPan}
                                    className="text-gray-500 hover:bg-gray-100 p-1.5 rounded disabled:opacity-50"
                                >
                                    {uploadingPan ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

export default UserProfile;
