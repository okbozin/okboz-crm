
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, Search, Filter, Download, Trash2, Edit2, 
  TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle,
  Users, Clock, CheckCircle, RefreshCcw, X, Building2, PieChart as PieChartIcon,
  Upload, FileText, Loader2, Link as LinkIcon, Calendar, CreditCard, Tag,
  History
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { CorporateAccount } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService';

interface Expense {
  id: string;
  title: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  date: string;
  paymentMethod: string;
  description: string;
  franchiseName?: string;
  transactionNumber?: string;
  status?: 'Paid' | 'Pending' | 'Failed';
  receiptUrl?: string;
  ownerId?: string; 
}

// Interfaces for Partial Payments
interface SettlementTransaction {
    id: string;
    amount: number;
    date: string;
    method: string;
}

interface SettlementRecord {
    totalShare: number; 
    paid: number;
    status: 'Settled' | 'Partial' | 'Pending';
    transactions: SettlementTransaction[];
    // Legacy support fields
    amount?: number; 
}

const CATEGORIES = [
    'Rent', 'Salaries', 'Utilities', 'Marketing', 'Maintenance', 'Software', 
    'Sales', 'Service', 'Trip Income', 'Office Supplies', 'Travel', 
    'Consulting', 'Insurance', 'Taxes', 'Other Expenses'
];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#84cc16'];

const Expenses: React.FC = () => {
  const location = useLocation();
  const isAdminExpensesTab = location.pathname === '/admin/admin-expenses';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [corporatesList, setCorporatesList] = useState<CorporateAccount[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterCorporate, setFilterCorporate] = useState('All'); // For Admin view

  // Partnership Settlement State
  const [settlementData, setSettlementData] = useState<Record<string, SettlementRecord>>({});
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({}); // Stores input amount per card
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, string>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'Expense',
    category: 'Other Expenses',
    customCategory: '', // New field for manual entry
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    transactionNumber: '',
    status: 'Paid',
    description: '',
    receiptUrl: ''
  });

  // Load Data
  useEffect(() => {
    // Load Corporates
    try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporatesList(corps);
    } catch(e) {}

    // Load Settlements
    try {
        const settlements = JSON.parse(localStorage.getItem('partnership_settlements') || '{}');
        setSettlementData(settlements);
    } catch(e) {}

    // Load Expenses
    let allExpenses: Expense[] = [];
    
    if (isSuperAdmin) {
        // Load Admin Expenses
        try {
            const adminExp = JSON.parse(localStorage.getItem('office_expenses') || '[]');
            allExpenses = [...allExpenses, ...adminExp.map((e: any) => ({...e, franchiseName: 'Head Office', ownerId: 'admin'}))];
        } catch(e) {}

        // Load Corporate Expenses
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cExp = JSON.parse(localStorage.getItem(`office_expenses_${c.email}`) || '[]');
                allExpenses = [...allExpenses, ...cExp.map((e: any) => ({...e, franchiseName: c.companyName, ownerId: c.email}))];
            });
        } catch(e) {}
    } else {
        // Corporate View
        const key = `office_expenses_${sessionId}`;
        try {
            const cExp = JSON.parse(localStorage.getItem(key) || '[]');
            allExpenses = cExp.map((e: any) => ({...e, franchiseName: 'My Branch', ownerId: sessionId}));
        } catch(e) {}
    }
    
    setExpenses(allExpenses);
  }, [isSuperAdmin, sessionId]);

  // Handlers
  const handleOpenAddTransaction = () => {
      setEditingId(null);
      setFormData({
        title: '',
        amount: '',
        type: 'Expense',
        category: 'Other Expenses',
        customCategory: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        transactionNumber: '',
        status: 'Paid',
        description: '',
        receiptUrl: ''
      });
      setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.amount) return;

      setIsUploading(true);
      let receiptUrl = formData.receiptUrl;

      // Handle File Upload
      if (fileInputRef.current?.files?.[0]) {
          try {
              const file = fileInputRef.current.files[0];
              const path = `receipts/${formData.date}_${Date.now()}_${file.name}`;
              const cloudUrl = await uploadFileToCloud(file, path);
              
              if (cloudUrl) {
                  receiptUrl = cloudUrl;
              } else {
                  // Fallback to Base64 for local demo if cloud fails
                  receiptUrl = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(file);
                  });
              }
          } catch (error) {
              console.error("Receipt upload failed", error);
          }
      }

      const ownerId = isSuperAdmin ? 'admin' : sessionId; 
      const franchiseName = isSuperAdmin ? 'Head Office' : 'My Branch';
      
      // Combine custom category into description if "Other Expenses" is selected
      let finalDescription = formData.description;
      if (formData.category === 'Other Expenses' && formData.customCategory.trim()) {
          finalDescription = `[Type: ${formData.customCategory}] ${formData.description}`;
      }

      const newExpense: Expense = {
          id: editingId || `TRX-${Date.now()}`,
          title: formData.title,
          amount: parseFloat(formData.amount),
          type: formData.type as 'Income' | 'Expense',
          category: formData.category,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          transactionNumber: formData.transactionNumber,
          status: formData.status as 'Paid' | 'Pending' | 'Failed',
          description: finalDescription,
          receiptUrl: receiptUrl,
          ownerId: ownerId,
          franchiseName: franchiseName 
      };

      let storageKey = 'office_expenses';
      if (!isSuperAdmin) storageKey = `office_expenses_${sessionId}`;
      
      try {
          const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
          let updatedData;
          if (editingId) {
              updatedData = currentData.map((ex: Expense) => ex.id === editingId ? newExpense : ex);
          } else {
              updatedData = [newExpense, ...currentData];
          }
          localStorage.setItem(storageKey, JSON.stringify(updatedData));
          
          // Update State
          const expenseForState = { ...newExpense };

          if (editingId) {
              setExpenses(prev => prev.map(e => e.id === editingId ? expenseForState : e));
          } else {
              setExpenses(prev => [expenseForState, ...prev]);
          }
      } catch(e) {
          console.error("Error saving expense", e);
      }

      setIsUploading(false);
      setIsModalOpen(false);
  };

  const handleDelete = (id: string, ownerId?: string) => {
      if(!window.confirm("Delete this transaction?")) return;
      
      let storageKey = 'office_expenses';
      if (ownerId && ownerId !== 'admin') storageKey = `office_expenses_${ownerId}`;
      else if (!isSuperAdmin) storageKey = `office_expenses_${sessionId}`;

      try {
          const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const updatedData = currentData.filter((e: Expense) => e.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(updatedData));
          
          setExpenses(prev => prev.filter(e => e.id !== id));
      } catch(e) {}
  };

  // Partnership Handlers (New Partial Logic)
  const handlePaymentMethodSelect = (key: string, method: string) => {
      setSelectedPaymentMethods(prev => ({ ...prev, [key]: method }));
  };

  const handleAmountInputChange = (key: string, value: string) => {
      setPaymentInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleRecordPayment = (key: string, totalShareForPeriod: number) => {
      const amountToPay = parseFloat(paymentInputs[key]);
      if (!amountToPay || amountToPay <= 0) {
          alert("Please enter a valid amount");
          return;
      }

      const method = selectedPaymentMethods[key] || 'Bank Transfer';
      const existingRecord = settlementData[key] || {
          totalShare: totalShareForPeriod,
          paid: 0,
          status: 'Pending',
          transactions: []
      };

      const newTransaction: SettlementTransaction = {
          id: `TXN-${Date.now()}`,
          amount: amountToPay,
          date: new Date().toISOString(),
          method: method
      };

      // Handle legacy data where 'paid' might be missing but 'amount' exists
      const currentPaid = existingRecord.paid || (existingRecord.status === 'Settled' ? (existingRecord.amount || existingRecord.totalShare) : 0);

      const updatedPaid = currentPaid + amountToPay;
      // Using Math.ceil to avoid floating point issues when comparing
      const newStatus = Math.ceil(updatedPaid) >= Math.ceil(totalShareForPeriod) ? 'Settled' : 'Partial';

      const updatedRecord: SettlementRecord = {
          ...existingRecord,
          totalShare: totalShareForPeriod, 
          paid: updatedPaid,
          status: newStatus,
          transactions: [newTransaction, ...(existingRecord.transactions || [])]
      };

      const updatedSettlements = { ...settlementData, [key]: updatedRecord };
      setSettlementData(updatedSettlements);
      localStorage.setItem('partnership_settlements', JSON.stringify(updatedSettlements));
      
      // Clear input
      setPaymentInputs(prev => ({ ...prev, [key]: '' }));
  };

  const handleDeleteTransaction = (key: string, transactionId: string) => {
      if(!window.confirm("Delete this payment record?")) return;

      const record = settlementData[key];
      if(!record) return;

      const txToRemove = record.transactions.find(t => t.id === transactionId);
      if(!txToRemove) return;

      const updatedTransactions = record.transactions.filter(t => t.id !== transactionId);
      const updatedPaid = record.paid - txToRemove.amount;
      const newStatus = updatedPaid <= 0 ? 'Pending' : (updatedPaid >= record.totalShare ? 'Settled' : 'Partial');

      const updatedRecord: SettlementRecord = {
          ...record,
          paid: updatedPaid,
          status: newStatus as any,
          transactions: updatedTransactions
      };

      const updatedSettlements = { ...settlementData, [key]: updatedRecord };
      setSettlementData(updatedSettlements);
      localStorage.setItem('partnership_settlements', JSON.stringify(updatedSettlements));
  };

  // derived state
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (exp.franchiseName && exp.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (exp.transactionNumber && exp.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
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

    // If viewing "Admin Expenses" specifically, only show 'admin' ownerId
    if (isSuperAdmin && isAdminExpensesTab) {
        if (exp.ownerId !== 'admin') return false;
    }

    return matchesSearch && matchesCategory && matchesType && matchesMonth && matchesCorporate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

  const stats = useMemo(() => {
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
    })).sort((a, b) => b.value - a.value); // Sort descending

    return { totalIncome, totalExpense, balance, chartData };
  }, [filteredExpenses]); 

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

  // Helper to get previous month balance
  const getPreviousMonthBalance = (corpId: string, partnerIndex: number) => {
      try {
          const date = new Date(monthFilter + "-01"); 
          date.setMonth(date.getMonth() - 1);
          const prevMonthStr = date.toISOString().slice(0, 7);
          
          const prevKey = `${corpId}_${prevMonthStr}_${partnerIndex}`;
          const prevRecord = settlementData[prevKey];
          
          if (prevRecord) {
              const total = prevRecord.totalShare || prevRecord.amount || 0;
              const paid = prevRecord.paid !== undefined ? prevRecord.paid : (prevRecord.status === 'Settled' ? total : 0);
              const balance = total - paid;
              return balance > 0 ? balance : 0;
          }
      } catch (e) {
          console.error("Date parsing error for prev balance", e);
      }
      return 0;
  };

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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search transactions..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
          </div>
          {isSuperAdmin && !isAdminExpensesTab && (
              <select value={filterCorporate} onChange={e => setFilterCorporate(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporatesList.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
              </select>
          )}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="All">All Types</option>
              <option>Income</option>
              <option>Expense</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Expense Breakdown Chart */}
      {stats.chartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
           <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-emerald-600" /> Expense Breakdown
           </h3>
           <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={stats.chartData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={100}
                       paddingAngle={5}
                       dataKey="value"
                    >
                       {stats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} itemStyle={{ color: '#1f2937' }} />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                 </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* PARTNERSHIP DISTRIBUTION SECTION (If corporate has partners and not viewing admin expenses) */}
      {!isAdminExpensesTab && activeCorporate && activeCorporate.partners && activeCorporate.partners.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-lg">Profit Sharing</h3>
                          <p className="text-blue-100 text-xs">{activeCorporate.companyName}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                       <div className="text-right hidden md:block">
                           <span className="block text-xs text-blue-100">Total Pool</span>
                           <span className={`block font-bold ${stats.balance >= 0 ? 'text-white' : 'text-red-200'}`}>
                               {stats.balance >= 0 ? '+' : ''}₹{stats.balance.toLocaleString()}
                           </span>
                       </div>
                       <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                          {monthFilter}
                       </span>
                  </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/50">
                  {activeCorporate.partners.map((partner, index) => {
                      const shareAmount = (stats.balance * partner.percentage) / 100;
                      const isLoss = stats.balance < 0;
                      
                      // Settlement Key: CorporateID + Month + PartnerIndex
                      const settlementKey = `${activeCorporate.id}_${monthFilter}_${index}`;
                      
                      const settlementInfo = settlementData[settlementKey] || {
                          totalShare: shareAmount,
                          paid: 0,
                          status: 'Pending',
                          transactions: []
                      };
                      
                      // Check for previous month dues
                      const prevMonthBalance = getPreviousMonthBalance(activeCorporate.id, index);
                      
                      // Use snapshot if exists, else dynamic calc (fallback to legacy amount if present)
                      const currentTotalShare = settlementInfo.transactions.length > 0 ? settlementInfo.totalShare : (settlementInfo.amount || shareAmount);
                      
                      const totalPayable = currentTotalShare + prevMonthBalance;
                      
                      // Handle legacy paid status vs new calculated paid
                      const currentPaid = settlementInfo.paid || (settlementInfo.status === 'Settled' ? currentTotalShare : 0);
                      const remainingBalance = totalPayable - currentPaid;
                      
                      // Status logic
                      const status = remainingBalance <= 0 ? 'Settled' : (currentPaid > 0 ? 'Partial' : 'Pending');

                      return (
                          <div key={index} className={`rounded-xl p-5 border shadow-sm transition-all relative overflow-hidden group hover:shadow-md ${
                              isLoss 
                                ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100' 
                                : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'
                          }`}>
                              {/* Header */}
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <span className={`text-xs font-bold uppercase tracking-wider ${isLoss ? 'text-red-400' : 'text-emerald-500'}`}>Partner</span>
                                      <h4 className="font-bold text-gray-900 text-lg">{partner.name}</h4>
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-1 rounded border ${isLoss ? 'bg-white text-red-600 border-red-200' : 'bg-white text-emerald-600 border-emerald-200'}`}>
                                      {partner.percentage}% Share
                                  </span>
                              </div>
                              
                              {/* Amount Display */}
                              <div className="mb-4">
                                   <div className="flex justify-between items-end mb-1">
                                      <span className="text-xs text-gray-500">Current Share</span>
                                      <span className={`font-bold ${isLoss ? 'text-red-600' : 'text-gray-800'}`}>
                                         {isLoss ? '-₹' : '₹'}{Math.abs(currentTotalShare).toLocaleString()}
                                      </span>
                                   </div>
                                   {prevMonthBalance > 0 && (
                                       <div className="flex justify-between items-end mb-1 text-xs">
                                          <span className="text-orange-600 font-medium">Prev. Outstanding</span>
                                          <span className="text-orange-700 font-bold">+₹{prevMonthBalance.toLocaleString()}</span>
                                       </div>
                                   )}
                                   <div className="border-t border-gray-200/50 my-2"></div>
                                   <div className="flex justify-between items-end">
                                      <span className="text-xs font-bold text-gray-600 uppercase">Total Payable</span>
                                      <span className={`text-xl font-black tracking-tight ${isLoss ? 'text-red-600' : 'text-emerald-600'}`}>
                                         {isLoss ? '-₹' : '₹'}{Math.abs(totalPayable).toLocaleString()}
                                      </span>
                                   </div>
                              </div>

                              {/* Progress Bar */}
                              {!isLoss && (
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                                      <div 
                                          className={`h-2 rounded-full ${status === 'Settled' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                          style={{ width: `${totalPayable > 0 ? Math.min((currentPaid / totalPayable) * 100, 100) : 0}%` }}
                                      ></div>
                                  </div>
                              )}

                              {/* Settlement Controls */}
                              {!isLoss && (
                                  <div className="bg-white/60 p-3 rounded-lg border border-gray-100 backdrop-blur-sm">
                                      <div className="flex justify-between items-center mb-2">
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${status === 'Settled' ? 'bg-green-100 text-green-700' : status === 'Partial' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                              {status}
                                          </span>
                                          <span className="text-xs font-bold text-gray-500">
                                              Paid: ₹{currentPaid.toLocaleString()}
                                          </span>
                                      </div>
                                      
                                      {remainingBalance > 0 && (
                                          <div className="flex gap-2 mb-3">
                                              <input 
                                                  type="number"
                                                  placeholder="Amount"
                                                  className="w-20 px-2 py-1 text-xs border rounded outline-none"
                                                  value={paymentInputs[settlementKey] ?? ''}
                                                  onChange={(e) => handleAmountInputChange(settlementKey, e.target.value)}
                                              />
                                              <select 
                                                  className="flex-1 text-xs border rounded px-1 outline-none bg-white"
                                                  value={selectedPaymentMethods[settlementKey] || 'Bank Transfer'}
                                                  onChange={(e) => handlePaymentMethodSelect(settlementKey, e.target.value)}
                                              >
                                                  <option>Bank Transfer</option>
                                                  <option>Cash</option>
                                                  <option>UPI</option>
                                              </select>
                                              <button 
                                                  onClick={() => handleRecordPayment(settlementKey, shareAmount)}
                                                  className="bg-slate-800 text-white text-xs px-3 py-1 rounded font-bold hover:bg-slate-900 transition-colors"
                                              >
                                                  Pay
                                              </button>
                                          </div>
                                      )}

                                      {/* History List */}
                                      {settlementInfo.transactions && settlementInfo.transactions.length > 0 && (
                                          <div className="mt-2 border-t border-gray-200 pt-2">
                                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                                                  <History className="w-3 h-3" /> History
                                              </p>
                                              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                                  {settlementInfo.transactions.map((tx, idx) => (
                                                      <div key={idx} className="flex justify-between items-center text-[10px] text-gray-600 bg-white p-1 rounded border border-gray-100">
                                                          <span>{new Date(tx.date).toLocaleDateString()} ({tx.method})</span>
                                                          <div className="flex items-center gap-2">
                                                              <span className="font-bold text-emerald-600">₹{tx.amount.toLocaleString()}</span>
                                                              <button onClick={() => handleDeleteTransaction(settlementKey, tx.id)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Main Grid: Transactions & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Transactions Table */}
          <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">Recent Transactions</h3>
                      <span className="text-xs text-gray-500">{filteredExpenses.length} records</span>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                              <tr>
                                  <th className="px-6 py-4">Date</th>
                                  <th className="px-6 py-4">Transaction ID</th>
                                  <th className="px-6 py-4">Description</th>
                                  <th className="px-6 py-4">Category</th>
                                  <th className="px-6 py-4">Method</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4">Receipt</th>
                                  {isSuperAdmin && !isAdminExpensesTab && <th className="px-6 py-4">Franchise</th>}
                                  <th className="px-6 py-4 text-right">Amount</th>
                                  <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredExpenses.map(item => (
                                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                                      <td className="px-6 py-4 text-xs font-mono text-gray-500">{item.transactionNumber || '-'}</td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-800">{item.title}</div>
                                          <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                                              {item.category}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-gray-600">{item.paymentMethod}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                              item.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' :
                                              item.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                              'bg-red-50 text-red-700 border-red-100'
                                          }`}>
                                              {item.status || 'Paid'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          {item.receiptUrl ? (
                                              <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                                  <LinkIcon className="w-3 h-3" /> View
                                              </a>
                                          ) : (
                                              <span className="text-gray-400 text-xs">-</span>
                                          )}
                                      </td>
                                      {isSuperAdmin && !isAdminExpensesTab && (
                                          <td className="px-6 py-4">
                                              <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100 font-medium">
                                                  {item.franchiseName || 'Head Office'}
                                              </span>
                                          </td>
                                      )}
                                      <td className={`px-6 py-4 text-right font-bold ${item.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                          {item.type === 'Income' ? '+' : '-'}₹{item.amount.toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              <button 
                                                  onClick={() => {
                                                      setEditingId(item.id);
                                                      setFormData({
                                                          title: item.title,
                                                          amount: item.amount.toString(),
                                                          type: item.type,
                                                          category: item.category,
                                                          customCategory: '', // Clear this on edit init, assuming category holds main value
                                                          date: item.date,
                                                          paymentMethod: item.paymentMethod,
                                                          transactionNumber: item.transactionNumber || '',
                                                          status: item.status || 'Paid',
                                                          description: item.description,
                                                          receiptUrl: item.receiptUrl || ''
                                                      });
                                                      setIsModalOpen(true);
                                                  }}
                                                  className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                                              >
                                                  <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button 
                                                  onClick={() => handleDelete(item.id, item.ownerId)}
                                                  className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {filteredExpenses.length === 0 && (
                                  <tr><td colSpan={isSuperAdmin && !isAdminExpensesTab ? 10 : 9} className="py-12 text-center text-gray-400">No transactions found.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* Right Column: Chart */}
          <div className="lg:col-span-1">
              {stats.chartData.length > 0 ? (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-6">
                   <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-emerald-600" /> Expense Breakdown
                   </h3>
                   <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={stats.chartData}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={100}
                               paddingAngle={5}
                               dataKey="value"
                            >
                               {stats.chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} itemStyle={{ color: '#1f2937' }} />
                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              ) : (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500 h-full flex flex-col items-center justify-center min-h-[300px]">
                      <PieChartIcon className="w-12 h-12 text-gray-300 mb-2" />
                      <p>No expense data to display chart.</p>
                  </div>
              )}
          </div>
      </div>

      {/* Add/Edit Modal - Restructured */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <form onSubmit={handleSaveTransaction} className="p-6">
                      
                      {/* 1. Transaction Type Toggle */}
                      <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6">
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, type: 'Income'})} 
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <ArrowUpCircle className="w-4 h-4" /> Income
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, type: 'Expense'})} 
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <ArrowDownCircle className="w-4 h-4" /> Expense
                          </button>
                      </div>

                      <div className="space-y-6">
                          {/* 2. Core Financials */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Amount (₹)</label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                      <input 
                                        required 
                                        type="number" 
                                        value={formData.amount} 
                                        onChange={e => setFormData({...formData, amount: e.target.value})} 
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-gray-800" 
                                        placeholder="0.00" 
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Date</label>
                                  <div className="relative">
                                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                      <input 
                                        type="date" 
                                        required 
                                        value={formData.date} 
                                        onChange={e => setFormData({...formData, date: e.target.value})} 
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Status</label>
                                  <select 
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value})} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                  >
                                      <option>Paid</option>
                                      <option>Pending</option>
                                      <option>Failed</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Payment Method</label>
                                  <div className="relative">
                                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                      <select 
                                        value={formData.paymentMethod} 
                                        onChange={e => setFormData({...formData, paymentMethod: e.target.value})} 
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                                      >
                                          <option>Bank Transfer</option>
                                          <option>Cash</option>
                                          <option>UPI</option>
                                          <option>Cheque</option>
                                          <option>Card</option>
                                      </select>
                                  </div>
                              </div>
                          </div>

                          {/* 3. Classification */}
                          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                              <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                  <Tag className="w-3 h-3" /> Classification
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                      <select 
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                      >
                                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                      
                                      {/* CONDITIONAL INPUT FOR OTHER EXPENSES */}
                                      {formData.category === 'Other Expenses' && (
                                          <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                              <input 
                                                  type="text"
                                                  value={formData.customCategory}
                                                  onChange={e => setFormData({...formData, customCategory: e.target.value})}
                                                  placeholder="Specify Expense Details..."
                                                  className="w-full px-4 py-2 border border-orange-300 bg-orange-50 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm text-orange-900 placeholder-orange-400"
                                                  autoFocus
                                              />
                                          </div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Title / Reference</label>
                                      <input 
                                        required 
                                        value={formData.title} 
                                        onChange={e => setFormData({...formData, title: e.target.value})} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                        placeholder="e.g. Office Rent" 
                                      />
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (Optional)</label>
                                  <input 
                                    value={formData.transactionNumber} 
                                    onChange={e => setFormData({...formData, transactionNumber: e.target.value})} 
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm" 
                                    placeholder="e.g. UPI-1234567890" 
                                  />
                              </div>
                          </div>

                          {/* 4. Evidence & Details */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description</label>
                              <textarea 
                                rows={2} 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
                                placeholder="Additional details..." 
                              />
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Upload Receipt</label>
                              <input 
                                ref={fileInputRef}
                                type="file" 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" 
                                accept="image/*,.pdf"
                              />
                          </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isUploading} 
                        className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg mt-6 disabled:opacity-70 flex justify-center items-center gap-2"
                      >
                          {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
                          {editingId ? 'Update Transaction' : 'Save Transaction'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Expenses;
