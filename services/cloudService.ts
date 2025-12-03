
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// ============================================================================
// 🔒 PERMANENT CONNECTION AREA
// ============================================================================
// Keys provided by user.
// ============================================================================

export const HARDCODED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBJv0PwlvTk8QY9Wm9R58C_EDF5bipo5pQ",
  authDomain: "okboz-crm-f53b0.firebaseapp.com",
  projectId: "okboz-crm-f53b0",
  storageBucket: "okboz-crm-f53b0.firebasestorage.app",
  messagingSenderId: "35317119280",
  appId: "1:35317119280:web:d5dc9193b3116e6cae70f5",
  measurementId: "G-73X2MLBTW6"
};

// ============================================================================

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

// --- DATA MAPPING ---
// These keys will be automatically synced to the database
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
  'app_theme',
  'maps_api_key'
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

// Helper to check for mock data to prevent pollution of production DB
const isMockDataPresent = (): boolean => {
  const staffData = localStorage.getItem('staff_data');
  
  // Check for known mock data signatures (e.g. from constants.ts or initial state)
  // If the user hasn't cleared the default data, we shouldn't sync.
  if (staffData && (staffData.includes('John Doe') || staffData.includes('"id":"E001"'))) {
    return true;
  }
  return false;
};

// Helper to get the active configuration
const getActiveConfig = (config?: FirebaseConfig): FirebaseConfig | null => {
  // 1. Priority: Hardcoded Config (The Permanent Solution)
  if (HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5) {
      return HARDCODED_FIREBASE_CONFIG;
  }

  // 2. Fallback: Passed config or LocalStorage (The Temporary Solution)
  let activeConfig = config;
  if (!activeConfig || !activeConfig.apiKey) {
     const saved = localStorage.getItem('firebase_config');
     if (saved) activeConfig = JSON.parse(saved);
  }
  
  if (!activeConfig || !activeConfig.apiKey) return null;
  return activeConfig;
};

// Helper to initialize App safely
const getFirebaseApp = (config?: FirebaseConfig): FirebaseApp | null => {
  const activeConfig = getActiveConfig(config);
  if (!activeConfig) return null;

  // Avoid duplicate app initialization error
  if (getApps().length > 0) {
    return getApp();
  }

  try {
    return initializeApp(activeConfig);
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return null;
  }
};

// Helper to authenticate anonymously if needed
const ensureAuth = async (app: FirebaseApp) => {
  try {
    const auth = getAuth(app);
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (e) {
    // console.warn("Firebase Auth: Anonymous sign-in failed (Rules might require open access)", e);
  }
};

// Helper to initialize DB safely
const getDb = (app: FirebaseApp): Firestore => {
  return getFirestore(app);
};

// --- SYNC FUNCTION (Saves data to Cloud) ---
export const syncToCloud = async (config?: FirebaseConfig) => {
  // SAFETY GUARD: Prevent syncing if mock data is detected
  if (isMockDataPresent()) {
    console.log("☁️ Sync Skipped: Mock data detected. Clear data before syncing to production.");
    return { success: true, message: "Sync Skipped: Mock Data Present" };
  }

  try {
    const app = getFirebaseApp(config);
    if (!app) return { success: false, message: "Not Connected" };

    await ensureAuth(app); // Ensure authenticated
    const db = getDb(app);

    const corporateAccountsStr = localStorage.getItem('corporate_accounts');
    const corporates = corporateAccountsStr ? JSON.parse(corporateAccountsStr) : [];

    const allBaseKeys = [...GLOBAL_KEYS, ...NAMESPACED_KEYS];
    
    // Save Global Data
    for (const key of allBaseKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        await setDoc(doc(db, "ok_boz_live_data", key), {
          content: data,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    // Save Corporate Specific Data
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

    return { success: true, message: "Sync complete! Data is safe in Cloud." };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        return { success: false, message: "Permission Denied. Set Firestore rules to Test Mode." };
    }
    return { success: false, message: `Sync failed: ${error.message}` };
  }
};

// --- RESTORE FUNCTION (Loads data from Cloud) ---
export const restoreFromCloud = async (config?: FirebaseConfig) => {
  try {
    const app = getFirebaseApp(config);
    if (!app) return { success: false, message: "No Configuration" };

    await ensureAuth(app); // Ensure authenticated
    const db = getDb(app);

    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    
    if (snapshot.empty) {
        return { success: true, message: "Connected, but database is empty." };
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.content) {
            localStorage.setItem(doc.id, data.content);
        }
    });

    console.log("✅ Data Loaded from Cloud");
    return { success: true, message: "Restore complete! Data loaded from Cloud." };
  } catch (error: any) {
    console.error("Restore Error:", error);
    if (error.code === 'permission-denied') {
        return { success: false, message: "Permission Denied. Set Firestore rules to Test Mode." };
    }
    return { success: false, message: `Restore failed: ${error.message}` };
  }
};

// Upload File to Firebase Storage
export const uploadFileToCloud = async (file: File, path: string): Promise<string | null> => {
  try {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not connected");

    await ensureAuth(app); // Ensure authenticated

    if (!app.options.storageBucket) {
        return null;
    }

    const storage = getStorage(app);
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error: any) {
    console.error("Cloud Upload Failed (Falling back to local):", error.code, error.message);
    return null;
  }
};

// Auto-load data on app start
export const autoLoadFromCloud = async (): Promise<boolean> => {
    try {
        const app = getFirebaseApp();
        if (!app) return false;
        await restoreFromCloud();
        return true;
    } catch (e) {
        return false;
    }
};

export const getCloudDatabaseStats = async (config?: FirebaseConfig) => {
  try {
    const app = getFirebaseApp(config);
    if (!app) return null;
    
    await ensureAuth(app); // Ensure authenticated
    const db = getDb(app);
    
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
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        return { _permissionDenied: true };
    }
    return null;
  }
};

// Dummies for compatibility
export const sendSystemNotification = async (...args: any[]) => Promise.resolve();
export const fetchSystemNotifications = async () => Promise.resolve([]);
export const markNotificationAsRead = async (...args: any[]) => Promise.resolve();
export const setupAutoSync = () => {};
export const hydrateFromCloud = async () => Promise.resolve();
