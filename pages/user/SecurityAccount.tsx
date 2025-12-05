
import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee, UserRole } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';

const SecurityAccount: React.FC = () => {
  const [user, setUser] = useState<Employee | null>(null);
  
  const [passwords, setPasswords] = useState({
      current: '',
      new: '',
      confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, newConfirm: false });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      } else {
          setUser(MOCK_EMPLOYEES[0]);
      }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      setMessage(null); // Clear previous messages

      if (passwords.current !== user.password) {
          setMessage({ type: 'error', text: 'Current password is incorrect.' });
          return;
      }

      if (passwords.new.length < 6) {
          setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
          return;
      }

      if (passwords.new !== passwords.confirm) {
          setMessage({ type: 'error', text: 'New passwords do not match.' });
          return;
      }

      // Save Logic
      let updated = false;
      
      // Determine the correct storage key based on user's corporateId
      const isSuperAdmin = (user.corporateId === 'admin' || !user.corporateId); // User added by admin
      const storageKey = isSuperAdmin ? 'staff_data' : `staff_data_${user.corporateId}`;

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
          setMessage({ type: 'success', text: 'Password updated successfully!' });
          setUser({ ...user, password: passwords.new });
          
          // Send system notification to Admin/Corporate
          // This ensures Super Admin and relevant Franchise Panel receive the alert
          await sendSystemNotification({
              type: 'security',
              title: 'Password Changed',
              message: `${user.name} has updated their password.`,
              targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
              corporateId: user.corporateId === 'admin' ? undefined : user.corporateId,
              employeeId: user.id,
              link: '/admin/staff'
          });

          setTimeout(() => {
              setMessage(null); // Clear message
              setPasswords({ current: '', new: '', confirm: '' });
              setShowPasswords({ current: false, new: false, newConfirm: false });
          }, 1500);
      } else {
          setMessage({ type: 'error', text: 'Could not update password. Please contact Admin.' });
      }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Loading security settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Lock className="w-6 h-6 text-emerald-600" /> Security & Account
        </h2>
        <p className="text-gray-500">Manage your account security settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-500" /> Change My Password
        </h3>
        
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Password</label>
                <div className="relative">
                    <input 
                        type={showPasswords.current ? "text" : "password"}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={passwords.current}
                        onChange={e => setPasswords(p => ({...p, current: e.target.value}))}
                        required
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
                            onChange={e => setPasswords(p => ({...p, new: e.target.value}))}
                            required
                        />
                        <button type="button" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New Password</label>
                    <div className="relative">
                        <input 
                            type={showPasswords.newConfirm ? "text" : "password"}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={passwords.confirm}
                            onChange={e => setPasswords(p => ({...p, confirm: e.target.value}))}
                            required
                        />
                        <button type="button" onClick={() => setShowPasswords(p => ({...p, newConfirm: !p.newConfirm}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPasswords.newConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
            
            {message && (
                <div className={`text-xs p-2 rounded flex items-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.type === 'error' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {message.text}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button 
                    type="button" 
                    onClick={() => { 
                        setPasswords({ current: '', new: '', confirm: '' }); 
                        setShowPasswords({ current: false, new: false, newConfirm: false }); 
                        setMessage(null);
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-gray-300"
                >
                    Clear Form
                </button>
                <button 
                    type="submit"
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    Update Password
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityAccount;
