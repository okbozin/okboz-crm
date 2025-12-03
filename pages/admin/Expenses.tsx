
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, DollarSign, 
  PieChart, FileText, 
  CheckCircle, X, Download,
  Smartphone, Zap, Wifi, Users, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Building2, Upload, Loader2, Paperclip
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { uploadFileToCloud } from '../../services/cloudService';

interface Expense {
  id: string;
  transactionNumber: string; 
  type: 'Income' | 'Expense';
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  status: 'Paid' | 'Pending';
  description?: string;
  franchiseName?: string; 
  receiptUrl?: string; // Added for file storage
}

const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Manager Salary',
  'Staff Salary',
  'EB Rent (Electricity)',
  'Internet Rent',
  'Cell Phone Fee',
  'Utility Expense',
  'Coupon No of Booking',
  'Marketing',
  'Other Expenses'
];

const INCOME_CATEGORIES = [
  'Sales',
  'Consulting Fee',
  'Service Charge',
  'Commission',
  'Investment',
  'Refund',
  'Other Income'
];

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];

const Expenses: React.FC = () => {
  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'office_expenses' : `office_expenses_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // State
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allExpenses: Expense[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('office_expenses');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allExpenses = [...allExpenses, ...parsed.map((e: any) => ({...e, franchiseName: 'Head Office'}))];
            } catch (e) {}
        } else {
            allExpenses = [];
        }

        // 2. Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`office_expenses_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((e: any) => ({...e, franchiseName: corp.companyName}));
                    allExpenses = [...allExpenses, ...tagged];
                } catch (e) {}
            }
        });
        return allExpenses;
    } else {
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); 
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Expense>>({
    type: 'Expense',
    transactionNumber: '',
    title: '',
    category: 'Other Expenses',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    description: ''
  });

  // Persistence
  useEffect(() => {
    if (!isSuperAdmin) {
        const key = getSessionKey();
        localStorage.setItem(key, JSON.stringify(expenses));
    } else {
        const headOfficeExpenses = expenses.filter(e => e.franchiseName === 'Head Office');
        localStorage.setItem('office_expenses', JSON.stringify(headOfficeExpenses));
    }
  }, [expenses, isSuperAdmin]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.transactionNumber) {
        alert("Please fill all required fields including Transaction Number.");
        return;
    }

    setIsUploading(true);
    let receiptUrl = '';

    // Upload to Firebase if file exists
    if (selectedFile) {
        const sessionId = localStorage.getItem('app_session_id') || 'admin';
        const path = `receipts/${sessionId}/${Date.now()}_${selectedFile.name}`;
        const url = await uploadFileToCloud(selectedFile, path);
        if (url) receiptUrl = url;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      transactionNumber: formData.transactionNumber || `TXN-${Date.now()}`,
      type: formData.type as 'Income' | 'Expense',
      title: formData.title || '',
      category: formData.category || 'Other Expenses',
      amount: formData.amount || 0,
      date: formData.date || new Date().toISOString().split('T')[0],
      paymentMethod: formData.paymentMethod || 'Cash',
      status: (formData.status as 'Paid' | 'Pending') || 'Pending',
      description: formData.description,
      franchiseName: isSuperAdmin ? 'Head Office' : undefined,
      receiptUrl: receiptUrl
    };

    setExpenses([newExpense, ...expenses]);
    setIsModalOpen(false);
    setIsUploading(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
    setFormData({
      type: 'Expense',
      transactionNumber: '',
      title: '',
      category: 'Other Expenses',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
      description: ''
    });
  };

  // derived state
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || (exp.franchiseName && exp.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.transactionNumber && exp.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const matchesType = typeFilter === 'All' || exp.type === typeFilter;
    const matchesMonth = exp.date.startsWith(monthFilter);
    return matchesSearch && matchesCategory && matchesType && matchesMonth;
  });

  const stats = useMemo(() => {
    const monthRecords = expenses.filter(e => e.date.startsWith(monthFilter));

    const totalIncome = monthRecords
      .filter(e => e.type === 'Income')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpense = monthRecords
      .filter(e => e.type === 'Expense')
      .reduce((sum, item) => sum + item.amount, 0);

    const balance = totalIncome - totalExpense;
    
    // Group for chart (Expenses Only)
    const categoryData: Record<string, number> = {};
    monthRecords
        .filter(e => e.type === 'Expense')
        .forEach(exp => {
           categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
        });
    
    const chartData = Object.keys(categoryData).map(key => ({
      name: key,
      value: categoryData[key]
    }));

    return { totalIncome, totalExpense, balance, chartData };
  }, [expenses, monthFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Finance & Expenses</h2>
          <p className="text-gray-500">
             {isSuperAdmin ? "Consolidated financial report across all franchises" : "Track income, office expenses, and net balance"}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-emerald-600">+₹{stats.totalIncome.toLocaleString()}</h3>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-red-600">-₹{stats.totalExpense.toLocaleString()}</h3>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-red-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Net Balance</p>
            <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ₹{stats.balance.toLocaleString()}
            </h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Section */}
        <div className="lg:col-span-2 space-y-6">
           {/* Filters */}
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder="Search transactions..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
               />
             </div>
             <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
               <input 
                 type="month" 
                 value={monthFilter}
                 onChange={(e) => setMonthFilter(e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
               />
               <select 
                 value={typeFilter}
                 onChange={(e) => setTypeFilter(e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
               >
                 <option value="All">All Types</option>
                 <option value="Income">Income Only</option>
                 <option value="Expense">Expense Only</option>
               </select>
               <select 
                 value={categoryFilter}
                 onChange={(e) => setCategoryFilter(e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm max-w-[150px]"
               >
                 <option value="All">All Categories</option>
                 {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].sort().map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
           </div>

           {/* Table */}
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                   <tr>
                     <th className="px-6 py-4">Ref #</th>
                     <th className="px-6 py-4">Title / Category</th>
                     {isSuperAdmin && <th className="px-6 py-4">Franchise</th>}
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Amount</th>
                     <th className="px-6 py-4">Receipt</th>
                     <th className="px-6 py-4">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {filteredExpenses.map((exp) => (
                     <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 text-xs font-mono text-gray-500">{exp.transactionNumber || '-'}</td>
                       <td className="px-6 py-4">
                         <div className="flex items-start gap-3">
                             <div className={`mt-1 p-1.5 rounded-full ${exp.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                 {exp.type === 'Income' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                             </div>
                             <div>
                                <div className="font-bold text-gray-900">{exp.title}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    {exp.category === 'Office Rent' && <DollarSign className="w-3 h-3" />}
                                    {exp.category.includes('Salary') && <Users className="w-3 h-3" />}
                                    {exp.category.includes('EB') && <Zap className="w-3 h-3" />}
                                    {exp.category.includes('Internet') && <Wifi className="w-3 h-3" />}
                                    {exp.category.includes('Phone') && <Smartphone className="w-3 h-3" />}
                                    {exp.category}
                                </div>
                             </div>
                         </div>
                       </td>
                       {isSuperAdmin && (
                           <td className="px-6 py-4">
                               {exp.franchiseName && (
                                   <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold border border-indigo-100">
                                       <Building2 className="w-3 h-3" />
                                       {exp.franchiseName}
                                   </div>
                               )}
                           </td>
                       )}
                       <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                       <td className={`px-6 py-4 font-mono font-bold ${exp.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>
                           {exp.type === 'Income' ? '+' : '-'}₹{exp.amount.toLocaleString()}
                       </td>
                       <td className="px-6 py-4 text-gray-600">
                          {exp.receiptUrl ? (
                             <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                <Paperclip className="w-3 h-3" /> View
                             </a>
                          ) : (
                             <span className="text-gray-400 text-xs">-</span>
                          )}
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-bold border ${exp.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                           {exp.status}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             {filteredExpenses.length === 0 && (
               <div className="p-10 text-center text-gray-500">
                  No records found for this period.
               </div>
             )}
           </div>
        </div>

        {/* Analytics Section */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                 <PieChart className="w-5 h-5 text-emerald-500" /> Expense Distribution
              </h3>
              <div className="h-64 w-full">
                 {stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                        <Pie
                            data={stats.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <ReTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '10px'}} />
                        </RePieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        No expense data to display
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-lg">Download Report</h3>
                 <FileText className="w-6 h-6 opacity-80" />
              </div>
              <p className="text-indigo-100 text-sm mb-6">
                 Generate a detailed PDF report of all income and expenses for auditing purposes.
              </p>
              <button className="w-full bg-white text-indigo-600 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                 <Download className="w-4 h-4" /> Export PDF
              </button>
           </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Add Transaction</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                 <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'Income', category: INCOME_CATEGORIES[0] }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                 >
                    <ArrowUpCircle className="w-4 h-4" /> Income
                 </button>
                 <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'Expense', category: EXPENSE_CATEGORIES[0] }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                 >
                    <ArrowDownCircle className="w-4 h-4" /> Expense
                 </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Number</label>
                <input 
                  type="text" 
                  name="transactionNumber"
                  required
                  placeholder="e.g. TXN-2025-001"
                  value={formData.transactionNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  name="title"
                  required
                  placeholder={formData.type === 'Income' ? "e.g. Client Payment" : "e.g. Office Rent"}
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                   <select 
                     name="category"
                     value={formData.category}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                   >
                     {(formData.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                        <option key={c} value={c}>{c}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                   <input 
                     type="date"
                     name="date" 
                     value={formData.date}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  name="amount"
                  required
                  min="0"
                  value={formData.amount || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                   <select 
                     name="paymentMethod"
                     value={formData.paymentMethod}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                   >
                     <option>Cash</option>
                     <option>Bank Transfer</option>
                     <option>UPI</option>
                     <option>Credit Card</option>
                     <option>Cheque</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select 
                     name="status"
                     value={formData.status}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                   >
                     <option>Paid</option>
                     <option>Pending</option>
                   </select>
                 </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt / File</label>
                  <div className="flex gap-2 items-center">
                      <input 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                      />
                      <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 border border-dashed border-gray-300 rounded-lg py-2 px-4 text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                          {selectedFile ? (
                              <span className="text-emerald-600 font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                          ) : (
                              <>
                                  <Upload className="w-4 h-4" /> Select File
                              </>
                          )}
                      </button>
                      {selectedFile && (
                          <button onClick={() => setSelectedFile(null)} type="button" className="text-red-500 hover:bg-red-50 p-2 rounded"><X className="w-4 h-4"/></button>
                      )}
                  </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                 <textarea 
                   name="description"
                   rows={2}
                   value={formData.description}
                   onChange={handleInputChange}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                 />
              </div>

              <div className="pt-2">
                 <button 
                    type="submit"
                    disabled={isUploading}
                    className={`w-full text-white font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 ${formData.type === 'Income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                 >
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {formData.type === 'Income' ? 'Record Income' : 'Record Expense'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
