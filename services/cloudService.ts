
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore } from "firebase/firestore";

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
const GLOBAL_KEYS = [
  'corporate_accounts',
  'global_enquiries_data',
  'call_enquiries_history',
  'reception_recent_transfers',
  'payroll_history',
  'leave_history',
  'app_settings',
  'transport_pricing_rules_v2',
  'transport_rental_packages_v2',
  'company_departments',
  'company_roles',
  'company_shifts',
  'company_payout_dates',
  'company_global_payout_day',
  'salary_advances',
  'app_branding',
  'app_theme'
];

const NAMESPACED_KEYS = [
  'staff_data',
  'branches_data',
  'leads_data',
  'vendor_data',
  'office_expenses',
  'tasks_data',
  'sub_admins',
  'app_settings',
  'trips_data'
];

// Helper to initialize DB safely
const getDb = (config: FirebaseConfig): Firestore => {
  if (!config.apiKey) {
    throw new Error("Firebase API Key is missing");
  }

  // Check if an app is already initialized to prevent duplicate app errors
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }

  // Initialize new app
  try {
    const app = initializeApp(config); 
    return getFirestore(app);
  } catch (e) {
    console.error("Firebase Init Error:", e);
    throw e;
  }
};

export const syncToCloud = async (config: FirebaseConfig) => {
  try {
    const db = getDb(config);
    const corporateAccountsStr = localStorage.getItem('corporate_accounts');
    const corporates = corporateAccountsStr ? JSON.parse(corporateAccountsStr) : [];

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
    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    
    if (snapshot.empty) {
        return { success: true, message: "Connected, but no data found in Cloud to restore." };
    }

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

// Dummies for compatibility
export const sendSystemNotification = async (...args: any[]) => Promise.resolve();
export const fetchSystemNotifications = async () => Promise.resolve([]);
export const markNotificationAsRead = async (...args: any[]) => Promise.resolve();
export const setupAutoSync = () => {};
export const hydrateFromCloud = async () => Promise.resolve();
