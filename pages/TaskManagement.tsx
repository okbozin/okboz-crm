import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, Plus, Search, Filter, Calendar, 
  User, Clock, AlertCircle, CheckCircle, X, Trash2, Edit2
} from 'lucide-react';
import { Task, Employee, UserRole, Branch } from '../types';
import { MOCK_EMPLOYEES } from '../constants';

interface TaskManagementProps {
  role: UserRole;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Data Loading ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [allStaff, setAllStaff] = useState<Employee[]>(() => {
    let staff: Employee[] = [];
    if (isSuperAdmin) {
       // Load all staff for Admin
       const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
       staff = [...adminStaff.map((s:any) => ({...s, corporateId: 'admin'}))];
       try {
         const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
         corps.forEach((c: any) => {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            staff = [...staff, ...cStaff.map((s:any) => ({...s, corporateId: c.email}))];
         });
       } catch(e) {}
    } else {
       // Load specific staff for Corporate/Employee
       const key = `staff_data_${sessionId}`; 
       const saved = localStorage.getItem(key);
       if (saved) staff = JSON.parse(saved).map((s:any) => ({...s, corporateId: sessionId}));
       else if (role === UserRole.EMPLOYEE) {
           staff = MOCK_EMPLOYEES;
       }
    }
    return staff;
  });

  const [allBranches, setAllBranches] = useState<Branch[]>(() => {
      let branches: Branch[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          branches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             branches = [...branches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          const saved = localStorage.getItem(key);
          if (saved) branches = JSON.parse(saved).map((b: any) => ({...b, owner: sessionId}));
      }
      return branches;
  });

  const [corporates] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('corporate_accounts') || '[]'); } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('tasks_data', JSON.stringify(tasks));
  }, [tasks]);

  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    assignedTo: '',
    corporateId: isSuperAdmin ? 'admin' : sessionId,
    branch: '',
    startDate: '',
    endDate: ''
  });

  // --- Computed ---
  
  // Filter staff based on selected corporate/branch in modal
  const availableStaffForForm = useMemo(() => {
    let staff = allStaff;
    const targetCorpId = isSuperAdmin ? formData.corporateId : sessionId;
    
    if (targetCorpId === 'admin') {
        staff = staff.filter(s => s.corporateId === 'admin');
    } else {
        staff = staff.filter(s => s.corporateId === targetCorpId);
    }
    
    if (formData.branch) {
        staff = staff.filter(s => s.branch === formData.branch);
    }
    
    // Filter out inactive staff
    return staff.filter(s => s.status !== 'Inactive');
  }, [allStaff, formData.corporateId, formData.branch, isSuperAdmin, sessionId]);

  const availableBranchesForForm = useMemo(() => {
      const targetCorpId = isSuperAdmin ? formData.corporateId : sessionId;
      if (targetCorpId === 'admin') {
          return allBranches.filter(b => b.owner === 'admin');
      }
      return allBranches.filter(b => b.owner === targetCorpId);
  }, [allBranches, formData.corporateId, isSuperAdmin, sessionId]);

  const filteredTasks = tasks.filter(t => {
      if (role === UserRole.EMPLOYEE && t.assignedTo !== sessionId) return false;
      if (role === UserRole.CORPORATE && t.corporateId !== sessionId) return false;

      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.assignedByName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
      
      return matchesSearch && matchesStatus;
  });

  // --- Handlers ---
  const handleSaveTask = () => {
      if (!formData.title || !formData.assignedTo) {
          alert("Please fill required fields");
          return;
      }

      const assignedStaff = allStaff.find(s => s.id === formData.assignedTo);
      const newTask: Task = {
          id: `TASK-${Date.now()}`,
          title: formData.title,
          description: formData.description,
          assignedTo: formData.assignedTo,
          assignedByName: assignedStaff ? assignedStaff.name : 'Unknown',
          corporateId: isSuperAdmin ? formData.corporateId : sessionId,
          corporateName: '', 
          branch: formData.branch,
          status: 'Todo',
          priority: formData.priority,
          startDate: formData.startDate,
          endDate: formData.endDate,
          createdAt: new Date().toISOString()
      };

      setTasks([newTask, ...tasks]);
      setIsModalOpen(false);
      setFormData({
        title: '', description: '', priority: 'Medium', assignedTo: '', 
        corporateId: isSuperAdmin ? 'admin' : sessionId, branch: '', startDate: '', endDate: ''
      });
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Delete this task?")) {
          setTasks(tasks.filter(t => t.id !== id));
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
          <p className="text-gray-500">Assign and track team tasks</p>
        </div>
        {(role !== UserRole.EMPLOYEE) && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
                <Plus className="w-5 h-5" /> New Task
            </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search tasks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
          </div>
          <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
              <option value="All">All Status</option>
              <option>Todo</option>
              <option>In Progress</option>
              <option>Review</option>
              <option>Done</option>
          </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
              <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                          task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                          task.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 
                          'bg-blue-50 text-blue-600'
                      }`}>
                          {task.priority}
                      </span>
                      {role !== UserRole.EMPLOYEE && (
                          <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      )}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1">{task.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>
                  
                  <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                      <User className="w-3 h-3" /> Assigned to: <span className="font-medium text-gray-700">{task.assignedByName}</span>
                  </div>

                  {/* Date & Time Display */}
                  {(task.startDate || task.endDate) && (
                      <div className="flex flex-col gap-1 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-100">
                          {task.startDate && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-500" /> 
                                Start: <span className="font-medium">{new Date(task.startDate).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                            </span>
                          )}
                          {task.endDate && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-500" /> 
                                End: <span className="font-medium">{new Date(task.endDate).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                            </span>
                          )}
                      </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <select 
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                          className={`text-xs font-bold px-2 py-1 rounded border outline-none cursor-pointer ${
                              task.status === 'Done' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                      >
                          <option>Todo</option>
                          <option>In Progress</option>
                          <option>Review</option>
                          <option>Done</option>
                      </select>
                  </div>
              </div>
          ))}
          {filteredTasks.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">No tasks found.</div>
          )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-800">Create New Task</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  <div className="space-y-4">
                      <input 
                          placeholder="Task Title"
                          className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                      <textarea 
                          placeholder="Description"
                          className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
                          value={formData.description}
                          onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                          {isSuperAdmin && (
                              <select 
                                  className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white"
                                  value={formData.corporateId}
                                  onChange={e => setFormData({...formData, corporateId: e.target.value, branch: '', assignedTo: ''})}
                              >
                                  <option value="admin">Head Office</option>
                                  {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                              </select>
                          )}
                          <select 
                              className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white"
                              value={formData.branch}
                              onChange={e => setFormData({...formData, branch: e.target.value, assignedTo: ''})}
                          >
                              <option value="">All Branches</option>
                              {availableBranchesForForm.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                          </select>
                      </div>

                      <select 
                          className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white"
                          value={formData.assignedTo}
                          onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                      >
                          <option value="">Assign To...</option>
                          {availableStaffForForm.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                      </select>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date & Time</label>
                              <input 
                                type="datetime-local" 
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                                value={formData.startDate} 
                                onChange={e => setFormData({...formData, startDate: e.target.value})} 
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date & Time</label>
                              <input 
                                type="datetime-local" 
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                                value={formData.endDate} 
                                onChange={e => setFormData({...formData, endDate: e.target.value})} 
                              />
                          </div>
                      </div>

                      <div className="flex gap-2">
                          {['Low', 'Medium', 'High'].map(p => (
                              <button 
                                  key={p}
                                  onClick={() => setFormData({...formData, priority: p as any})}
                                  className={`flex-1 py-2 text-sm rounded-lg border ${formData.priority === p ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
                              >
                                  {p}
                              </button>
                          ))}
                      </div>

                      <button onClick={handleSaveTask} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                          Create Task
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TaskManagement;