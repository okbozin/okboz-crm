
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Calendar, User, Clock, CheckCircle, AlertCircle, 
  Trash2, Search, Filter, MoreHorizontal, X, SlidersHorizontal, 
  Pencil, Building2, Save, MapPin, RefreshCcw
} from 'lucide-react';
import { UserRole, Employee, CorporateAccount, Task, Branch } from '../types';
import { MOCK_EMPLOYEES } from '../constants';

const COLUMNS = [
  { id: 'Todo', label: 'To Do', color: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  { id: 'Review', label: 'In Review', color: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  { id: 'Done', label: 'Completed', color: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' }
] as const;

interface TaskManagementProps {
  role: UserRole;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ role }) => {
  // Determine Session Context
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  
  // Use a namespaced key for tasks to ensure they belong to the branch
  const getStorageKey = (baseKey: string) => {
    return isSuperAdmin ? baseKey : `${baseKey}_${currentSessionId}`;
  };

  const isSuperAdmin = currentSessionId === 'admin';

  // --- Data Loading (Corporates & Staff & Branches) ---
  const [corporatesList, setCorporatesList] = useState<CorporateAccount[]>([]);
  const [allBranchesList, setAllBranchesList] = useState<Branch[]>([]);
  const [allStaff, setAllStaff] = useState<(Employee & { corporateId?: string })[]>([]);

  useEffect(() => {
    // 1. Load Corporates
    const savedCorps = localStorage.getItem('corporate_accounts');
    const parsedCorps = savedCorps ? JSON.parse(savedCorps) : [];
    setCorporatesList(parsedCorps);

    // 2. Load All Branches (Aggregated)
    let aggregatedBranches: (Branch & { owner?: string })[] = [];
    const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
    aggregatedBranches = [...aggregatedBranches, ...adminBranches.map(b => ({ ...b, owner: 'admin' }))];
    parsedCorps.forEach((corp: CorporateAccount) => {
        const corpBranchesKey = `branches_data_${corp.email}`;
        const corpBranchesData = localStorage.getItem(corpBranchesKey);
        if (corpBranchesData) {
            const corpBranches = JSON.parse(corpBranchesData).map((b: Branch) => ({ ...b, owner: corp.email }));
            aggregatedBranches = [...aggregatedBranches, ...corpBranches];
        }
    });
    setAllBranchesList(aggregatedBranches);

    // 3. Load All Staff (Aggregated)
    let aggregatedStaff: (Employee & { corporateId?: string })[] = [];

    const adminStaffData = localStorage.getItem('staff_data');
    if (adminStaffData) {
        const adminStaff = JSON.parse(adminStaffData).map((e: Employee) => ({ ...e, corporateId: 'admin' }));
        aggregatedStaff = [...aggregatedStaff, ...adminStaff];
    } else {
        aggregatedStaff = [...aggregatedStaff, ...MOCK_EMPLOYEES.map(e => ({ ...e, corporateId: 'admin' }))];
    }

    parsedCorps.forEach((corp: CorporateAccount) => {
        const corpStaffKey = `staff_data_${corp.email}`;
        const corpStaffData = localStorage.getItem(corpStaffKey);
        if (corpStaffData) {
            const corpStaff = JSON.parse(corpStaffData).map((e: Employee) => ({ ...e, corporateId: corp.email }));
            aggregatedStaff = [...aggregatedStaff, ...corpStaff];
        }
    });

    setAllStaff(aggregatedStaff);
  }, []);

  // --- Task State ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Load tasks from the appropriate storage key
    const key = getStorageKey('tasks_data');
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Save tasks
  useEffect(() => {
    const key = getStorageKey('tasks_data');
    localStorage.setItem(key, JSON.stringify(tasks));
  }, [tasks, isSuperAdmin]);

  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null); // Track editing
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  
  // NEW FILTER STATES
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterAssignedTo, setFilterAssignedTo] = useState('All');

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    corporateId: 'admin', // Default to Head Office
    branch: '', // NEW: Added to form state
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    status: 'Todo'
  });

  // Filter staff based on selected corporate/branch in modal
  const availableStaffForForm = useMemo(() => {
    let staff = allStaff;
    if (formData.corporateId === 'admin') {
        staff = staff.filter(s => s.corporateId === 'admin');
    } else {
        staff = staff.filter(s => s.corporateId === formData.corporateId);
    }
    if (formData.branch) {
        staff = staff.filter(s => s.branch === formData.branch);
    }
    return staff;
  }, [allStaff, formData.corporateId, formData.branch]);

  // Filter branches based on selected corporate in modal
  const availableBranchesForForm = useMemo(() => {
      let branches = allBranchesList;
      if (formData.corporateId === 'admin') {
          branches = branches.filter(b => b.owner === 'admin');
      } else {
          branches = branches.filter(b => b.owner === formData.corporateId);
      }
      return branches;
  }, [allBranchesList, formData.corporateId]);


  // --- Handlers ---

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      corporateId: 'admin',
      branch: '', // NEW: Reset branch
      assignedTo: '',
      priority: 'Medium',
      dueDate: '',
      status: 'Todo'
    });
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    
    // If Employee, pre-fill assignment to self and set correct corporate context
    if (role === UserRole.EMPLOYEE) {
        const me = allStaff.find(s => s.id === currentSessionId);
        if (me) {
            setFormData(prev => ({
                ...prev,
                assignedTo: me.id,
                corporateId: me.corporateId || 'admin',
                branch: me.branch || '' // NEW: Pre-fill employee's branch
            }));
        }
    } else if (role === UserRole.CORPORATE) {
        setFormData(prev => ({
            ...prev,
            corporateId: currentSessionId,
            // Pre-fill branch if corporate has only one, or leave empty
            branch: (allBranchesList.filter(b => b.owner === currentSessionId).length === 1) 
                    ? (allBranchesList.filter(b => b.owner === currentSessionId)[0].name || '') 
                    : ''
        }));
    }
    
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      corporateId: task.corporateId || 'admin',
      branch: task.branch || '', // NEW: Set branch for edit
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assignedTo) return;

    // Find corporate name for display
    let corpName = 'Head Office';
    if (formData.corporateId !== 'admin') {
       const c = corporatesList.find(c => c.email === formData.corporateId);
       if (c) corpName = c.companyName;
    }

    // Determine who assigned it
    let assignedByName = 'Admin';
    if (role === UserRole.CORPORATE) assignedByName = 'Manager';
    if (role === UserRole.EMPLOYEE) assignedByName = 'Self';

    if (editingTask) {
      // Update Existing
      const updatedTasks = tasks.map(t => t.id === editingTask.id ? {
        ...t,
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        corporateId: formData.corporateId, // Ensure corporateId is updated
        corporateName: corpName,
        branch: formData.branch, // NEW: Update branch
        priority: formData.priority as any,
        dueDate: formData.dueDate,
        status: formData.status as any
      } : t);
      setTasks(updatedTasks);
    } else {
      // Create New
      const newTask: Task = {
        id: `T${Date.now()}`,
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        assignedByName: assignedByName,
        corporateId: formData.corporateId, // NEW: Assign corporateId on creation
        corporateName: corpName,
        branch: formData.branch, // NEW: Assign branch on creation
        status: 'Todo',
        priority: formData.priority as any,
        dueDate: formData.dueDate,
        createdAt: new Date().toISOString()
      };
      setTasks([newTask, ...tasks]);
    }
    resetForm();
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const getStaffDetails = (id: string) => {
    const staff = allStaff.find(s => s.id === id);
    return staff || { name: 'Unknown', avatar: '' };
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Filtering
  const filteredTasks = tasks.filter(t => {
     // If Employee, only show tasks assigned to them
     if (role === UserRole.EMPLOYEE && t.assignedTo !== currentSessionId) {
         return false;
     }
     // If Corporate, only show tasks for their franchise
     if (role === UserRole.CORPORATE && t.corporateId !== currentSessionId) {
         return false;
     }

     const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           getStaffDetails(t.assignedTo).name.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
     
     // NEW FILTERS
     const matchesCorporate = filterCorporate === 'All' || t.corporateId === filterCorporate;
     const matchesBranch = filterBranch === 'All' || t.branch === filterBranch;
     const matchesAssignedTo = filterAssignedTo === 'All' || t.assignedTo === filterAssignedTo;

     return matchesSearch && matchesPriority && matchesCorporate && matchesBranch && matchesAssignedTo;
  });

  const availableCorporatesForFilter = useMemo(() => {
      if (!isSuperAdmin) return [];
      return corporatesList;
  }, [corporatesList, isSuperAdmin]);

  const availableBranchesForFilter = useMemo(() => {
      let branches = allBranchesList;
      if (filterCorporate !== 'All' && isSuperAdmin) {
          branches = branches.filter(b => b.owner === filterCorporate);
      } else if (role === UserRole.CORPORATE) {
          branches = branches.filter(b => b.owner === currentSessionId);
      }
      return branches;
  }, [allBranchesList, filterCorporate, isSuperAdmin, role, currentSessionId]);

  const availableStaffForFilter = useMemo(() => {
    let staff = allStaff;
    if (filterCorporate !== 'All' && isSuperAdmin) {
        staff = staff.filter(s => s.corporateId === filterCorporate);
    } else if (role === UserRole.CORPORATE) {
        staff = staff.filter(s => s.corporateId === currentSessionId);
    }
    if (filterBranch !== 'All') {
        staff = staff.filter(s => s.branch === filterBranch);
    }
    return staff;
  }, [allStaff, filterCorporate, filterBranch, isSuperAdmin, role, currentSessionId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterPriority('All');
    setFilterCorporate('All');
    setFilterBranch('All');
    setFilterAssignedTo('All');
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
          <p className="text-gray-500">
              {role === UserRole.EMPLOYEE ? "Manage and track your daily tasks" : "Assign tasks to staff and track status"}
          </p>
        </div>
        <button 
        onClick={handleOpenCreate}
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
        <Plus className="w-5 h-5" />
        Create Task
        </button>
      </div>

      {/* Toolbar with new filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
         <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
         </div>
         
         {isSuperAdmin && (
            <select 
               value={filterCorporate}
               onChange={(e) => {setFilterCorporate(e.target.value); setFilterBranch('All'); setFilterAssignedTo('All');}}
               className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
               <option value="All">All Corporates</option>
               <option value="admin">Head Office</option>
               {availableCorporatesForFilter.map(c => (
                  <option key={c.email} value={c.email}>{c.companyName}</option>
               ))}
            </select>
         )}

         {(isSuperAdmin || role === UserRole.CORPORATE) && (
            <select 
               value={filterBranch}
               onChange={(e) => {setFilterBranch(e.target.value); setFilterAssignedTo('All');}}
               className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
               <option value="All">All Branches</option>
               {availableBranchesForFilter.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
               ))}
            </select>
         )}

         <select 
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
         >
            <option value="All">All Staff</option>
            {availableStaffForFilter.map(s => (
               <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
            ))}
         </select>

         <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
         >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
         </select>
         
         {(searchQuery || filterPriority !== 'All' || filterCorporate !== 'All' || filterBranch !== 'All' || filterAssignedTo !== 'All') && (
            <button
                onClick={handleResetFilters}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
            >
                <RefreshCcw className="w-4 h-4" /> Reset Filters
            </button>
         )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-w-[1000px] gap-6">
          {COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex-1 flex flex-col bg-gray-50/50 rounded-xl border border-gray-200 h-full max-h-full">
                <div className={`p-4 border-b-2 ${col.border} bg-white rounded-t-xl sticky top-0 z-10 flex justify-between items-center shadow-sm`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${col.text}`}>{col.label}</span>
                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
                  </div>
                </div>

                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {colTasks.map(task => {
                    const assignee = getStaffDetails(task.assignedTo);
                    return (
                      <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all group relative">
                        {/* Header Badges */}
                        <div className="flex justify-between items-start mb-2">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)} uppercase`}>
                              {task.priority}
                           </span>
                           <div className="flex gap-1">
                              <button onClick={() => handleOpenEdit(task)} className="text-gray-300 hover:text-blue-500 p-1">
                                 <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-1">
                                 <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </div>

                        {/* Content */}
                        <h4 className="font-bold text-gray-800 mb-1 text-sm leading-snug">{task.title}</h4>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 mb-3">
                            {/* Assigned By Badge */}
                            <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                                <User className="w-3 h-3" /> By {task.assignedByName}
                            </div>
                            {/* Corporate Badge (Admin Only) */}
                            {isSuperAdmin && task.corporateName && (
                                <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-medium border border-indigo-100">
                                    <Building2 className="w-3 h-3" /> {task.corporateName}
                                </div>
                            )}
                            {/* Branch Badge */}
                            {task.branch && (
                                <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                                    <MapPin className="w-3 h-3" /> {task.branch}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                           <div className="flex items-center gap-2">
                              <img src={assignee.avatar || `https://ui-avatars.com/api/?name=${assignee.name}`} alt="" className="w-6 h-6 rounded-full" title={assignee.name} />
                              <div className="flex flex-col">
                                 <span className="text-[10px] text-gray-400">Due Date</span>
                                 <span className="text-xs font-medium text-gray-600">{task.dueDate}</span>
                              </div>
                           </div>
                           
                           {/* Status Change Menu */}
                           <div className="relative group/menu">
                              <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
                                 <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 bottom-full mb-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 hidden group-hover/menu:block z-20 overflow-hidden">
                                 {COLUMNS.map(c => (
                                    <button
                                       key={c.id}
                                       onClick={() => handleStatusChange(task.id, c.id)}
                                       className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${task.status === c.id && 'text-emerald-600 font-bold bg-emerald-50'}`}
                                    >
                                       {task.status === c.id && <CheckCircle className="w-3 h-3" />} {c.label}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                 <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveTask} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Task title" />
                 </div>
                 
                 {/* Corporate Selection (Only for Super Admin and Corporate Admins) */}
                 {(isSuperAdmin || role === UserRole.CORPORATE) && (
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Corporate / Branch</label>
                       <select 
                          value={formData.corporateId}
                          onChange={(e) => setFormData({...formData, corporateId: e.target.value, assignedTo: '', branch: ''})}
                          disabled={role === UserRole.CORPORATE} // Corporate can only select their own
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${role === UserRole.CORPORATE ? 'bg-gray-50 text-gray-500' : ''}`}
                       >
                          <option value="admin">Head Office</option>
                          {corporatesList.map(c => (
                             <option key={c.email} value={c.email}>{c.companyName} ({c.city})</option>
                          ))}
                       </select>
                    </div>
                 )}
                 
                 {/* Branch Selection (for Admin and Corporate) */}
                 {(isSuperAdmin || role === UserRole.CORPORATE) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <select 
                           value={formData.branch}
                           onChange={(e) => setFormData({...formData, branch: e.target.value, assignedTo: ''})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        >
                            <option value="">Select Branch</option>
                            {availableBranchesForForm.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                    <select 
                       required 
                       value={formData.assignedTo}
                       onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                       disabled={role === UserRole.EMPLOYEE} // Disable if employee, as they assign to self
                       className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${role === UserRole.EMPLOYEE ? 'bg-gray-50 text-gray-500' : ''}`}
                    >
                       <option value="">Select Staff</option>
                       {availableStaffForForm.map(s => (
                          <option key={s.id} value={s.id}>{s.name} - {s.role}</option>
                       ))}
                    </select>
                    {role === UserRole.EMPLOYEE && <p className="text-xs text-emerald-600 mt-1">Auto-assigned to self</p>}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                       <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white">
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                       <input required type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
                    </div>
                 </div>

                 {editingTask && (
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white">
                          <option value="Todo">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Done">Done</option>
                       </select>
                    </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none resize-none" />
                 </div>

                 <div className="pt-2">
                    <button type="submit" className="w-full bg-emerald-500 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2">
                       <Save className="w-4 h-4" /> {editingTask ? 'Save Changes' : 'Create Task'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;