

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CORPORATE = 'CORPORATE', // Franchise/Reseller Role
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  PAID_LEAVE = 'PAID_LEAVE',
  WEEK_OFF = 'WEEK_OFF',
  HOLIDAY = 'HOLIDAY',
  NOT_MARKED = 'NOT_MARKED'
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  joiningDate: string;
  // Optional detailed fields
  email?: string;
  phone?: string;
  branch?: string;
  paymentCycle?: string;
  salary?: string;
  status?: string;
  workingHours?: string; // Added this field
  weekOff?: string;
  aadhar?: string;
  pan?: string;
  accountNumber?: string;
  ifsc?: string;
  password?: string; // Added this field for login
  liveTracking?: boolean; // Added for live tracking toggle
  allowRemotePunch?: boolean; // Legacy: Added for punch-in restriction
  attendanceConfig?: {
    gpsGeofencing: boolean;
    qrScan: boolean;
    manualPunch: boolean;
  };
  corporateId?: string; // NEW: To link employee to a specific corporate account
  corporateName?: string; // NEW: To link employee to a specific corporate name
  currentLocation?: { lat: number; lng: number; accuracy: number; }; // NEW: Last known accurate location
  attendanceLocationStatus?: 'idle' | 'fetching' | 'granted' | 'denied' | 'outside_geofence' | 'within_geofence'; // NEW: Status of location access for attendance
  cameraPermissionStatus?: 'idle' | 'granted' | 'denied'; // NEW: Status of camera access
  // NEW: Profile fields
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  homeAddress?: string;
  maritalStatus?: string;
  spouseName?: string;
  children?: number;
  idProof1Url?: string; // For Aadhar/PAN scans etc
  idProof2Url?: string; // For Aadhar/PAN scans etc
  // Simulated online/offline events for monitoring
  onlineHistory?: { timestamp: string; status: 'online' | 'offline'; }[];
}

export interface DailyAttendance {
  date: string; // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
  isLate?: boolean;
  checkIn?: string;
  checkOut?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  radius: number;
  lat: number;
  lng: number;
  owner?: string; // NEW: Owner ID (admin or corporate email)
  ownerName?: string; // NEW: Owner Display Name
}

export interface CalendarStats {
  present: number;
  absent: number;
  halfDay: number;
  paidLeave: number;
  weekOff: number;
}

export interface CorporateAccount {
  id: string;
  companyName: string;
  email: string; // Used as username
  password: string;
  phone: string;
  city: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface HistoryLog {
  id: number;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Note' | 'Meeting';
  message: string;
  date: string;
  duration?: string;
  outcome?: string; // Connected, Missed, Voicemail, etc.
}

// Re-using common types from CustomerCare/VehicleEnquiries for Enquiry interface
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type EnquiryCategory = 'Transport' | 'General';


export interface Enquiry {
  id: string;
  type: 'Customer' | 'Vendor';
  initialInteraction: 'Incoming' | 'Outgoing'; // New: To distinguish between incoming calls vs. employee-initiated outgoing
  name: string;
  phone: string;
  city: string;
  email?: string;
  details: string; // The query/requirement
  status: 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked' | 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled';
  isExistingVendor?: boolean; // If they were found in the vendor DB
  vendorId?: string; // Link to vendor if exists
  assignedTo?: string; // Employee ID
  createdAt: string;
  nextFollowUp?: string;
  history: HistoryLog[];
  date?: string; // ADDED
  // New fields for structured transport data
  enquiryCategory?: EnquiryCategory;
  tripType?: TripType;
  vehicleType?: VehicleType;
  outstationSubType?: OutstationSubType; // Only for Outstation
  transportData?: {
    pickup?: string;
    drop?: string;
    estKm?: string;
    waitingMins?: string;
    packageId?: string;
    destination?: string;
    days?: string;
    estTotalKm?: string;
    nights?: string;
  };
  estimatedPrice?: number;
  // Added priority field to Enquiry interface
  priority?: 'Hot' | 'Warm' | 'Cold';
  corporateId?: string; // NEW: To link enquiry to a specific corporate
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string; // 'pdf', 'image', 'doc', etc.
  size: string;
  category: 'General' | 'Contract' | 'ID Proof' | 'Report' | 'Policy';
  uploadedBy: string;
  uploadDate: string;
  url: string; // Mock URL or Base64
  visibility: 'Public' | 'Private' | 'AdminOnly';
  ownerId?: string; // Corporate ID or Employee ID ownership
}

export interface SalaryAdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amountRequested: number;
  amountApproved: number; // Editable by Admin
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  requestDate: string;
  paymentDate?: string;
  paymentMode?: string; // Cash, Bank Transfer, UPI
  corporateId?: string; // For syncing to correct dashboard
}

// NEW: Notification Interface
export interface Notification {
  id: string;
  type: 'system' | 'login' | 'leave_request' | 'advance_request' | 'task_assigned' | 'custom_message' | 'new_enquiry';
  title: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  targetRoles: UserRole[]; // e.g., [UserRole.ADMIN, UserRole.CORPORATE]
  corporateId?: string; // Optional: target a specific corporate (email)
  employeeId?: string;  // Optional: target a specific employee (id)
  link?: string;        // Optional: path to navigate to
}

export interface PayrollHistoryRecord {
  id: string;
  name: string;
  date: string;
  totalAmount: number;
  employeeCount: number;
  data: Record<string, PayrollEntry>;
  ownerId?: string; // NEW: To link payroll history to a specific corporate
}

export interface PayrollEntry { // Moved this from Payroll.tsx to types.ts for consistent usage
  employeeId: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  advanceDeduction: number;
  payableDays: number;
  totalDays: number;
  status: 'Paid' | 'Pending';
  ownerId?: string; // NEW: To link payroll entry to a corporate for filtering
}

export interface LeaveRequest { // Moved this from ApplyLeave.tsx to types.ts for consistent usage
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  status: string;
  reason: string;
  appliedOn: string;
  corporateId?: string; // NEW: To link leave request to a specific corporate
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // Employee ID
  assignedByName: string;
  corporateId?: string; // To link to specific franchise
  corporateName?: string; // Display name
  branch?: string; // NEW: Added branch to Task interface
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt: string;
}

// NEW: Interface for Landing Page Content Management
export interface LandingPageContent {
  hero: {
    headline: string;
    subheadline: string;
    ctaButtonText: string;
    ctaButtonLink: string;
    demoButtonText: string;
    demoButtonLink: string;
    promoBadge: string;
    promoIcon: string;
    image: string;
  };
  features: {
    title: string;
    description: string;
    items: Array<{ icon: string; bg: string; title: string; desc: string; }>;
  };
  testimonials: {
    title: string;
    description: string;
    items: Array<{ name: string; role: string; image: string; quote: string; }>;
  };
  pricing: {
    title: string;
    description: string;
    billingToggleMonthly: string;
    billingToggleYearly: string;
    plans: Array<{ name: string; priceMonthly: string; priceYearly: string; description: string; features: string[]; buttonText: string; highlight: boolean; }>;
  };
  faq: {
    title: string;
    description: string;
    items: Array<{ q: string; a: string; }>;
  };
  cta: {
    headline: string;
    subheadline: string;
    buttonText: string;
    buttonLink: string;
  };
  footer: {
    companyName: string;
    description: string;
    productLinks: Array<{ label: string; link: string; }>;
    companyLinks: Array<{ label: string; link: string; }>;
    legalLinks: Array<{ label: string; link: string; }>;
    socialLinks: Array<{ label: string; link: string; }>;
    copyright: string;
  };
}


declare global {
  namespace google {
    namespace maps {
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      // Add minimal declarations for other Google Maps classes used directly or for type inference
      class Geocoder {}
      class Map {}
      class Marker {}
      enum Animation {}
      class InfoWindow {}
      class LatLng {} // For e.latLng methods
      namespace geometry {
        namespace spherical {
          function computeDistanceBetween(latLng1: LatLng, latLng2: LatLng): number;
        }
      }
    }
  }
  interface Window {
    google: any; // Keep this for broader compatibility with runtime access to window.google
    gm_authFailure?: () => void;
    gm_authFailure_detected?: boolean;
  }
}