

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

// NEW: Location Record for Attendance
export interface LocationRecord {
  lat: number;
  lng: number;
  address: string; // e.g., "Office: Main Branch" or "Remote"
  timestamp: string;
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
  workingHours?: string; 
  weekOff?: string;
  aadhar?: string;
  pan?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string; // NEW: UPI ID
  password?: string; 
  liveTracking?: boolean; 
  allowRemotePunch?: boolean; 
  attendanceConfig?: {
    gpsGeofencing: boolean;
    qrScan: boolean;
    manualPunch: boolean;
    manualPunchMode?: 'Anywhere' | 'BranchRadius'; // NEW: Configuration for manual punch restriction
  };
  allowedModules?: string[]; // NEW: List of extra modules accessible to this employee (e.g., 'expenses', 'documents')
  corporateId?: string; 
  corporateName?: string; 
  currentLocation?: { lat: number; lng: number; accuracy: number; }; 
  attendanceLocationStatus?: 'idle' | 'fetching' | 'granted' | 'denied' | 'outside_geofence' | 'within_geofence'; 
  cameraPermissionStatus?: 'idle' | 'granted' | 'denied'; 
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
  idProof1Url?: string; 
  idProof2Url?: string; 
  onlineHistory?: { timestamp: string; status: 'online' | 'offline'; }[]; // Updated type
  isOnline?: boolean; // NEW: Explicit online status
}

export interface DailyAttendance {
  date: string; // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
  isLate?: boolean;
  checkIn?: string;
  checkOut?: string;
  // NEW: Location Data
  punchInLocation?: LocationRecord;
  punchOutLocation?: LocationRecord;
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
export type TripType = 'Local' | 'Rental' | 'Outstation';
export type OutstationSubType = 'RoundTrip' | 'OneWay';
export type VehicleType = 'Sedan' | 'SUV';
export type EnquiryCategory = 'Transport' | 'General';

// NEW: Shift Interface for Employee Settings
export interface Shift {
  id: number;
  name: string;
  start: string; // e.g., "09:00 AM"
  end: string;   // e.g., "06:00 PM"
}

export interface Enquiry {
  id: string;
  type: 'Customer' | 'Vendor';
  initialInteraction: 'Incoming' | 'Outgoing'; 
  name: string;
  phone: string;
  city: string;
  email?: string;
  details: string; 
  status: 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked' | 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled';
  isExistingVendor?: boolean; 
  vendorId?: string; 
  assignedTo?: string; 
  createdAt: string;
  nextFollowUp?: string;
  history: HistoryLog[];
  date?: string; 
  enquiryCategory?: EnquiryCategory;
  tripType?: TripType;
  vehicleType?: VehicleType;
  outstationSubType?: OutstationSubType; 
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
  priority?: 'Hot' | 'Warm' | 'Cold';
  corporateId?: string; 
}

export interface Trip {
  id: string;
  tripId: string;
  date: string;
  branch: string;
  bookingType: string;
  transportType: string;
  tripCategory: string;
  bookingStatus: string;
  cancelBy?: string;
  userName: string;
  userMobile: string;
  driverName?: string;
  driverMobile?: string;
  pickup?: string; // Added pickup location
  drop?: string;   // Added drop location
  tripPrice: number;
  adminCommission: number;
  tax: number;
  waitingCharge: number;
  discount: number;
  cancellationCharge: number;
  totalPrice: number;
  remarks?: string;
  ownerId?: string;
  ownerName?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string; 
  size: string;
  category: 'General' | 'Contract' | 'ID Proof' | 'Report' | 'Policy';
  uploadedBy: string;
  uploadDate: string;
  url: string; 
  visibility: 'Public' | 'Private' | 'AdminOnly';
  ownerId?: string; 
}

export interface SalaryAdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amountRequested: number;
  amountApproved: number; 
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  requestDate: string;
  paymentDate?: string;
  paymentMode?: string; 
  corporateId?: string; 
}

// NEW: Notification Interface
export interface Notification {
  id: string;
  // Fix: Added 'punch_in' and 'punch_out' to the type enum
  type: 'system' | 'login' | 'leave_request' | 'advance_request' | 'task_assigned' | 'custom_message' | 'new_enquiry' | 'security' | 'punch_in' | 'punch_out' | 'task_created' | 'online_status'; // Added 'task_created' and 'online_status'
  title: string;
  message: string;
  timestamp: string; 
  read: boolean;
  targetRoles: UserRole[]; 
  corporateId?: string; 
  employeeId?: string;  
  link?: string;        
}

export interface PayrollHistoryRecord {
  id: string;
  name: string;
  date: string;
  totalAmount: number;
  employeeCount: number;
  data: Record<string, PayrollEntry>;
  ownerId?: string; 
}

export interface PayrollEntry { 
  employeeId: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  advanceDeduction: number;
  payableDays: number;
  totalDays: number;
  status: 'Paid' | 'Pending';
  ownerId?: string; 
}

export interface LeaveRequest { 
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  status: string;
  reason: string;
  appliedOn: string;
  corporateId?: string; 
  employeeId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; 
  assignedByName: string;
  corporateId?: string; 
  corporateName?: string; 
  branch?: string; 
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

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

export interface PricingRules {
  localBaseFare: number;
  localBaseKm: number;
  localPerKmRate: number;
  localWaitingRate: number;
  rentalExtraKmRate: number;
  rentalExtraHrRate: number;
  outstationMinKmPerDay: number;
  outstationBaseRate: number; // This one is probably for RoundTrip or deprecated, keeping for now
  outstationBaseRateOneWay: number; // NEW: Explicit field for OneWay base rate
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
}


declare global {
  namespace google {
    namespace maps {
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      class Geocoder {}
      class Map {}
      class Marker {}
      enum Animation {}
      class InfoWindow {}
      class LatLng {
        constructor(lat: number, lng: number);
      } 
      namespace geometry {
        namespace spherical {
          function computeDistanceBetween(latLng1: LatLng, latLng2: LatLng): number;
        }
      }
    }
  }
  interface Window {
    google: any; 
    gm_authFailure?: () => void;
    gm_authFailure_detected?: boolean;
  }
}