
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Send, FileText, PieChart } from 'lucide-react';
import { Employee, LeaveRequest, UserRole } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';
import { sendSystemNotification } from '../../services/cloudService'; // Import notification service

const ApplyLeave: React.FC = () => {
  const [user, setUser] = useState<Employee | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // rawHistory will hold ALL leave requests from local storage
  const [rawHistory, setRawHistory] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('leave_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse leave history from local storage", e);
      }
    }
    return [];
  });

  // userLeaveHistory will be a filtered view for the current user
  const userLeaveHistory = useMemo(() => {
    if (!user) return [];
    return rawHistory.filter(h => h.employeeId === user.id)
                     .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime());
  }, [rawHistory, user]);


  // Helper to find employee by ID across all storage locations and inject corporateId
  const findEmployeeById = (id: string): Employee | undefined => {
      // 1. Check Admin Staff
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        let found = adminStaff.find((e: any) => e.id === id);
        if (found) return { ...found, corporateId: 'admin' }; // Explicitly set admin corporateId
      } catch(e) {}

      // 2. Check Corporate Staff
      try {
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        for (const corp of corporates) {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
            const found = cStaff.find((e: any) => e.id === id);
            if (found) return { ...found, corporateId: corp.email }; // Explicitly inject corporateId
        }
      } catch(e) {}

      // 3. Check Mocks
      return MOCK_EMPLOYEES.find(e => e.id === id);
  };

  // 1. Load User
  useEffect(() => {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (storedSessionId) {
          const found = findEmployeeById(storedSessionId);
          setUser(found || MOCK_EMPLOYEES[0]);
      } else {
          setUser(MOCK_EMPLOYEES[0]);
      }
  }, []);

  // 2. Load Leave Settings based on User's Corporate ID (Strict Match)
  useEffect(() => {
      if (user) {
          // Determine the correct key for leave settings
          // If the user belongs to a corporate, fetch THAT corporate's settings.
          // Fallback to admin ONLY if explicitly admin or undefined.
          const corpId = user.corporateId || 'admin';
          const key = corpId === 'admin' ? 'company_leave_types' : `company_leave_types_${corpId}`;
          
          console.log(`Loading leave settings for: ${corpId} (Key: ${key})`);

          let loadedTypes = [];
          const saved = localStorage.getItem(key);
          
          if (saved) {
              try {
                  loadedTypes = JSON.parse(saved);
              } catch(e) { console.error("Error parsing leave types", e); }
          }

          // Fallback if no specific settings found, verify if global defaults exist
          if (loadedTypes.length === 0) {
              // Try loading global defaults if not found for specific corp
              const globalSaved = localStorage.getItem('company_leave_types');
              if (globalSaved) {
                 try { loadedTypes = JSON.parse(globalSaved); } catch(e) {}
              }
          }

          // Ultimate Fallback
          if (loadedTypes.length === 0) {
              loadedTypes = [
                  { id: 'cl', name: 'Casual Leave', quota: 12 },
                  { id: 'sl', name: 'Sick Leave', quota: 8 },
                  { id: 'pl', name: 'Privilege Leave', quota: 15 }
              ];
          }
          
          setLeaveTypes(loadedTypes);
          
          // Set default type for form
          if (loadedTypes.length > 0) {
              setFormData(prev => ({ ...prev, type: loadedTypes[0].name }));
          }
      }
  }, [user]);

  // Persist rawHistory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leave_history', JSON.stringify(rawHistory));
  }, [rawHistory]);

  // 3. Calculate Balances Dynamically
  const balances = useMemo(() => {
      const colors = [
          { text: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
          { text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
          { text: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
          { text: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' },
          { text: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' },
      ];

      return leaveTypes.map((lt, index) => {
          // Calculate used days for this leave type (Approved only) for THIS user
          // Filter history by current user ID to avoid mixup if using shared storage
          const used = userLeaveHistory
              .filter(h => h.status === 'Approved' && h.type === lt.name)
              .reduce((sum, h) => sum + h.days, 0);
          
          const style = colors[index % colors.length];

          return {
              type: lt.name,
              available: Math.max(0, lt.quota - used),
              total: lt.quota,
              color: style.text,
              bg: style.bg,
              bar: style.bar
          };
      });
  }, [leaveTypes, userLeaveHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 'endDate' is now optional
    if (!formData.startDate || !formData.reason) {
      alert("Please fill in all required fields (From Date and Reason).");
      return;
    }

    const start = new Date(formData.startDate);
    const end = formData.endDate ? new Date(formData.endDate) : start; // If endDate is empty, it's a single day leave
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (start < today) {
       alert("You cannot apply for leave in the past.");
       return;
    }

    if (end < start) {
      alert("End date cannot be earlier than start date.");
      return;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    // +1 to include both start and end day
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

    const newLeave: LeaveRequest = {
      id: Date.now(),
      type: formData.type,
      from: formData.startDate,
      to: formData.endDate || formData.startDate, // If endDate is empty, set to startDate
      days: isNaN(days) ? 1 : days,
      status: 'Pending',
      reason: formData.reason,
      appliedOn: new Date().toISOString().split('T')[0],
      corporateId: user?.corporateId, // Store corporate context
      employeeId: user?.id // Tag with user ID
    };

    // Update the raw history, which will then trigger userLeaveHistory to re-memoize
    setRawHistory(prev => [newLeave, ...prev]);

    setFormData({ type: leaveTypes[0]?.name || '', startDate: '', endDate: '', reason: '' });
    alert("Leave request submitted successfully!");

    // NEW: Send notification to admins and corporate for leave request
    if (user) {
        await sendSystemNotification({
            type: 'leave_request',
            title: 'New Leave Request',
            message: `${user.name} has requested ${newLeave.days} day(s) of ${newLeave.type} from ${newLeave.from} to ${newLeave.to}.`,
            targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
            corporateId: user.corporateId === 'admin' ? null : user.corporateId || null,
            employeeId: user.id,
            link: '/admin/employee-settings' // Link to the Leave Approval section
        });
    }
  };

  const todayDate = new Date().toISOString().split('T')[0];

  if (!user) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Leave Management</h2>
        <p className="text-gray-500">Check your balances and apply for new leaves</p>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balances.map((bal, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-gray-500 text-sm font-medium">{bal.type}</p>
                <h3 className={`text-3xl font-bold mt-1 ${bal.color}`}>{bal.available}</h3>
              </div>
              <div className={`p-2 rounded-lg ${bal.bg}`}>
                <PieChart className={`w-5 h-5 ${bal.color}`} />
              </div>
            </div>
            <div className="z-10">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Used: {bal.total - bal.available}</span>
                <span>Total: {bal.total}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${bal.bar}`} 
                  style={{ width: `${(bal.available / bal.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {balances.length === 0 && (
            <div className="col-span-full p-6 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed text-gray-500">
                No leave types configured. Contact Admin.
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              New Application
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
                <select 
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.name}>{lt.name}</option>
                  ))}
                  {leaveTypes.length === 0 && <option>Casual Leave</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
                  <input 
                    type="date" 
                    name="startDate"
                    min={todayDate}
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
                  <input 
                    type="date" 
                    name="endDate"
                    min={formData.startDate || todayDate}
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    // Removed 'required' attribute here
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <textarea 
                  name="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Briefly describe the reason..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* History List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-emerald-500" />
                 Recent History
               </h3>
               {/* No 'View All' button needed as it now only shows the user's history */}
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {userLeaveHistory.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                   <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">{item.type}</span>
                          <span className="text-xs text-gray-400">• {item.days} Day{item.days > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(item.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                          <span className="text-gray-300">→</span>
                          {new Date(item.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        item.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {item.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {item.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {item.status === 'Pending' && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                   </div>
                   
                   <div className="flex justify-between items-end">
                      <p className="text-sm text-gray-500 italic">"{item.reason}"</p>
                      <span className="text-xs text-gray-400">Applied on {item.appliedOn}</span>
                   </div>
                </div>
              ))}
              
              {userLeaveHistory.length === 0 && (
                <div className="p-8 text-center text-gray-400 italic">
                  No leave history found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
