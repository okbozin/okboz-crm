
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Send, Plus, Search, Filter, Users, 
  FileText, BarChart3, Sparkles, Trash2, Edit2, 
  CheckCircle, Clock, X, Loader2, AlertCircle
} from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';
import { Enquiry, Employee, UserRole } from '../../types';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  audience: string;
  audienceCount: number;
  status: 'Draft' | 'Scheduled' | 'Sent';
  sentDate?: string;
  content: string;
  stats?: {
    opened: number;
    clicked: number;
  };
}

const AUDIENCE_OPTIONS = [
  { id: 'all_leads', label: 'All Leads' },
  { id: 'hot_leads', label: 'Hot Leads' },
  { id: 'warm_leads', label: 'Warm Leads' },
  { id: 'customers', label: 'Converted Customers' },
  { id: 'staff', label: 'All Staff' },
  { id: 'vendors', label: 'Vehicle Vendors' },
];

const EmailMarketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Campaigns' | 'Templates'>('Campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('email_campaigns');
    return saved ? JSON.parse(saved) : [];
  });

  // Data for Audience Counts
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    audience: 'all_leads',
    content: ''
  });

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTargetField, setAiTargetField] = useState<'subject' | 'content'>('content');

  // Load Data Counts
  useEffect(() => {
    const loadCounts = () => {
        const leads: Enquiry[] = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
        const staff: Employee[] = JSON.parse(localStorage.getItem('staff_data') || '[]');
        const vendors = JSON.parse(localStorage.getItem('vendor_data') || '[]');

        setCounts({
            all_leads: leads.length,
            hot_leads: leads.filter(l => l.priority === 'Hot').length,
            warm_leads: leads.filter(l => l.priority === 'Warm').length,
            customers: leads.filter(l => l.status === 'Converted' || l.status === 'Closed').length,
            staff: staff.length,
            vendors: vendors.length
        });
    };
    loadCounts();
  }, []);

  // Save Campaigns
  useEffect(() => {
    localStorage.setItem('email_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  const handleSaveCampaign = (status: 'Draft' | 'Sent') => {
    if (!formData.name || !formData.subject || !formData.content) {
        alert("Please fill all fields.");
        return;
    }

    const newCampaign: Campaign = {
        id: editingId || `CMP-${Date.now()}`,
        name: formData.name,
        subject: formData.subject,
        audience: formData.audience,
        audienceCount: counts[formData.audience] || 0,
        status: status,
        sentDate: status === 'Sent' ? new Date().toLocaleString() : undefined,
        content: formData.content,
        stats: status === 'Sent' ? { opened: 0, clicked: 0 } : undefined
    };

    if (editingId) {
        setCampaigns(prev => prev.map(c => c.id === editingId ? newCampaign : c));
    } else {
        setCampaigns(prev => [newCampaign, ...prev]);
    }

    if (status === 'Sent') {
        alert(`Campaign "${formData.name}" sent to ${counts[formData.audience] || 0} recipients!`);
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this campaign?")) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setFormData({
        name: campaign.name,
        subject: campaign.subject,
        audience: campaign.audience,
        content: campaign.content
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', subject: '', audience: 'all_leads', content: '' });
  };

  // AI Generator
  const handleOpenAi = (field: 'subject' | 'content') => {
      setAiTargetField(field);
      setAiPrompt('');
      setShowAiModal(true);
  };

  const handleGenerateAi = async () => {
      if (!aiPrompt) return;
      setIsGenerating(true);
      
      const context = `
      Role: Professional Email Marketing Copywriter.
      Task: Write ${aiTargetField === 'subject' ? '5 catchy email subject lines (pick the best one)' : 'a professional, persuasive email body'}.
      Target Audience: ${AUDIENCE_OPTIONS.find(a => a.id === formData.audience)?.label}.
      Goal/Context: ${aiPrompt}.
      Tone: Professional, engaging, and concise.
      Result: Just the ${aiTargetField} text, no explanations.
      `;

      try {
          const text = await generateGeminiResponse(context);
          if (aiTargetField === 'subject') {
             // Clean up if AI returns multiple lines or bullets, just take the first good line
             const cleanText = text.split('\n')[0].replace(/^["']|["']$/g, '').replace(/Subject:/i, '').trim();
             setFormData(prev => ({ ...prev, subject: cleanText }));
          } else {
             setFormData(prev => ({ ...prev, content: text }));
          }
          setShowAiModal(false);
      } catch (e) {
          alert("AI Generation failed. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  const stats = useMemo(() => {
      return {
          totalSent: campaigns.filter(c => c.status === 'Sent').length,
          totalEmails: campaigns.filter(c => c.status === 'Sent').reduce((acc, curr) => acc + curr.audienceCount, 0),
          drafts: campaigns.filter(c => c.status === 'Draft').length
      };
  }, [campaigns]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Mail className="w-8 h-8 text-emerald-600" /> Email Marketing
          </h2>
          <p className="text-gray-500">Create, schedule, and track email campaigns</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Campaign
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Campaigns Sent</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSent}</h3>
             </div>
             <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Send className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Emails Delivered</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmails}</h3>
             </div>
             <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Drafts</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.drafts}</h3>
             </div>
             <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><FileText className="w-6 h-6" /></div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
         {/* Tabs */}
         <div className="flex border-b border-gray-200 px-6 pt-4">
             <button 
                onClick={() => setActiveTab('Campaigns')}
                className={`pb-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'Campaigns' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
                All Campaigns
             </button>
             <button 
                onClick={() => setActiveTab('Templates')}
                className={`pb-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'Templates' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
                Templates
             </button>
         </div>

         {/* Campaigns List */}
         {activeTab === 'Campaigns' && (
             <div className="p-6">
                {campaigns.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
                        <p className="text-gray-500 mt-1 mb-4">Start by creating your first email campaign.</p>
                        <button onClick={() => setIsModalOpen(true)} className="text-emerald-600 font-medium hover:underline">Create Campaign</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {campaigns.map(campaign => (
                            <div key={campaign.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-900 text-lg">{campaign.name}</h4>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                                campaign.status === 'Sent' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                campaign.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                                {campaign.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Subject: <span className="italic">"{campaign.subject}"</span></p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {AUDIENCE_OPTIONS.find(a => a.id === campaign.audience)?.label} ({campaign.audienceCount})</span>
                                            {campaign.sentDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Sent: {campaign.sentDate}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(campaign)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(campaign.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
         )}

         {activeTab === 'Templates' && (
             <div className="p-12 text-center text-gray-500">
                 <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                 <p>Templates coming soon. Use AI generation for now!</p>
             </div>
         )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Campaign' : 'New Email Campaign'}</h3>
                      <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                              <input 
                                  value={formData.name}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                                  placeholder="e.g. Diwali Offer 2025"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                              <select 
                                  value={formData.audience}
                                  onChange={e => setFormData({...formData, audience: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                              >
                                  {AUDIENCE_OPTIONS.map(opt => (
                                      <option key={opt.id} value={opt.id}>{opt.label} (~{counts[opt.id] || 0})</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-center mb-1">
                              <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                              <button 
                                onClick={() => handleOpenAi('subject')}
                                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                              >
                                  <Sparkles className="w-3 h-3" /> AI Suggest
                              </button>
                          </div>
                          <input 
                              value={formData.subject}
                              onChange={e => setFormData({...formData, subject: e.target.value})}
                              placeholder="Enter a catchy subject..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                      </div>

                      <div className="flex-1 flex flex-col min-h-[200px]">
                          <div className="flex justify-between items-center mb-1">
                              <label className="block text-sm font-medium text-gray-700">Email Content</label>
                              <button 
                                onClick={() => handleOpenAi('content')}
                                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                              >
                                  <Sparkles className="w-3 h-3" /> AI Write Body
                              </button>
                          </div>
                          <textarea 
                              value={formData.content}
                              onChange={e => setFormData({...formData, content: e.target.value})}
                              placeholder="Write your email content here..."
                              className="w-full flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                          />
                      </div>
                  </div>

                  <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                      <button onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors">Cancel</button>
                      <button onClick={() => handleSaveCampaign('Draft')} className="px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition-colors">Save Draft</button>
                      <button onClick={() => handleSaveCampaign('Sent')} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2">
                          <Send className="w-4 h-4" /> Send Now
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Prompt Modal */}
      {showAiModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" /> 
                      AI {aiTargetField === 'subject' ? 'Subject Generator' : 'Content Writer'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">Describe what this email is about.</p>
                  
                  <textarea 
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. Announce a 20% discount on all outstation trips for the upcoming festival season."
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none mb-4"
                      autoFocus
                  />
                  
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAiModal(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                      <button 
                          onClick={handleGenerateAi}
                          disabled={!aiPrompt || isGenerating}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                      >
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generate
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default EmailMarketing;
