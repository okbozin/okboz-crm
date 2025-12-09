
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, Search, DollarSign, 
  PieChart, FileText, 
  CheckCircle, X, Download,
  Smartphone, Zap, Wifi, Users, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Building2, Upload, Loader2, Paperclip, Eye, Edit2, Trash2, Printer, Percent, AlertTriangle, Calendar, CheckSquare, RefreshCcw, Clock
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { uploadFileToCloud } from '../../services/cloudService';
import { CorporateAccount } from '../../types';

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

// Old Partner Interface (Deprecated in favor of CorporateAccount.partners, kept for legacy read if needed)
interface Partner {
  id: string;
  name: string;
  percentage: number;
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
  const location = useLocation();
  const isAdminExpensesTab = location.pathname.includes('admin-expenses');

  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    if (isAdminExpensesTab) return 'admin_expenses_data';
    return sessionId === 'admin' ? 'office_expenses' : `office_expenses_${sessionId}`;
  };

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // --- TAB STATE ---
  const [viewTab, setViewTab] = useState<'Transactions' | 'Partners'>('Transactions');

  // State
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (isSuperAdmin && !isAdminExpensesTab) {
        // --- SUPER ADMIN AGGREGATION (Finance & Expenses Tab) ---
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
        // Standard Load (Admin Expenses Tab OR Corporate View)
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        return [];
    }
  });

  // Data Lists
  const [corporatesList, setCorporatesList] = useState<CorporateAccount[]>([]);

  // Load Corporates List
  useEffect(() => {
      try {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
          setCorporatesList(corps);
      } catch (e) {}
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); 
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterCorporate, setFilterCorporate] = useState('All'); // For Admin View Filtering
  
  const [rawReceiptPreviewUrl, setRawReceiptPreviewUrl] = useState<string | null>(null); 
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false); 
  const [invoiceData, setInvoiceData] = useState<Expense | null>(null); 
  
  // Custom Category State
  const [customCategory, setCustomCategory] = useState('');

  // Settlement Data State
  const [settlementData, setSettlementData] = useState<Record<string, any>>({});
  // Temporary state for payment method selection in the UI
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, string>>({});

  // Load Settlement Data
  useEffect(() => {
      const saved = localStorage.getItem('partner_settlements');
      if (saved) {
          try {
              setSettlementData(JSON.parse(saved));
          } catch(e) {}
      }
  }, []);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormState: Partial<Expense> = {
    type: 'Expense',
    transactionNumber: '',
    title: '',
    category: 'Other Expenses',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    description: '',
    receiptUrl: ''
  };
  const [formData, setFormData] = useState<Partial<Expense>>(initialFormState);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null); 

  // Persistence
  useEffect(() => {
    if (!isSuperAdmin || isAdminExpensesTab) {
        // Direct save for Corporate or Admin Expenses Tab
        const key = getSessionKey();
        localStorage.setItem(key, JSON.stringify(expenses));
    } else {
        // Aggregation Save Logic (Only for Finance & Expenses Tab of Super Admin)
        // We only save back the 'Head Office' items to the main 'office_expenses' key
        // Corporate items are read-only in this view or managed elsewhere
        const headOfficeExpenses = expenses.filter(e => e.franchiseName === 'Head Office');
        localStorage.setItem('office_expenses', JSON.stringify(headOfficeExpenses));
    }
  }, [expenses, isSuperAdmin, isAdminExpensesTab]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      } else {
          setSelectedFile(null);
      }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setCustomCategory('');
    setSelectedFile(null);
    setEditingExpenseId(null);
    setIsModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleOpenAddTransaction = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    
    const list = expense.type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const isStandard = list.includes(expense.category);
    
    let catForForm = expense.category;
    let customCatVal = '';

    // If category is NOT in the standard list, it's a custom one.
    // We set the form dropdown to "Other..." and fill the custom input.
    if (!isStandard) {
         if (expense.type === 'Expense') catForForm = 'Other Expenses';
         else catForForm = 'Other Income';
         customCatVal = expense.category;
    }

    setFormData({
        type: expense.type,
        transactionNumber: expense.transactionNumber,
        title: expense.title,
        category: catForForm,
        amount: expense.amount,
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        status: expense.status,
        description: expense.description,
        receiptUrl: expense.receiptUrl, 
    });
    setCustomCategory(customCatVal);
    setSelectedFile(null); 
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      if (editingExpenseId === id) {
          resetForm();
      }
    }
  };

  const handleViewInvoice = (expense: Expense) => {
    setInvoiceData(expense);
    setShowInvoiceViewer(true);
  };

  const closeInvoiceViewer = () => {
    setShowInvoiceViewer(false);
    setInvoiceData(null);
  };

  const closeRawReceiptPreview = () => {
    setRawReceiptPreviewUrl(null);
  };

  // --- Settlement Handlers ---
  const handleSettle = (key: string, amount: number) => {
      const method = selectedPaymentMethods[key] || 'Bank Transfer';
      
      const updatedData = {
          ...settlementData,
          [key]: {
              status: 'Settled',
              date: new Date().toISOString(),
              amount: amount,
              paymentMethod: method
          }
      };
      
      setSettlementData(updatedData);
      localStorage.setItem('partner_settlements', JSON.stringify(updatedData));
  };

  const handleUnsettle = (key: string) => {
      if(!window.confirm("Are you sure you want to mark this as Unsettled?")) return;
      
      const updatedData = { ...settlementData };
      delete updatedData[key];
      
      setSettlementData(updatedData);
      localStorage.setItem('partner_settlements', JSON.stringify(updatedData));
  };

  const handlePaymentMethodSelect = (key: string, method: string) => {
      setSelectedPaymentMethods(prev => ({...prev, [key]: method}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.transactionNumber) {
        alert("Please fill all required fields including Transaction Number.");
        return;
    }
    
    // Validate Custom Category
    if ((formData.category === 'Other Expenses' || formData.category === 'Other Income') && !customCategory.trim()) {
        alert("Please specify the custom category name.");
        return;
    }

    setIsUploading(true);
    let receiptUrl = formData.receiptUrl || ''; 

    if (selectedFile) {
        const sessionId = localStorage.getItem('app_session_id') || 'admin';
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `receipts/${sessionId}/${Date.now()}_${safeName}`;
        
        const cloudUrl = await uploadFileToCloud(selectedFile, path);
        
        if (cloudUrl) {
            receiptUrl = cloudUrl;
        } else {
            try {
                receiptUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(selectedFile);
                });
                console.log("Used local fallback for receipt.");
            } catch (err) {
                console.error("Local fallback failed", err);
            }
        }
    }

    // Determine Final Category
    const finalCategory = (formData.category === 'Other Expenses' || formData.category === 'Other Income') 
                          ? customCategory.trim() 
                          : formData.category;

    const transactionData: Expense = {
      id: editingExpenseId || Date.now().toString(),
      transactionNumber: formData.transactionNumber || `TXN-${Date.now()}`,
      type: formData.type as 'Income' | 'Expense',
      title: formData.title || '',
      category: finalCategory || 'Other Expenses',
      amount: formData.amount || 0,
      date: formData.date || new Date().toISOString().split('T')[0],
      paymentMethod: formData.paymentMethod || 'Cash',
      status: (formData.status as 'Paid' | 'Pending') || 'Pending',
      description: formData.description,
      franchiseName: isSuperAdmin && !isAdminExpensesTab ? 'Head Office' : undefined,
      receiptUrl: receiptUrl
    };

    if (editingExpenseId) {
        setExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? transactionData : exp));
    } else {
        setExpenses(prev => [transactionData, ...prev]);
    }
    
    setIsUploading(false);
    resetForm(); 
  };

  // derived state
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || (exp.franchiseName && exp.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.transactionNumber && exp.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const matchesType = typeFilter === 'All' || exp.type === typeFilter;
    const matchesMonth = exp.date.startsWith(monthFilter);
    
    // Add Corporate filter for Admin
    let matchesCorporate = true;
    if (isSuperAdmin && !isAdminExpensesTab && filterCorporate !== 'All') {
        if (filterCorporate === 'admin') matchesCorporate = exp.franchiseName === 'Head Office';
        else {
            const corp = corporatesList.find(c => c.email === filterCorporate);
            matchesCorporate = exp.franchiseName === (corp ? corp.companyName : '');
        }
    }

    return matchesSearch && matchesCategory && matchesType && matchesMonth && matchesCorporate;
  });

  const stats = useMemo(() => {
    // Only calculate stats for currently filtered view (so corporate filter applies)
    const monthRecords = filteredExpenses;

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
  }, [filteredExpenses]); // Re-calculate when filtered list changes

  // --- PARTNERSHIP CALCULATION ---
  // Identify active corporate context for partnership display
  const activeCorporate = useMemo(() => {
      let corpId = '';
      if (isSuperAdmin) {
          if (filterCorporate !== 'All' && filterCorporate !== 'admin') {
              corpId = filterCorporate;
          }
      } else {
          // If logged in as corporate
          corpId = sessionId;
      }
      return corporatesList.find(c => c.email === corpId);
  }, [isSuperAdmin, filterCorporate, sessionId, corporatesList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{isAdminExpensesTab ? 'Admin Expenses' : 'Finance & Expenses'}</h2>
          <p className="text-gray-500">
             {isAdminExpensesTab ? "Manage admin-specific expenses" : (isSuperAdmin ? "Consolidated financial report across all franchises" : "Track income, expenses, and partner distribution")}
          </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleOpenAddTransaction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
                <Plus className="w-5 h-5" /> New Transaction
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Income</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalIncome.toLocaleString()}</h3>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                 <ArrowUpCircle className="w-3 h-3" /> Income
              </p>
           </div>
           <div className="p-4 bg-green-50 rounded-full text-green-600">
              <TrendingUp className="w-6 h-6" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Expense</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalExpense.toLocaleString()}</h3>
              <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                 <ArrowDownCircle className="w-3 h-3" /> Expenses
              </p>
           </div>
           <div className="p-4 bg-red-50 rounded-full text-red-600">
              <TrendingDown className="w-6 h-6" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Net Balance</p>
              <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {stats.balance >= 0 ? '₹' : '-₹'}{Math.abs(stats.balance).toLocaleString()}
              </h3>
              <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${stats.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                 {stats.balance >= 0 ? 'Profit' : 'Loss'}
              </p>
           </div>
           <div className={`p-4 rounded-full ${stats.balance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet className="w-6 h-6" />
           </div>
        </div>
      </div>

      {/* PARTNERSHIP DISTRIBUTION SECTION */}
      {/* Changed background from black to gradient blue/indigo for a better look */}
      {activeCorporate && activeCorporate.partners && activeCorporate.partners.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 shadow-lg text-white border border-blue-500 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-4 border-b border-blue-400 pb-2">
                  <h3 className="font-bold flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-white" /> 
                      Profit Distribution ({activeCorporate.companyName})
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30`}>
                      {monthFilter}
                  </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCorporate.partners.map((partner, index) => {
                      const shareAmount = (stats.balance * partner.percentage) / 100;
                      const isLoss = stats.balance < 0;
                      
                      // Settlement Key: CorporateID + Month + PartnerIndex
                      const settlementKey = `${activeCorporate.id}_${monthFilter}_${index}`;
                      const settlementInfo = settlementData[settlementKey]; // { status: 'Settled' | 'Pending', paymentMethod, date, amount }
                      const isSettled = settlementInfo?.status === 'Settled';

                      return (
                          <div key={index} className={`rounded-lg p-4 border transition-colors backdrop-blur-sm relative overflow-hidden ${
                              isLoss 
                                ? 'bg-red-900/30 border-red-400/50' 
                                : 'bg-white/10 border-white/20 hover:bg-white/20'
                          }`}>
                              <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-white">{partner.name}</span>
                                  <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded text-white">{partner.percentage}%</span>
                              </div>
                              
                              <div className={`text-xl font-bold ${isLoss ? 'text-red-200' : 'text-emerald-300'}`}>
                                  {isLoss ? '-₹' : '₹'}{Math.abs(shareAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                              
                              <div className={`text-[10px] uppercase tracking-wider font-medium opacity-80 mb-3 ${isLoss ? 'text-red-200' : 'text-blue-100'}`}>
                                  {isLoss ? 'Share of Loss' : 'Share of Profit'}
                              </div>

                              {/* Settlement Controls */}
                              <div className="pt-3 border-t border-white/10">
                                  {isSettled ? (
                                      <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5 text-xs text-green-300 font-bold bg-green-900/40 px-2 py-1 rounded w-fit">
                                              <CheckCircle className="w-3 h-3" /> 
                                              Settled via {settlementInfo.paymentMethod}
                                          </div>
                                          <div className="flex justify-between items-center mt-1">
                                              <span className="text-[10px] text-white/60">{new Date(settlementInfo.date).toLocaleDateString()}</span>
                                              <button 
                                                  onClick={() => handleUnsettle(settlementKey)}
                                                  className="text-[10px] text-red-300 hover:text-red-100 hover:underline flex items-center gap-1"
                                              >
                                                  <RefreshCcw className="w-3 h-3" /> Undo
                                              </button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                              <span className="text-xs text-yellow-300 font-bold bg-yellow-900/40 px-2 py-0.5 rounded flex items-center gap-1">
                                                  <Clock className="w-3 h-3" /> Pending
                                              </span>
                                          </div>
                                          <div className="flex gap-2">
                                              <select 
                                                  className="bg-black/20 border border-white/20 text-white text-xs rounded px-2 py-1 outline-none focus:border-white/50 w-full"
                                                  value={selectedPaymentMethods[settlementKey] || 'Bank Transfer'}
                                                  onChange={(e) => handlePaymentMethodSelect(settlementKey, e.target.value)}
                                              >
                                                  <option className="text-black">Bank Transfer</option>
                                                  <option className="text-black">Cash</option>
                                                  <option className="text-black">Cheque</option>
                                                  <option className="text-black">UPI</option>
                                              </select>
                                              <button 
                                                  onClick={() => handleSettle(settlementKey, shareAmount)}
                                                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded font-medium border border-white/20 transition-colors whitespace-nowrap"
                                              >
                                                  Mark Settled
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Filters & Content */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder="Search transactions..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  {isSuperAdmin && !isAdminExpensesTab && (
                      <select 
                          value={filterCorporate}
                          onChange={(e) => setFilterCorporate(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                      >
                          <option value="All">All Corporates</option>
                          <option value="admin">Head Office</option>
                          {corporatesList.map(c => (
                              <option key={c.id} value={c.email}>{c.companyName}</option>
                          ))}
                      </select>
                  )}

                  <input 
                      type="month" 
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <select 
                      value={typeFilter} 
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                      <option value="All">All Types</option>
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                  </select>

                  <select 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                  >
                      <option value="All">All Categories</option>
                      {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">Transactions</div>
              <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium">
                          <tr>
                              <th className="px-6 py-3">Date</th>
                              {isSuperAdmin && !isAdminExpensesTab && <th className="px-6 py-3">Franchise</th>}
                              <th className="px-6 py-3">Title / ID</th>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3 text-right">Amount</th>
                              <th className="px-6 py-3 text-center">Status</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredExpenses.map(item => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                  {isSuperAdmin && !isAdminExpensesTab && (
                                      <td className="px-6 py-3">
                                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100 font-medium">
                                              {item.franchiseName || 'Head Office'}
                                          </span>
                                      </td>
                                  )}
                                  <td className="px-6 py-3">
                                      <div className="font-bold text-gray-800">{item.title}</div>
                                      <div className="text-xs text-gray-500 font-mono">{item.transactionNumber}</div>
                                  </td>
                                  <td className="px-6 py-3">
                                      <span className={`px-2 py-1 rounded text-xs border ${item.type === 'Income' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                          {item.category}
                                      </span>
                                  </td>
                                  <td className={`px-6 py-3 text-right font-bold ${item.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.type === 'Income' ? '+' : '-'}₹{item.amount.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                          {item.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => handleViewInvoice(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye className="w-4 h-4"/></button>
                                          <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredExpenses.length === 0 && (
                              <tr><td colSpan={isSuperAdmin ? 7 : 6} className="py-8 text-center text-gray-400">No transactions found.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Adjusted Chart Size */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-[400px]">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" /> Expense Breakdown
              </h3>
              <div className="flex-1">
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
                              {stats.chartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <ReTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                          <Legend />
                      </RePieChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800">{editingExpenseId ? 'Edit Transaction' : 'New Transaction'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button type="button" onClick={() => setFormData({...formData, type: 'Income', category: INCOME_CATEGORIES[0]})} className={`flex-1 py-1.5 text-xs font-bold rounded ${formData.type === 'Income' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Income</button>
                            <button type="button" onClick={() => setFormData({...formData, type: 'Expense', category: EXPENSE_CATEGORIES[0]})} className={`flex-1 py-1.5 text-xs font-bold rounded ${formData.type === 'Expense' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Expense</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction No.</label>
                        <input name="transactionNumber" value={formData.transactionNumber} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm font-mono" placeholder="Auto-generated" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title / Description</label>
                    <input name="title" value={formData.title} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Office Rent Payment" required />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                       <select 
                          name="category" 
                          value={formData.category} 
                          onChange={(e) => {
                             handleInputChange(e);
                             if (e.target.value !== 'Other Expenses' && e.target.value !== 'Other Income') {
                                 setCustomCategory('');
                             }
                          }} 
                          className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white"
                        >
                          {(formData.type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                       </select>
                       {(formData.category === 'Other Expenses' || formData.category === 'Other Income') && (
                           <input 
                              type="text" 
                              placeholder="Enter custom category"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="w-full p-2 mt-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              required
                           />
                       )}
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label>
                       <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="0.00" required />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                       <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" required />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                       <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                          <option>Bank Transfer</option>
                          <option>Cash</option>
                          <option>UPI</option>
                          <option>Cheque</option>
                          <option>Card</option>
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                       <option>Paid</option>
                       <option>Pending</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attach Receipt (Optional)</label>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 border border-dashed border-gray-300 rounded-lg p-2 text-xs text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
                            {selectedFile ? <CheckCircle className="w-4 h-4 text-green-500"/> : <Paperclip className="w-4 h-4"/>}
                            {selectedFile ? selectedFile.name : 'Choose File'}
                        </button>
                        {formData.receiptUrl && !selectedFile && (
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                Existing File
                            </div>
                        )}
                    </div>
                 </div>

                 <button type="submit" disabled={isUploading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm flex justify-center items-center gap-2">
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingExpenseId ? 'Update Transaction' : 'Save Transaction'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {showInvoiceViewer && invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50 rounded-t-xl">
                 <div>
                    <h3 className="font-bold text-xl text-gray-800">Transaction Details</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{invoiceData.transactionNumber}</p>
                 </div>
                 <button onClick={closeInvoiceViewer} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Subject</p>
                        <h4 className="text-lg font-bold text-gray-800">{invoiceData.title}</h4>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs border mt-1 ${invoiceData.type === 'Income' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{invoiceData.type} - {invoiceData.category}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Amount</p>
                        <h4 className={`text-3xl font-bold ${invoiceData.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>₹{invoiceData.amount.toLocaleString()}</h4>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <p className="text-gray-500 mb-1">Date</p>
                        <p className="font-medium text-gray-800">{new Date(invoiceData.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Payment Method</p>
                        <p className="font-medium text-gray-800">{invoiceData.paymentMethod}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${invoiceData.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{invoiceData.status}</span>
                    </div>
                    {invoiceData.franchiseName && (
                        <div>
                            <p className="text-gray-500 mb-1">Franchise</p>
                            <p className="font-medium text-gray-800">{invoiceData.franchiseName}</p>
                        </div>
                    )}
                 </div>
                 
                 {invoiceData.receiptUrl && (
                     <div className="mt-4 pt-4 border-t border-gray-100">
                         <p className="text-xs font-bold text-gray-400 uppercase mb-2">Attached Receipt</p>
                         <div className="flex gap-2">
                             <a 
                                href={invoiceData.receiptUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                             >
                                 <Download className="w-4 h-4" /> Download/View
                             </a>
                         </div>
                     </div>
                 )}
              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                 <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                    <Printer className="w-4 h-4" /> Print
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Expenses;