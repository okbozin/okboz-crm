import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore, deleteDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import { SystemNotification, UserRole } from '../types'; // Import UserRole

// Interface for the config saved in localStorage
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Hardcoded Default Configuration from SDK
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyC9UI-Dyf2GQCF-sW9ksXZQ8BvNUzSYe5g",
  authDomain: "okboz-crm.firebaseapp.com",
  projectId: "okboz-crm",
  storageBucket: "okboz-crm.firebaseapp.com",
  messagingSenderId: "91493515170",
  appId: "1:91493515170:web:4f7685341eedc2dd34bcfb",
  measurementId: "G-SJC4WPF1QJ"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let analytics: any = null;
let isHydrating = false; // Guard flag to prevent sync loops

// Keys that should be synced to cloud (Pattern matching)
const shouldSyncKey = (key: string): boolean => {
    // 1. Ignore Session / UI State / Auth Tokens
    if (key === 'firebase_config') return false;
    if (key === 'app_session_id') return false;
    if (key === 'user_role') return false;
    if (key === 'app_theme') return false;
    
    // 2. Core Data Arrays
    if (key.startsWith('staff_data')) return true;
    if (key.startsWith('leads_data')) return true;
    if (key.startsWith('vendor_data')) return true;
    if (key.startsWith('global_enquiries')) return true;
    if (key.startsWith('branches_data')) return true;
    if (key.startsWith('corporate_accounts')) return true;
    if (key.startsWith('office_expenses')) return true;
    if (key.startsWith('tasks_data')) return true;
    if (key.startsWith('sub_admins')) return true;
    if (key.startsWith('system_notifications')) return true; // NEW: System Notifications
    
    // 3. Financial & HR History
    if (key.startsWith('salary_advances')) return true;
    if (key.startsWith('payroll_history')) return true;
    if (key.startsWith('leave_history')) return true;
    if (key.startsWith('vehicle_trip_expenses')) return true;
    
    // 4. Logs & Attendance
    if (key.startsWith('call_enquiries_history')) return true;
    if (key.startsWith('reception_recent_transfers')) return true;
    if (key.startsWith('attendance_data')) return true;
    
    // 5. Global Settings & Configs
    if (key === 'app_branding') return true;
    if (key === 'smtp_config') return true;
    if (key === 'maps_api_key') return true; // Added for Maps API key
    if (key.startsWith('transport_pricing')) return true;
    if (key.startsWith('transport_rental')) return true;
    if (key.startsWith('company_')) return true; // Shifts, Roles, Depts, Holiday Lists

    // 6. Fallback: Allow anything explicitly marked as data
    return key.includes('_data'); 
};

// Initialize Firebase with user-provided config or default
export const initFirebase = (config: FirebaseConfig): boolean => {
  // Fallback to default if empty config passed, though callers usually handle this
  const finalConfig = (config && config.apiKey) ? config : DEFAULT_FIREBASE_CONFIG;

  if (!finalConfig.apiKey || !finalConfig.projectId) return false;
  
  try {
    // Check if any apps are already initialized
    if (getApps().length === 0) {
        app = initializeApp(finalConfig);
        console.log("🔥 Firebase Initialized: New Instance");
    } else {
        app = getApp();
        console.log("🔥 Firebase Initialized: Existing Instance Reused");
    }
    
    // Initialize Services
    if (app) {
        db = getFirestore(app);
        // Initialize Analytics if supported (Client-side only)
        if (typeof window !== 'undefined') {
             try {
                analytics = getAnalytics(app);
                console.log("📊 Firebase Analytics Initialized");
             } catch (e) {
                console.warn("Analytics init skipped (environment support check).");
             }
        }
    }
    
    return !!db;
  } catch (e) {
    console.error("Failed to initialize Firebase:", e);
    return false;
  }
};

// --- Auto Sync / Instant Backup Logic ---
let isAutoSyncSetup = false;

export const setupAutoSync = () => {
  if (isAutoSyncSetup) return;

  // Try to init with existing config on load, or fall back to default
  const savedConfig = localStorage.getItem('firebase_config');
  if (savedConfig) {
    try {
        const config = JSON.parse(savedConfig);
        initFirebase(config);
    } catch(e) {
        initFirebase(DEFAULT_FIREBASE_CONFIG);
    }
  } else {
      // No local config? Use default immediately
      initFirebase(DEFAULT_FIREBASE_CONFIG);
  }

  const originalSetItem = window.localStorage.setItem;
  const originalRemoveItem = window.localStorage.removeItem;

  // Override setItem to intercept saves
  window.localStorage.setItem = function (key: string, value: string) {
    // 1. Always save locally first (Fallback / Speed)
    originalSetItem.apply(this, [key, value]);

    // 2. Instant Sync to Cloud (Only if not currently hydrating from cloud and key is relevant)
    if (db && shouldSyncKey(key) && !isHydrating) { 
        try {
            const docRef = doc(db, "ok_boz_live_data", key);
            // Fire-and-forget sync
            setDoc(docRef, { 
                content: value, 
                lastUpdated: new Date().toISOString() 
            }, { merge: true }).catch(err => {
                // Suppress harmless console noise for frequent updates
                // console.warn(`[AutoSync] Failed to sync key: ${key}`, err);
            });
        } catch (e) {
            console.warn("AutoSync Error (Safe to ignore if offline):", e);
        }
    }
  };

  // Override removeItem to sync deletions
  window.localStorage.removeItem = function (key: string) {
      originalRemoveItem.apply(this, [key]);
      
      if (db && shouldSyncKey(key) && !isHydrating) {
          try {
            const docRef = doc(db, "ok_boz_live_data", key);
            deleteDoc(docRef).catch(err => console.warn(`[AutoSync] Failed to delete key: ${key}`, err));
          } catch(e) {}
      }
  };

  isAutoSyncSetup = true;
  console.log("☁️ Instant Cloud Sync Engine: Active");
};

// --- Hydrate / Pull from Cloud on Start ---
export const hydrateFromCloud = async () => {
    // 1. Init - Check for override or use default
    const savedConfig = localStorage.getItem('firebase_config');
    let config = DEFAULT_FIREBASE_CONFIG;

    if (savedConfig) {
        try {
            const parsed = JSON.parse(savedConfig);
            if (parsed.apiKey) config = parsed;
        } catch (e) { }
    }

    const isConnected = initFirebase(config);
    if (!isConnected || !db) {
        console.warn("Could not connect to cloud for hydration. DB object is null.");
        return;
    }

    // 2. Fetch
    console.log("🌊 Hydrating data from Cloud...");
    isHydrating = true; // Block auto-sync writers
    try {
        // Explicitly cast db to Firestore to satisfy type checker if needed, though check above covers it
        const querySnapshot = await getDocs(collection(db, "ok_boz_live_data"));
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data && data.content !== undefined) {
                    // Update LocalStorage to match Cloud
                    // We use the original setItem indirectly via the overridden one, 
                    // but isHydrating=true prevents it from writing back to cloud
                    window.localStorage.setItem(doc.id, data.content);
                }
            });
            console.log(`✅ Hydration Complete: ${querySnapshot.size} records synced.`);
        } else {
            console.log("Cloud database is empty. Starting fresh.");
        }
    } catch (e: any) {
        console.error("Hydration Failed (Offline or Permission Error):", e.message);
    } finally {
        isHydrating = false; // Re-enable auto-sync writers
    }
}

// Get all local data packaged as a JSON object
const getAllLocalData = () => {
  const backupData: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Only backup relevant keys
    if (key && shouldSyncKey(key)) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          backupData[key] = JSON.parse(value);
        } catch (e) {
          backupData[key] = value;
        }
      }
    }
  }
  return backupData;
};

// Sync Up: Push LocalStorage to Firebase (Bulk Backup)
export const syncToCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  const finalConfig = (config && config.apiKey) ? config : DEFAULT_FIREBASE_CONFIG;

  if (!initFirebase(finalConfig) || !db) {
    return { success: false, message: "Connection failed. Please check your API Key and Project ID." };
  }

  try {
    const data = getAllLocalData();
    // Bulk Backup for "Restore Point" functionality
    await setDoc(doc(db, "ok_boz_backups", "full_site_backup"), {
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data)
    });
    
    // Also update all individual live keys to ensure everything is in sync immediately
    const batchPromises = Object.keys(data).map(key => {
        // Safe check inside loop
        if (!db) return Promise.resolve();
        
        return setDoc(doc(db, "ok_boz_live_data", key), {
            content: typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]),
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    });
    
    await Promise.all(batchPromises);

    return { success: true, message: "Full site successfully synced to Google Cloud!" };
  } catch (e: any) {
    console.error("Sync Error", e);
    return { success: false, message: `Sync Failed: ${e.message}` };
  }
};

// Sync Down: Pull from Firebase to LocalStorage
export const restoreFromCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  const finalConfig = (config && config.apiKey) ? config : DEFAULT_FIREBASE_CONFIG;
  
  if (!initFirebase(finalConfig) || !db) {
    return { success: false, message: "Connection failed. Please check your API Key and Project ID." };
  }

  try {
    const docRef = doc(db, "ok_boz_backups", "full_site_backup");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const content = docSnap.data();
      const storedData = JSON.parse(content.data);

      // Clear and Restore
      isHydrating = true; // Prevent sync loops during restore
      // CAREFUL: Only clear data keys, keep auth/config
      // localStorage.clear(); 
      
      Object.keys(storedData).forEach(key => {
        if (typeof storedData[key] === 'object') {
          localStorage.setItem(key, JSON.stringify(storedData[key]));
        } else {
          localStorage.setItem(key, String(storedData[key]));
        }
      });
      isHydrating = false;
      
      // Restore the config itself so we don't lose connection
      if (config.apiKey) {
        localStorage.setItem('firebase_config', JSON.stringify(config));
      }

      return { success: true, message: "Data restored! Reloading..." };
    } else {
      return { success: false, message: "No full backup found. Try syncing up first." };
    }
  } catch (e: any) {
    console.error("Restore Error", e);
    return { success: false, message: `Restore Failed: ${e.message}` };
  }
};

// --- Database Inspection Logic ---
export const getCloudDatabaseStats = async (config: FirebaseConfig) => {
  const finalConfig = (config && config.apiKey) ? config : DEFAULT_FIREBASE_CONFIG;
  
  // Ensure we are connected
  if (!initFirebase(finalConfig) || !db) return null;
  
  try {
    const stats: Record<string, { count: number | string, size: string, lastUpdated: string }> = {};
    const querySnapshot = await getDocs(collection(db, "ok_boz_live_data"));
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        let count: number | string = 'N/A';
        let size = '0 KB';

        if (data.content) {
            // Approximate size in KB
            size = (new Blob([data.content]).size / 1024).toFixed(2) + ' KB';
            try {
                const parsed = JSON.parse(data.content);
                if (Array.isArray(parsed)) {
                    count = parsed.length;
                } else if (typeof parsed === 'object') {
                    count = Object.keys(parsed).length;
                } else {
                    count = 1;
                }
            } catch {
                count = 'Raw';
            }
        }

        stats[doc.id] = {
            count,
            size,
            lastUpdated: data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Unknown'
        };
    });
    return stats;
  } catch (e) {
    console.error("Error fetching cloud stats", e);
    return null;
  }
};

// --- System Notification Functions ---

// Collection path for system notifications. 
// For simplicity, we use one collection and filter by targetRoles/corporateId.
const NOTIFICATION_COLLECTION = "system_notifications";

// Ensure Firestore DB is initialized before using
const getDb = () => {
  if (!db) {
    // Attempt to initialize if not already
    const savedConfig = localStorage.getItem('firebase_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        initFirebase(config);
      } catch(e) {
        console.error("Failed to re-initialize Firebase for notification service", e);
      }
    } else {
        initFirebase(DEFAULT_FIREBASE_CONFIG);
    }
  }
  return db;
}

// Function to send a new system notification
export const sendSystemNotification = async (notification: SystemNotification) => {
  const firestore = getDb();
  if (!firestore) {
    console.warn("Firestore not initialized, cannot send system notification.");
    return;
  }

  try {
    const notificationWithId = { ...notification, id: `NOTIF-${Date.now()}` };
    await setDoc(doc(firestore, NOTIFICATION_COLLECTION, notificationWithId.id), notificationWithId);
    console.log(`📢 System notification sent: ${notification.title}`);
  } catch (error) {
    console.error("Failed to send system notification:", error);
  }
};

// Function to fetch system notifications for a specific user/role
export const fetchSystemNotifications = async (userRole: UserRole, corporateId?: string): Promise<SystemNotification[]> => {
  const firestore = getDb();
  if (!firestore) {
    console.warn("Firestore not initialized, cannot fetch system notifications.");
    return [];
  }

  try {
    let qRef;
    if (userRole === UserRole.ADMIN) {
      // Admin gets all notifications targeting ADMIN role
      qRef = query(
        collection(firestore, NOTIFICATION_COLLECTION),
        where('targetRoles', 'array-contains', UserRole.ADMIN),
        orderBy('timestamp', 'desc'),
        limit(50) // Limit to recent 50 notifications
      );
    } else if (userRole === UserRole.CORPORATE && corporateId) {
      // Corporate gets notifications targeting CORPORATE role and their specific corporateId
      qRef = query(
        collection(firestore, NOTIFICATION_COLLECTION),
        where('targetRoles', 'array-contains', UserRole.CORPORATE),
        where('corporateId', '==', corporateId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    } else {
      // Employees don't typically fetch system-wide notifications in this model
      return [];
    }

    const querySnapshot = await getDocs(qRef);
    const notifications: SystemNotification[] = [];
    querySnapshot.forEach(doc => {
      // For notifications already marked as read by the current user, mark them locally.
      // This is a client-side filter for read status. Firestore can't filter array-contains in nested array.
      // More robust solution would be a subcollection of 'readBy' for each user.
      const data = doc.data() as SystemNotification;
      notifications.push({ ...data, read: false }); // Assume unread initially, context will mark them
    });
    return notifications;
  } catch (error) {
    console.error("Failed to fetch system notifications:", error);
    return [];
  }
};

// Function to mark a system notification as read (for a specific user)
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  const firestore = getDb();
  if (!firestore) return;

  try {
    const docRef = doc(firestore, NOTIFICATION_COLLECTION, notificationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SystemNotification;
      const currentReadBy = (data as any).readBy || []; // Assuming 'readBy' is an array of userIds
      if (!currentReadBy.includes(userId)) {
        await setDoc(docRef, { readBy: [...currentReadBy, userId] }, { merge: true });
      }
    }
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
};