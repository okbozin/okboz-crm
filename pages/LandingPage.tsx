
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Users, DollarSign, MapPin, Shield, Zap, 
  ArrowRight, Menu, X, Star, BarChart3, Smartphone, Globe, Check,
  LayoutDashboard, Pencil as PencilIcon, Sparkles // Added Sparkles import
} from 'lucide-react';
import { LandingPageContent } from '../types'; // Import the new interface

// Default content for the landing page (if nothing is saved in CMS)
const DEFAULT_LANDING_PAGE_CONTENT: LandingPageContent = {
  hero: {
    headline: "Manage your staff smarter, not harder.",
    subheadline: "The all-in-one platform for attendance tracking, automated payroll, and field force management. Designed for modern Indian businesses.",
    ctaButtonText: "Get Started Free",
    ctaButtonLink: "/login",
    demoButtonText: "View Demo",
    demoButtonLink: "#",
    promoBadge: "New: AI HR Assistant Added",
    promoIcon: "Sparkles", // Use string name for icon
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


// Map icon string names to Lucide-React components
const ICON_MAP: { [key: string]: React.ElementType } = {
  Sparkles: Sparkles,
  MapPin: MapPin,
  DollarSign: DollarSign,
  Smartphone: Smartphone,
  BarChart3: BarChart3,
  Shield: Shield,
  Zap: Zap,
  Globe: Globe, // For social proof
  CheckCircle: CheckCircle,
  LayoutDashboard: LayoutDashboard, // Placeholder if needed
  Pencil: PencilIcon,
  Users: Users,
  // Add other icons as needed for features section
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [cmsContent, setCmsContent] = useState<LandingPageContent>(DEFAULT_LANDING_PAGE_CONTENT);

  // Load CMS content from localStorage
  useEffect(() => {
    try {
      const savedContent = localStorage.getItem('landing_page_content');
      if (savedContent) {
        const parsedContent = JSON.parse(savedContent);
        // Deep merge to ensure new fields in DEFAULT are included if not in saved
        setCmsContent(prevState => ({
          ...prevState,
          ...parsedContent,
          hero: { ...prevState.hero, ...parsedContent.hero },
          features: { ...prevState.features, ...parsedContent.features, items: parsedContent.features?.items || prevState.features.items },
          testimonials: { ...prevState.testimonials, ...parsedContent.testimonials, items: parsedContent.testimonials?.items || prevState.testimonials.items },
          pricing: { ...prevState.pricing, ...parsedContent.pricing, plans: parsedContent.pricing?.plans || prevState.pricing.plans },
          faq: { ...prevState.faq, ...parsedContent.faq, items: parsedContent.faq?.items || prevState.faq.items },
          cta: { ...prevState.cta, ...parsedContent.cta },
          footer: {
            ...prevState.footer,
            ...parsedContent.footer,
            productLinks: parsedContent.footer?.productLinks || prevState.footer.productLinks,
            companyLinks: parsedContent.footer?.companyLinks || prevState.footer.companyLinks,
            legalLinks: parsedContent.footer?.legalLinks || prevState.footer.legalLinks,
            socialLinks: parsedContent.footer?.socialLinks || prevState.footer.socialLinks,
          },
        }));
      }
    } catch (e) {
      console.error("Failed to load CMS content from local storage:", e);
      // Fallback to default if parsing fails
      setCmsContent(DEFAULT_LANDING_PAGE_CONTENT);
    }
  }, []);

  const { hero, features, testimonials, pricing, faq, cta, footer } = cmsContent;


  // Helper function to get icon component
  const getIconComponent = (iconName: string, defaultIcon: React.ElementType = LayoutDashboard) => {
    return ICON_MAP[iconName] || defaultIcon;
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Navbar */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">
                {footer.companyName.charAt(0)}
              </div>
              <span className="text-2xl font-bold text-gray-800 tracking-tight">{footer.companyName}</span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">Features</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">Testimonials</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">FAQ</a>
              <button 
                onClick={() => navigate('/login')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 absolute w-full px-4 py-6 shadow-xl flex flex-col gap-4">
             <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-gray-600">Features</a>
             <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-gray-600">Testimonials</a>
             <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-gray-600">Pricing</a>
             <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-gray-600">FAQ</a>
             <button 
                onClick={() => navigate('/login')}
                className="bg-emerald-600 text-white px-5 py-3 rounded-lg font-medium w-full"
              >
                Login to Dashboard
              </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* Hero Text */}
            <div className="lg:w-1/2 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {hero.promoBadge}
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                {hero.headline.split(' ').slice(0, 3).join(' ')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  {hero.headline.split(' ').slice(3).join(' ')}
                </span>
              </h1>
              
              <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                {hero.subheadline}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <button 
                  onClick={() => navigate(hero.ctaButtonLink)}
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  {hero.ctaButtonText} <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => window.location.href = hero.demoButtonLink}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                >
                   <Zap className="w-5 h-5 text-gray-400" /> {hero.demoButtonText}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 animate-in fade-in duration-1000 delay-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> 14-day free trial
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="lg:w-1/2 relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
               {/* Abstract Background Blobs */}
               <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob"></div>
               <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] bg-teal-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
               
               {/* Image Mockup */}
               <div className="relative z-10 transform rotate-2 hover:rotate-0 transition-transform duration-700 group">
                  <img 
                    src={hero.image}
                    alt="App Dashboard" 
                    className="rounded-3xl shadow-2xl border-4 border-white w-full h-auto"
                  />
                  
                  {/* Floating Elements (Placeholder, could be dynamic in CMS) */}
                  <div className="absolute -right-6 top-10 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-bounce delay-700 hidden sm:block">
                     <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                           <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                           <p className="font-bold text-gray-800 text-sm">Payroll Processed</p>
                           <p className="text-xs text-gray-500">Just now</p>
                        </div>
                     </div>
                  </div>

                  <div className="absolute -left-6 bottom-10 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-pulse delay-1000 hidden sm:block">
                     <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                           <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                           <p className="font-bold text-gray-800 text-sm">New Staff Added</p>
                           <p className="text-xs text-gray-500">2 mins ago</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Trusted by 500+ growing companies</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Fake Logos (Could be made dynamic in CMS) */}
             <div className="text-xl font-bold font-serif flex items-center gap-1"><Globe className="w-6 h-6" /> Globex</div>
             <div className="text-xl font-bold font-mono flex items-center gap-1"><Zap className="w-6 h-6" /> BoltShift</div>
             <div className="text-xl font-bold font-sans flex items-center gap-1"><Shield className="w-6 h-6" /> SecureCorp</div>
             <div className="text-xl font-bold flex items-center gap-1"><BarChart3 className="w-6 h-6" /> Metrics</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{features.title}</h2>
              <p className="text-xl text-gray-500">{features.description}</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.items.map((feature, idx) => {
                const FeatureIcon = getIconComponent(feature.icon);
                return (
                  <div key={idx} className="group p-8 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-transparent hover:border-gray-100">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform ${feature.bg}`}>
                        <FeatureIcon className="w-6 h-6 text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                     <p className="text-gray-600 leading-relaxed">
                        {feature.desc}
                     </p>
                  </div>
                );
              })}
           </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{testimonials.title}</h2>
              <p className="text-xl text-gray-500">{testimonials.description}</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.items.map((t, i) => (
                 <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                       <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                       <div>
                          <h4 className="font-bold text-gray-900">{t.name}</h4>
                          <p className="text-sm text-gray-500">{t.role}</p>
                       </div>
                    </div>
                    <p className="text-gray-600 italic leading-relaxed">"{t.quote}"</p>
                    <div className="flex gap-1 mt-4 text-yellow-400">
                       {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{pricing.title}</h2>
               <p className="text-xl text-gray-500 mb-8">{pricing.description}</p>
               
               {/* Toggle */}
               <div className="flex justify-center items-center gap-4">
                  <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>{pricing.billingToggleMonthly}</span>
                  <button 
                     onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                     className="w-14 h-8 bg-emerald-600 rounded-full relative transition-colors shadow-inner"
                  >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${billingCycle === 'yearly' ? 'left-7' : 'left-1'}`}></div>
                  </button>
                  <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                     {pricing.billingToggleYearly} <span className="text-emerald-600 font-bold text-xs ml-1">(Save 20%)</span>
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {pricing.plans.map((plan, idx) => (
                  <div key={idx} className={`relative bg-white rounded-2xl p-8 flex flex-col transition-all hover:shadow-xl ${plan.highlight ? 'border-2 border-emerald-500 shadow-lg scale-105 z-10' : 'border border-gray-200'}`}>
                     {plan.highlight && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                           MOST POPULAR
                        </div>
                     )}
                     
                     <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
                     </div>

                     <div className="flex items-baseline gap-1 mb-8">
                        <span className="text-4xl font-bold text-gray-900">₹{billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}</span>
                        <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                     </div>

                     <div className="space-y-4 flex-1 mb-8">
                        {plan.features.map((feat, i) => (
                           <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                              <span>{feat}</span>
                           </div>
                        ))}
                     </div>

                     <button 
                        onClick={() => navigate('/login')}
                        className={`w-full py-3 rounded-xl font-bold transition-all ${
                           plan.highlight 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200' 
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                     >
                        {plan.buttonText}
                     </button>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{faq.title}</h2>
              <p className="text-xl text-gray-500">{faq.description}</p>
           </div>
           <div className="space-y-4">
              {faq.items.map((faqItem, i) => (
                 <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-emerald-200 transition-colors shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{faqItem.q}</h3>
                    <p className="text-gray-600">{faqItem.a}</p>
                 </div>
              ))}
           </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
         <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="relative z-10">
                  <h2 className="text-3xl md:text-5xl font-bold mb-6">{cta.headline}</h2>
                  <p className="text-emerald-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">{cta.subheadline}</p>
                  <button 
                    onClick={() => navigate(cta.buttonLink)}
                    className="bg-white text-emerald-600 hover:bg-emerald-50 px-10 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform hover:scale-105"
                  >
                    {cta.buttonText}
                  </button>
                  <p className="mt-6 text-sm text-emerald-200 opacity-80">No credit card required • Cancel anytime</p>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 border-t border-gray-800">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
               <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-4 text-white">
                     <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-lg">
                       {footer.companyName.charAt(0)}
                     </div>
                     <span className="text-xl font-bold">{footer.companyName}</span>
                  </div>
                  <p className="text-sm leading-relaxed mb-4">{footer.description}</p>
               </div>
               <div>
                  <h4 className="text-white font-bold mb-4">Product</h4>
                  <ul className="space-y-2 text-sm">
                     {footer.productLinks.map((link, i) => (
                       <li key={i}><a href={link.link} className="hover:text-emerald-500 transition-colors">{link.label}</a></li>
                     ))}
                  </ul>
               </div>
               <div>
                  <h4 className="text-white font-bold mb-4">Company</h4>
                  <ul className="space-y-2 text-sm">
                    {footer.companyLinks.map((link, i) => (
                      <li key={i}><a href={link.link} className="hover:text-emerald-500 transition-colors">{link.label}</a></li>
                    ))}
                  </ul>
               </div>
               <div>
                  <h4 className="text-white font-bold mb-4">Legal</h4>
                  <ul className="space-y-2 text-sm">
                    {footer.legalLinks.map((link, i) => (
                      <li key={i}><a href={link.link} className="hover:text-emerald-500 transition-colors">{link.label}</a></li>
                    ))}
                  </ul>
               </div>
            </div>
            <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
               <p>{footer.copyright}</p>
               <div className="flex gap-6">
                 {footer.socialLinks.map((link, i) => (
                   <a key={i} href={link.link} className="hover:text-white transition-colors">{link.label}</a>
                 ))}
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
