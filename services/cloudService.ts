
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, Firestore } from "firebase/firestore";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

// --- DATA MAPPING ---
// Keys that are single global lists (mostly Super Admin specific or shared configuration)
const GLOBAL_KEYS = [
  'corporate_accounts',
  'global_enquiries_data',
  'call_enquiries_history',
  'reception_recent_transfers',
  'payroll_history',
  'leave_history',
  'app_settings', // Global fallback settings
  'transport_pricing_rules_v2', // Global fallback
  'transport_rental_packages_v2', // Global fallback
  'company_departments',
  'company_roles',
  'company_shifts',
  'company_payout_dates',
  'company_global_payout_day',
  'salary_advances',
  'app_branding',
  'app_theme'
];

// Keys that exist for Admin AND are duplicated for each Corporate account (suffixed with _{email})
const NAMESPACED_KEYS = [
  'staff_data',
  'branches_data',
  'leads_data',
  'vendor_data',
  'office_expenses',
  'tasks_data',
  'sub_admins', // Office staff per franchise
  'app_settings' // Per-franchise settings override
];

// Helper to initialize DB on the fly
const getDb = (config: FirebaseConfig): Firestore => {
  try {
    // We create a new app instance with a unique name to ensure config updates apply immediately without reload
    const app = initializeApp(config, "OKBOZ_CLOUD_" + Date.now()); 
    return getFirestore(app);
  } catch (e) {
    // If standard init fails (e.g. default app exists), use default
    const app = initializeApp(config);
    return getFirestore(app);
  }
};

export const syncToCloud = async (config: FirebaseConfig) => {
  try {
    const db = getDb(config);
    const corporateAccountsStr = localStorage.getItem('corporate_accounts');
    const corporates = corporateAccountsStr ? JSON.parse(corporateAccountsStr) : [];

    // 1. Sync Global Keys (and Admin's base versions of Namespaced keys)
    const allBaseKeys = [...GLOBAL_KEYS, ...NAMESPACED_KEYS];
    
    for (const key of allBaseKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        await setDoc(doc(db, "ok_boz_live_data", key), {
          content: data,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    // 2. Sync Namespaced Keys (for each corporate/franchise)
    if (Array.isArray(corporates)) {
      for (const corp of corporates) {
        const email = corp.email;
        if (!email) continue;

        for (const prefix of NAMESPACED_KEYS) {
          const key = `${prefix}_${email}`;
          const data = localStorage.getItem(key);
          if (data) {
            await setDoc(doc(db, "ok_boz_live_data", key), {
              content: data,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }
    }

    // 3. Sync Dynamic Attendance Data (keys starting with attendance_data_)
    // This is crucial for staff attendance records to show up in Admin panel
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('attendance_data_')) {
             const data = localStorage.getItem(key);
             if (data) {
                await setDoc(doc(db, "ok_boz_live_data", key), {
                  content: data,
                  lastUpdated: new Date().toISOString()
                });
             }
        }
    }

    return { success: true, message: "Sync complete! All local data pushed to Google Cloud." };
  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, message: `Sync failed: ${error.message}` };
  }
};

export const restoreFromCloud = async (config: FirebaseConfig) => {
  try {
    const db = getDb(config);
    
    // Fetch ALL documents in the collection to ensure we get dynamic keys too
    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    
    if (snapshot.empty) {
        return { success: true, message: "Connected, but no data found in Cloud to restore." };
    }

    // Restore each document to localStorage
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.content) {
            localStorage.setItem(doc.id, data.content);
        }
    });

    return { success: true, message: "Restore complete! All databases updated from Cloud." };
  } catch (error: any) {
    console.error("Restore Error:", error);
    return { success: false, message: `Restore failed: ${error.message}` };
  }
};

export const getCloudDatabaseStats = async (config: FirebaseConfig) => {
  try {
    const db = getDb(config);
    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    const stats: Record<string, any> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Calculate simplistic 'count' based on JSON array length if possible
      let count = '-';
      try {
        const parsed = JSON.parse(data.content);
        if (Array.isArray(parsed)) count = parsed.length.toString();
        else count = 'Config';
      } catch (e) {
          count = 'Raw';
      }
      
      stats[doc.id] = {
        count: count,
        lastUpdated: data.lastUpdated
      };
    });
    
    return stats;
  } catch (error) {
    console.error("Stats Error:", error);
    return null;
  }
};

// --- DUMMY NOTIFICATION EXPORTS (To maintain compatibility) ---
export const sendSystemNotification = async (...args: any[]) => Promise.resolve();
export const fetchSystemNotifications = async () => Promise.resolve([]);
export const markNotificationAsRead = async (...args: any[]) => Promise.resolve();
export const setupAutoSync = () => {};
export const hydrateFromCloud = async () => Promise.resolve();

export const cloudService = {
  syncToCloud,
  restoreFromCloud,
  getCloudDatabaseStats,
  sendSystemNotification,
  fetchSystemNotifications,
  markNotificationAsRead,
  setupAutoSync,
  hydrateFromCloud
};
