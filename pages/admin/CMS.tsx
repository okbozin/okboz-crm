
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Save, LayoutDashboard, Text, Image, FileText, DollarSign, MessageCircle, 
  Settings, Plus, Trash2, Edit2, Check, ExternalLink, CalendarDays, BarChart3,
  MapPin, Smartphone, Shield, Zap, Globe, Users, Building2, Link, Copy,
  Sparkles, X, Loader2, CheckCircle // Ensure CheckCircle is imported
} from 'lucide-react';
import { LandingPageContent } from '../../types';

// Define DEFAULT_CMS_CONTENT within this file
const DEFAULT_CMS_CONTENT: LandingPageContent = {
  hero: {
    headline: "Manage your staff smarter, not harder.",
    subheadline: "The all-in-one platform for attendance tracking, automated payroll, and field force management. Designed for modern Indian businesses.",
    ctaButtonText: "Get Started Free",
    ctaButtonLink: "/login",
    demoButtonText: "View Demo",
    demoButtonLink: "#",
    promoBadge: "New: AI HR Assistant Added",
    promoIcon: "Sparkles",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
  },
  features: {
    title: "Everything you need to run your team",
    description: "Powerful features to handle attendance, payroll, and field operations without the chaos.",
    items: [
      { icon: "MapPin", bg: 'bg-blue-500', title: 'GPS Attendance', desc: 'Geofenced punch-in allows staff to mark attendance only when they are at the office or designated site.' },
      { icon: "DollarSign", bg: 'bg-emerald-500', title: 'Automated Payroll', desc: 'Auto-calculate salaries based on attendance, overtime, and leaves. Generate payslips in one click.' },
      { icon: "Smartphone", bg: 'bg-purple-500', title: 'Field Tracking', desc: 'Live location tracking for sales and delivery teams. Know exactly where your field staff is.' },
      { icon: "BarChart3", bg: 'bg-orange-500', title: 'Lead CRM', desc: 'Built-in Mini CRM to manage leads, track conversions, and assign follow-ups to sales team.' },
      { icon: "Shield", bg: 'bg-red-500', title: 'Role Management', desc: 'Granular access controls for Admins, Managers, and Employees to keep data secure.' },
      { icon: "Zap", bg: 'bg-indigo-500', title: 'AI Assistant', desc: 'Get instant answers to HR queries, draft announcements, and analyze trends with our AI.' }
    ]
  },
  testimonials: {
    title: "Loved by businesses like yours",
    description: "See what our customers have to say about OK BOZ.",
    items: [
      { name: "Sarah Chen", role: "HR Director, TechFlow", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=faces", quote: "OK BOZ transformed how we manage remote attendance. The geofencing feature is a game-changer for our field sales team." },
      { name: "Michael Ross", role: "Founder, StartUp Hub", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces", quote: "Payroll used to take me 2 days. Now it takes 10 minutes. The automated calculations are spot on every single time." },
      { name: "Priya Patel", role: "Operations Head, Logistics Co", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces", quote: "The interface is so intuitive that my staff needed zero training. It just works. Highly recommended for Indian SMEs." }
    ]
  },
  pricing: {
    title: "Simple, transparent pricing",
    description: "Choose the plan that's right for your growing team.",
    billingToggleMonthly: "Monthly",
    billingToggleYearly: "Yearly",
    plans: [
      { name: 'Starter', priceMonthly: '0', priceYearly: '0', description: 'Perfect for small teams getting started.', features: ['Up to 5 Employees', 'Basic Attendance Tracking', '1 Branch Location', '30 Days Data Retention'], buttonText: 'Start Free', highlight: false },
      { name: 'Professional', priceMonthly: '2,999', priceYearly: '2,499', description: 'For growing businesses needing efficiency.', features: ['Up to 50 Employees', 'Automated Payroll', '5 Branch Locations', 'Unlimited History', 'Email & SMS Alerts', 'AI Assistant'], buttonText: 'Start Trial', highlight: true },
      { name: 'Business', priceMonthly: '12,999', priceYearly: '9,999', description: 'Scale your operations without limits.', features: ['Unlimited Employees', 'Dedicated Account Manager', 'Unlimited Branches', 'API Access', 'Custom Reports', 'Priority Support'], buttonText: 'Contact Sales', highlight: false }
    ]
  },
  faq: {
    title: "Frequently Asked Questions",
    description: "Have questions? We're here to help.",
    items: [
      { q: "Is my data secure?", a: "Absolutely. We use enterprise-grade encryption for all data storage and transfer. Your employee records are safe with us." },
      { q: "Can I track field employees?", a: "Yes! Our GPS tracking feature allows you to see real-time locations of your field staff during work hours." },
      { q: "How does the free plan work?", a: "The Starter plan is free forever for up to 5 employees. It includes basic attendance and branch management features." },
      { q: "Do you offer custom integrations?", a: "Yes, our Business plan includes API access and we can build custom integrations for your specific needs." }
    ]
  },
  cta: {
    headline: "Ready to streamline your business?",
    subheadline: "Join thousands of businesses who trust OK BOZ for their daily operations.",
    buttonText: "Start Your Free Trial",
    buttonLink: "/login",
  },
  footer: {
    companyName: "OK BOZ",
    description: "Making workforce management simple, smart, and efficient for everyone.",
    productLinks: [
      { label: "Features", link: "#features" },
      { label: "Pricing", link: "#pricing" },
      { label: "Integrations", link: "#" },
      { label: "Changelog", link: "#" }
    ],
    companyLinks: [
      { label: "About Us", link: "#" },
      { label: "Careers", link: "#" },
      { label: "Blog", link: "#" },
      { label: "Contact", link: "#" }
    ],
    legalLinks: [
      { label: "Privacy Policy", link: "#" },
      { label: "Terms of Service", link: "#" },
      { label: "Security", link: "#" }
    ],
    socialLinks: [
      { label: "Twitter", link: "#" },
      { label: "LinkedIn", link: "#" },
      { label: "Instagram", link: "#" }
    ],
    copyright: "2025 OK BOZ Inc. All rights reserved."
  }
};

const CMS: React.FC = () => {
  const [cmsContent, setCmsContent] = useState<LandingPageContent>(DEFAULT_CMS_CONTENT);
  const [activeSection, setActiveSection] = useState<keyof LandingPageContent>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Debounce ref for auto-saving
  const saveTimeoutRef = useRef<number | null>(null);

  // Memoized ICON_MAP for consistent component references
  const ICON_MAP = useMemo(() => ({
    Sparkles: Sparkles,
    MapPin: MapPin,
    DollarSign: DollarSign,
    Smartphone: Smartphone,
    BarChart3: BarChart3,
    Shield: Shield,
    Zap: Zap,
    Globe: Globe,
    Users: Users,
    CheckCircle: CheckCircle, // Use CheckCircle here for consistency
    LayoutDashboard: LayoutDashboard, // Default fallback icon
    Pencil: Edit2, // Use Edit2 here
  }), []);

  // Memoized helper function to get icon component
  const getIconComponent = useCallback((iconName: string | undefined | null, defaultIcon: React.ElementType = LayoutDashboard) => {
    if (typeof iconName !== 'string' || !ICON_MAP[iconName]) {
      console.warn(`Icon "${iconName}" not found or invalid. Using default.`);
      return defaultIcon;
    }
    return ICON_MAP[iconName];
  }, [ICON_MAP, LayoutDashboard]);

  // Dynamically generate available icons from ICON_MAP keys
  const AVAILABLE_ICONS = useMemo(() => Object.keys(ICON_MAP), [ICON_MAP]);

  // Load content on mount
  useEffect(() => {
    try {
      const savedContent = localStorage.getItem('landing_page_content');
      if (savedContent) {
        const parsedContent = JSON.parse(savedContent);
        // Deep merge to ensure all default fields exist if not in saved content
        setCmsContent(prevState => ({
            ...DEFAULT_CMS_CONTENT, // Start with full default structure
            ...parsedContent,
            hero: { ...DEFAULT_CMS_CONTENT.hero, ...parsedContent.hero },
            features: { 
                ...DEFAULT_CMS_CONTENT.features, 
                ...parsedContent.features, 
                items: parsedContent.features?.items || DEFAULT_CMS_CONTENT.features.items 
            },
            testimonials: { 
                ...DEFAULT_CMS_CONTENT.testimonials, 
                ...parsedContent.testimonials, 
                items: parsedContent.testimonials?.items || DEFAULT_CMS_CONTENT.testimonials.items 
            },
            pricing: { 
                ...DEFAULT_CMS_CONTENT.pricing, 
                ...parsedContent.pricing, 
                plans: parsedContent.pricing?.plans || DEFAULT_CMS_CONTENT.pricing.plans 
            },
            faq: { 
                ...DEFAULT_CMS_CONTENT.faq, 
                ...parsedContent.faq, 
                items: parsedContent.faq?.items || DEFAULT_CMS_CONTENT.faq.items 
            },
            cta: { ...DEFAULT_CMS_CONTENT.cta, ...parsedContent.cta },
            footer: {
                ...DEFAULT_CMS_CONTENT.footer,
                ...parsedContent.footer,
                productLinks: parsedContent.footer?.productLinks || DEFAULT_CMS_CONTENT.footer.productLinks,
                companyLinks: parsedContent.footer?.companyLinks || DEFAULT_CMS_CONTENT.footer.companyLinks,
                legalLinks: parsedContent.footer?.legalLinks || DEFAULT_CMS_CONTENT.footer.legalLinks,
                socialLinks: parsedContent.footer?.socialLinks || DEFAULT_CMS_CONTENT.footer.socialLinks,
            },
        }));
      }
    } catch (e) {
      console.error("Failed to load CMS content:", e);
      setSaveMessage("Error loading content. Using default data.");
    }
  }, []);

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveAllChanges(true); // Silent save
    }, 1500) as unknown as number; // Type assertion for NodeJS.Timeout vs number

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cmsContent]); // Depend on the entire cmsContent object

  const handleContentChange = <S extends keyof LandingPageContent>(
    section: S,
    field: keyof LandingPageContent[S],
    value: any // Using any for value as it can be string, number, boolean, etc.
  ) => {
    setCmsContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Generic handler for changing items within an array in a section
  const handleArrayItemChange = (
    section: keyof LandingPageContent,
    arrayFieldName: string, // The key like 'items', 'plans', 'productLinks'
    index: number,
    itemFieldKey: string, // The key of the property within the array item, like 'icon', 'name', 'priceMonthly'
    value: any
  ) => {
    setCmsContent(prev => {
      const sectionContent = { ...prev[section] };
      const currentArray = (sectionContent as any)[arrayFieldName]; // Access dynamically
      
      if (Array.isArray(currentArray)) {
        const updatedArray = [...currentArray];
        if (updatedArray[index]) {
          updatedArray[index] = {
            ...updatedArray[index],
            [itemFieldKey]: value
          };
        }
        return {
          ...prev,
          [section]: {
            ...sectionContent,
            [arrayFieldName]: updatedArray // Re-assign updated array
          }
        };
      }
      return prev;
    });
  };

  // Generic handler for adding an item to an array in a section
  const handleAddArrayItem = (
    section: keyof LandingPageContent,
    arrayFieldName: string, // The key like 'items', 'plans', 'productLinks'
    newItem: any // The default structure for a new item
  ) => {
    setCmsContent(prev => {
      const sectionContent = { ...prev[section] };
      const currentArray = (sectionContent as any)[arrayFieldName]; // Access dynamically

      if (Array.isArray(currentArray)) {
        const updatedArray = [...currentArray, newItem];
        return {
          ...prev,
          [section]: {
            ...sectionContent,
            [arrayFieldName]: updatedArray
          }
        };
      }
      return prev;
    });
  };

  // Generic handler for removing an item from an array in a section
  const handleRemoveArrayItem = (
    section: keyof LandingPageContent,
    arrayFieldName: string, // The key like 'items', 'plans', 'productLinks'
    index: number
  ) => {
    setCmsContent(prev => {
      const sectionContent = { ...prev[section] };
      const currentArray = (sectionContent as any)[arrayFieldName]; // Access dynamically

      if (Array.isArray(currentArray)) {
        const updatedArray = currentArray.filter((_: any, idx: number) => idx !== index);
        return {
          ...prev,
          [section]: {
            ...sectionContent,
            [arrayFieldName]: updatedArray
          }
        };
      }
      return prev;
    });
  };

  const handleSaveAllChanges = (silent: boolean = false) => {
    setIsSaving(true);
    try {
      localStorage.setItem('landing_page_content', JSON.stringify(cmsContent));
      if (!silent) {
        setSaveMessage('All changes saved successfully!');
      }
    } catch (e) {
      console.error("Failed to save CMS content:", e);
      setSaveMessage('Error saving changes. Local storage might be full.');
    } finally {
      setIsSaving(false);
      if (!silent) {
        setTimeout(() => setSaveMessage(''), 3000);
      }
    }
  };

  const renderSectionEditor = () => {
    switch (activeSection) {
      case 'hero':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Image className="w-5 h-5 text-blue-500" /> Hero Section</h3>
            <label className="block text-sm font-medium text-gray-700">Headline</label>
            <input type="text" value={cmsContent.hero.headline} onChange={(e) => handleContentChange('hero', 'headline', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Subheadline</label>
            <textarea value={cmsContent.hero.subheadline} onChange={(e) => handleContentChange('hero', 'subheadline', e.target.value)} className="w-full p-2 border rounded-lg h-24" />
            <label className="block text-sm font-medium text-gray-700">Call to Action Button Text</label>
            <input type="text" value={cmsContent.hero.ctaButtonText} onChange={(e) => handleContentChange('hero', 'ctaButtonText', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Call to Action Button Link</label>
            <input type="text" value={cmsContent.hero.ctaButtonLink} onChange={(e) => handleContentChange('hero', 'ctaButtonLink', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Demo Button Text</label>
            <input type="text" value={cmsContent.hero.demoButtonText} onChange={(e) => handleContentChange('hero', 'demoButtonText', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Demo Button Link</label>
            <input type="text" value={cmsContent.hero.demoButtonLink} onChange={(e) => handleContentChange('hero', 'demoButtonLink', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Promotional Badge Text</label>
            <input type="text" value={cmsContent.hero.promoBadge} onChange={(e) => handleContentChange('hero', 'promoBadge', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Hero Image URL</label>
            <input type="text" value={cmsContent.hero.image} onChange={(e) => handleContentChange('hero', 'image', e.target.value)} className="w-full p-2 border rounded-lg" />
            {cmsContent.hero.image && <img src={cmsContent.hero.image} alt="Hero Preview" className="mt-2 max-h-48 object-contain" />}
          </div>
        );
      case 'features':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-500" /> Features Section</h3>
            <label className="block text-sm font-medium text-gray-700">Section Title</label>
            <input type="text" value={cmsContent.features.title} onChange={(e) => handleContentChange('features', 'title', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Section Description</label>
            <textarea value={cmsContent.features.description} onChange={(e) => handleContentChange('features', 'description', e.target.value)} className="w-full p-2 border rounded-lg h-24" />
            
            <h4 className="font-bold text-gray-700 mt-6 mb-3">Feature Items</h4>
            <div className="space-y-3">
              {cmsContent.features.items.map((item, index) => (
                <div key={index} className="border p-4 rounded-lg bg-gray-50 space-y-2 relative">
                  <button onClick={() => handleRemoveArrayItem('features', 'items', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  <label className="block text-sm font-medium text-gray-700">Icon (Name from Lucide-React)</label>
                  <select value={item.icon} onChange={(e) => handleArrayItemChange('features', 'items', index, 'icon', e.target.value)} className="w-full p-2 border rounded-lg">
                    {AVAILABLE_ICONS.map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}
                  </select>
                  <label className="block text-sm font-medium text-gray-700">Background Color Class</label>
                  <input type="text" value={item.bg} onChange={(e) => handleArrayItemChange('features', 'items', index, 'bg', e.target.value)} className="w-full p-2 border rounded-lg" placeholder="e.g. bg-blue-500" />
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input type="text" value={item.title} onChange={(e) => handleArrayItemChange('features', 'items', index, 'title', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={item.desc} onChange={(e) => handleArrayItemChange('features', 'items', index, 'desc', e.target.value)} className="w-full p-2 border rounded-lg h-20" />
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleAddArrayItem('features', 'items', { icon: "LayoutDashboard", bg: 'bg-gray-500', title: 'New Feature', desc: 'Description of new feature.' })}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Feature
            </button>
          </div>
        );
      case 'testimonials':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-yellow-500" /> Testimonials Section</h3>
            <label className="block text-sm font-medium text-gray-700">Section Title</label>
            <input type="text" value={cmsContent.testimonials.title} onChange={(e) => handleContentChange('testimonials', 'title', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Section Description</label>
            <textarea value={cmsContent.testimonials.description} onChange={(e) => handleContentChange('testimonials', 'description', e.target.value)} className="w-full p-2 border rounded-lg h-24" />

            <h4 className="font-bold text-gray-700 mt-6 mb-3">Testimonial Items</h4>
            <div className="space-y-3">
              {cmsContent.testimonials.items.map((item, index) => (
                <div key={index} className="border p-4 rounded-lg bg-gray-50 space-y-2 relative">
                  <button onClick={() => handleRemoveArrayItem('testimonials', 'items', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" value={item.name} onChange={(e) => handleArrayItemChange('testimonials', 'items', index, 'name', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input type="text" value={item.role} onChange={(e) => handleArrayItemChange('testimonials', 'items', index, 'role', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input type="text" value={item.image} onChange={(e) => handleArrayItemChange('testimonials', 'items', index, 'image', e.target.value)} className="w-full p-2 border rounded-lg" />
                  {item.image && <img src={item.image} alt="Testimonial Preview" className="mt-2 max-h-24 object-contain rounded-full" />}
                  <label className="block text-sm font-medium text-gray-700">Quote</label>
                  <textarea value={item.quote} onChange={(e) => handleArrayItemChange('testimonials', 'items', index, 'quote', e.target.value)} className="w-full p-2 border rounded-lg h-20" />
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleAddArrayItem('testimonials', 'items', { name: 'New Person', role: 'New Role', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces', quote: 'New testimonial quote.' })}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Testimonial
            </button>
          </div>
        );
      case 'pricing':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500" /> Pricing Section</h3>
            <label className="block text-sm font-medium text-gray-700">Section Title</label>
            <input type="text" value={cmsContent.pricing.title} onChange={(e) => handleContentChange('pricing', 'title', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Section Description</label>
            <textarea value={cmsContent.pricing.description} onChange={(e) => handleContentChange('pricing', 'description', e.target.value)} className="w-full p-2 border rounded-lg h-24" />
            <label className="block text-sm font-medium text-gray-700">Billing Toggle (Monthly Label)</label>
            <input type="text" value={cmsContent.pricing.billingToggleMonthly} onChange={(e) => handleContentChange('pricing', 'billingToggleMonthly', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Billing Toggle (Yearly Label)</label>
            <input type="text" value={cmsContent.pricing.billingToggleYearly} onChange={(e) => handleContentChange('pricing', 'billingToggleYearly', e.target.value)} className="w-full p-2 border rounded-lg" />

            <h4 className="font-bold text-gray-700 mt-6 mb-3">Pricing Plans</h4>
            <div className="space-y-3">
              {cmsContent.pricing.plans.map((plan, index) => (
                <div key={index} className={`border p-4 rounded-lg space-y-2 relative ${plan.highlight ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <button onClick={() => handleRemoveArrayItem('pricing', 'plans', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" value={plan.name} onChange={(e) => handleArrayItemChange('pricing', 'plans', index, 'name', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Price (Monthly)</label>
                  <input type="text" value={plan.priceMonthly} onChange={(e) => handleArrayItemChange('pricing', 'plans', index, 'priceMonthly', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Price (Yearly)</label>
                  <input type="text" value={plan.priceYearly} onChange={(e) => handleArrayItemChange('pricing', 'plans', index, 'priceYearly', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={plan.description} onChange={(e) => handleArrayItemChange('pricing', 'plans', index, 'description', e.target.value)} className="w-full p-2 border rounded-lg h-16" />
                  <label className="block text-sm font-medium text-gray-700">Button Text</label>
                  <input type="text" value={plan.buttonText} onChange={(e) => handleArrayItemChange('pricing', 'plans', index, 'buttonText', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Features (comma separated)</label>
                  <textarea value={plan.features.join(', ')} onChange={(e) => handleArrayItemChange('pricing', 'plans', index, 'features', e.target.value.split(',').map(s => s.trim()))} className="w-full p-2 border rounded-lg h-20" />
                  <ToggleSwitch label="Highlight Plan" checked={plan.highlight} onChange={() => handleArrayItemChange('pricing', 'plans', index, 'highlight', !plan.highlight)} />
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleAddArrayItem('pricing', 'plans', { name: 'New Plan', priceMonthly: '0', priceYearly: '0', description: 'New plan description.', features: ['New Feature 1', 'New Feature 2'], buttonText: 'Get Plan', highlight: false })}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Plan
            </button>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> FAQ Section</h3>
            <label className="block text-sm font-medium text-gray-700">Section Title</label>
            <input type="text" value={cmsContent.faq.title} onChange={(e) => handleContentChange('faq', 'title', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Section Description</label>
            <textarea value={cmsContent.faq.description} onChange={(e) => handleContentChange('faq', 'description', e.target.value)} className="w-full p-2 border rounded-lg h-24" />

            <h4 className="font-bold text-gray-700 mt-6 mb-3">FAQ Items</h4>
            <div className="space-y-3">
              {cmsContent.faq.items.map((item, index) => (
                <div key={index} className="border p-4 rounded-lg bg-gray-50 space-y-2 relative">
                  <button onClick={() => handleRemoveArrayItem('faq', 'items', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  <label className="block text-sm font-medium text-gray-700">Question</label>
                  <input type="text" value={item.q} onChange={(e) => handleArrayItemChange('faq', 'items', index, 'q', e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="block text-sm font-medium text-gray-700">Answer</label>
                  <textarea value={item.a} onChange={(e) => handleArrayItemChange('faq', 'items', index, 'a', e.target.value)} className="w-full p-2 border rounded-lg h-20" />
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleAddArrayItem('faq', 'items', { q: 'New Question?', a: 'Answer to the new question.' })}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add FAQ
            </button>
          </div>
        );
      case 'cta':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> Call To Action Section</h3>
            <label className="block text-sm font-medium text-gray-700">Headline</label>
            <input type="text" value={cmsContent.cta.headline} onChange={(e) => handleContentChange('cta', 'headline', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Subheadline</label>
            <textarea value={cmsContent.cta.subheadline} onChange={(e) => handleContentChange('cta', 'subheadline', e.target.value)} className="w-full p-2 border rounded-lg h-24" />
            <label className="block text-sm font-medium text-gray-700">Button Text</label>
            <input type="text" value={cmsContent.cta.buttonText} onChange={(e) => handleContentChange('cta', 'buttonText', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Button Link</label>
            <input type="text" value={cmsContent.cta.buttonLink} onChange={(e) => handleContentChange('cta', 'buttonLink', e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
        );
      case 'footer':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-gray-700" /> Footer Section</h3>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input type="text" value={cmsContent.footer.companyName} onChange={(e) => handleContentChange('footer', 'companyName', e.target.value)} className="w-full p-2 border rounded-lg" />
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={cmsContent.footer.description} onChange={(e) => handleContentChange('footer', 'description', e.target.value)} className="w-full p-2 border rounded-lg h-24" />
            <label className="block text-sm font-medium text-gray-700">Copyright Text</label>
            <input type="text" value={cmsContent.footer.copyright} onChange={(e) => handleContentChange('footer', 'copyright', e.target.value)} className="w-full p-2 border rounded-lg" />
            
            {/* Dynamic Link Sections */}
            {[
              { field: 'productLinks', title: 'Product Links' },
              { field: 'companyLinks', title: 'Company Links' },
              { field: 'legalLinks', title: 'Legal Links' },
              { field: 'socialLinks', title: 'Social Links' },
            ].map((sectionConfig) => (
              <div key={sectionConfig.field} className="mt-6">
                <h4 className="font-bold text-gray-700 mb-3">{sectionConfig.title}</h4>
                <div className="space-y-3">
                  {(cmsContent.footer[sectionConfig.field as keyof LandingPageContent['footer']] as any[]).map((linkItem, index) => (
                    <div key={index} className="border p-3 rounded-lg bg-gray-50 space-y-1 relative">
                      <button onClick={() => handleRemoveArrayItem('footer', sectionConfig.field, index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                      <label className="block text-sm font-medium text-gray-700">Label</label>
                      <input type="text" value={linkItem.label} onChange={(e) => handleArrayItemChange('footer', sectionConfig.field, index, 'label', e.target.value)} className="w-full p-2 border rounded-lg" />
                      <label className="block text-sm font-medium text-gray-700">Link URL</label>
                      <input type="text" value={linkItem.link} onChange={(e) => handleArrayItemChange('footer', sectionConfig.field, index, 'link', e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => handleAddArrayItem('footer', sectionConfig.field, { label: 'New Link', link: '#' })}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add {sectionConfig.title.replace(' Links', '')} Link
                </button>
              </div>
            ))}
          </div>
        );
      default:
        return <div className="text-gray-500">Select a section to edit.</div>;
    }
  };

  const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <div className="flex items-center justify-between mt-2">
      <span className="font-medium text-gray-700">{label}</span>
      <button 
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
      {/* Sidebar Menu */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-6 flex-shrink-0 overflow-y-auto custom-scrollbar">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-emerald-500" /> CMS Editor
        </h2>
        <nav className="space-y-1">
          {[
            { id: 'hero', label: 'Hero Section', icon: Image },
            { id: 'features', label: 'Features', icon: Settings },
            { id: 'testimonials', label: 'Testimonials', icon: MessageCircle },
            { id: 'pricing', label: 'Pricing', icon: DollarSign },
            { id: 'faq', label: 'FAQ', icon: FileText },
            { id: 'cta', label: 'Call To Action', icon: Users },
            { id: 'footer', label: 'Footer', icon: Building2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as keyof LandingPageContent)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === item.id ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeSection === item.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-y-auto p-8 bg-white relative">
        <div className="max-w-3xl mx-auto pb-20"> {/* Add padding for save button */}
          {renderSectionEditor()}
        </div>

        {/* Floating Save Button */}
        <div className="fixed bottom-6 right-6 z-40">
          {saveMessage && (
            <div className="mb-3 px-4 py-2 bg-emerald-500 text-white rounded-lg shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <Check className="w-4 h-4" /> {saveMessage}
            </div>
          )}
          <button 
            onClick={() => handleSaveAllChanges()}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CMS;