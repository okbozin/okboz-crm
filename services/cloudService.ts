
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// ============================================================================
// 🛑 STEP 1: PASTE YOUR FIREBASE KEYS BELOW 🛑
// ============================================================================
// INSTRUCTIONS:
// 1. Go to Firebase Console > Project Settings.
// 2. Copy the values from the 'firebaseConfig' code block.
// 3. Paste them strictly inside the quotes below. DO NOT add extra commas outside the quotes.
// ============================================================================

export const HARDCODED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

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

// Helper to get the active configuration
const getActiveConfig = (config?: FirebaseConfig): FirebaseConfig | null => {
  let activeConfig = config;

  // 1. Try passed config
  // 2. Try Hardcoded config (This enables the "One time setup")
  if (!activeConfig || !activeConfig.apiKey) {
     if (HARDCODED_FIREBASE_CONFIG.apiKey) {
         activeConfig = HARDCODED_FIREBASE_CONFIG;
     } else {
         // 3. Try LocalStorage (Fallback)
         const saved = localStorage.getItem('firebase_config');
         if (saved) activeConfig = JSON.parse(saved);
     }
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

// Helper to initialize DB safely
const getDb = (config?: FirebaseConfig): Firestore | null => {
  const app = getFirebaseApp(config);
  return app ? getFirestore(app) : null;
};

// --- SYNC FUNCTION (Saves data to Cloud) ---
export const syncToCloud = async (config?: FirebaseConfig) => {
  try {
    const db = getDb(config);
    if (!db) return { success: false, message: "Not Connected" };

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

    console.log("✅ Auto-Sync Successful: " + new Date().toLocaleTimeString());
    return { success: true, message: "Sync complete! Data is safe in Cloud." };
  } catch (error: any) {
    console.error("Sync Error:", error);
    // Handle permission denied gracefully in sync
    if (error.code === 'permission-denied') {
        return { success: false, message: "Permission Denied. Set Firestore rules to Test Mode." };
    }
    return { success: false, message: `Sync failed: ${error.message}` };
  }
};

// --- RESTORE FUNCTION (Loads data from Cloud) ---
export const restoreFromCloud = async (config?: FirebaseConfig) => {
  try {
    const db = getDb(config);
    if (!db) return { success: false, message: "No Configuration" };

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

    // Check if storage bucket is configured
    if (!app.options.storageBucket) {
        alert("Storage Bucket is missing. Check Step 1 in cloudService.ts");
        return null;
    }

    const storage = getStorage(app);
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Upload Error:", error);
    alert("Failed to upload file. Ensure 'Storage' is enabled in Firebase Console.");
    return null;
  }
};

// Auto-load data on app start
export const autoLoadFromCloud = async (): Promise<boolean> => {
    try {
        const db = getDb(); 
        if (!db) return false;

        // Pull data silently
        await restoreFromCloud();
        return true;
    } catch (e) {
        console.error("Auto-load failed", e);
        return false;
    }
};

export const getCloudDatabaseStats = async (config?: FirebaseConfig) => {
  try {
    const db = getDb(config);
    if (!db) return null;
    
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
