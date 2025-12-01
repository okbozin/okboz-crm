# OK BOZ - Developer Documentation

This document outlines the architecture, technology stack, and setup instructions for the OK BOZ staff management and CRM platform.

## 1. Technology Stack

### Frontend
- **React 18**: Core UI library.
- **Vite**: Fast build tool and development server.
- **TypeScript**: Static typing for reliability.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Lucide React**: Modern, lightweight icon library.
- **Recharts**: Composable charting library for analytics.
- **React Router DOM v6**: Client-side routing.

### Backend & Database (Cloud-First)
- **Firebase Firestore**: Primary NoSQL database for cloud synchronization and backup.
- **LocalStorage**: Used as the primary "offline-first" cache. The app reads from local storage for high-speed UI rendering and syncs to Firebase in the background.
- **Node.js (Optional)**: A simple `server.js` exists for potential future API extensions, but the core app logic currently runs client-side using the `cloudService`.

### Integrations
- **Google Maps API**: Used for location autocomplete, distance calculation, and live tracking map visualization.
  - Required APIs: Maps JavaScript API, Places API, Geocoding API, Distance Matrix API.
- **Google Gemini API**: AI-powered features (Email drafting, HR Assistant, Vehicle message generation).
- **Firebase Auth/DB**: Configuration is managed directly via the **Admin Settings** panel, not hardcoded files.

---

## 2. Database Architecture (Firestore & LocalStorage)

The application uses a **Key-Value Mapping** strategy. Data is stored in the browser's `localStorage` for instant access and mirrored to a Firestore collection named `ok_boz_live_data`.

### Data Keys (Collections)

| Key / Document ID | Description |
| :--- | :--- |
| `staff_data` | Array of Admin's employee profiles (Head Office). |
| `staff_data_{email}` | Array of Franchise-specific employee profiles. |
| `corporate_accounts` | List of Franchise/Corporate logins and details. |
| `leads_data` | CRM leads and prospects. |
| `vendor_data` | Attached vehicle vendors and taxi fleet details. |
| `global_enquiries_data` | Vehicle and general enquiries log (Shared between Admin/Corp). |
| `call_enquiries_history` | Logs of calls made/received via the Reception Desk. |
| `office_expenses` | Financial records (Income/Expense). |
| `tasks_data` | Task management records. |
| `branches_data` | Office branch locations (Geofencing settings). |
| `payroll_history` | Saved payroll batches and generated payslips. |
| `leave_history` | Employee leave requests and approval status. |
| `attendance_data_{id}_{y}_{m}` | Monthly attendance logs per employee. |
| `app_settings` | Global configurations (Company name, etc). |
| `transport_pricing_rules_v2` | Vehicle fare settings (Local/Outstation/Rental). |

---

## 3. Setup & Connection Guide

### Prerequisites
- Node.js (v16+)
- npm or yarn
- A Google Cloud Project (for Maps & Gemini)
- A Firebase Project

### Step 1: Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. In the project dashboard, click the **Web icon (</>)** to add an app.
4. Copy the `firebaseConfig` code block (contains `apiKey`, `projectId`, etc.).
5. **Enable Firestore:** Go to Firestore Database > Create Database > Start in **Test Mode** (for development) or Production Mode (requires setting up rules).

### Step 2: Google Maps Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the following APIs:
   - Maps JavaScript API
   - Places API (New)
   - Geocoding API
   - Distance Matrix API
3. Create an **API Key**.

### Step 3: Connecting the App (GUI Method)
You do **not** need to hardcode keys in `.env` files for this app. It uses a GUI-based configuration.

1. Start the app locally:
   ```bash
   npm install
   npm run dev
   ```
2. Open the app in your browser (usually `http://localhost:5173`).
3. Log in as **Super Admin** (Default: `okboz.com@gmail.com` / `admin123` or use the "Admin Demo" button).
4. Navigate to **Settings** -> **Database**.
5. Paste your Firebase Config object into the "Easy Connect Wizard".
6. Navigate to **Settings** -> **Integrations**.
7. Paste your Google Maps API Key.
8. Click **Save**. The app will reload and sync.

---

## 4. Deployment Guide

This is a static Single Page Application (SPA). It can be deployed to any static hosting provider.

### Option A: Vercel (Recommended)
1. Push your code to a Git repository (GitHub/GitLab).
2. Log in to Vercel and "Add New Project".
3. Import your repository.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Click **Deploy**.
   *Note: A `vercel.json` is already included in the project to handle routing redirects.*

### Option B: Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`.
2. Login: `firebase login`.
3. Initialize: `firebase init`.
   - Select **Hosting**.
   - Use your existing project.
   - Public directory: `dist`.
   - Configure as a single-page app? **Yes**.
4. Build the app: `npm run build`.
5. Deploy: `firebase deploy`.

### Option C: cPanel / Apache / Nginx
1. Run `npm run build` on your local machine.
2. The `dist/` folder will be created.
3. Upload the **contents** of the `dist/` folder to your server's `public_html` folder.
4. Ensure your server is configured to redirect all requests to `index.html` (React Routing).
   - For Apache, create an `.htaccess` file in the root:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```

---

## 5. Troubleshooting Common Issues

**1. "Map API Error" or Map not loading**
   - Ensure the Google Maps API key has **Billing Enabled** in the Google Cloud Console (Google requires this even for free tier usage).
   - Check that all 4 APIs listed in the Integration section are enabled.

**2. Data not syncing to Cloud**
   - Go to Admin > Settings > Database. Check if the connection status says "Connected".
   - Check the browser console (F12) for Firestore permission errors. If you see "Missing or insufficient permissions", update your Firestore Security Rules in the Firebase Console to allow read/write.

**3. "Login Failed" on a fresh deploy**
   - The app uses `localStorage` for the admin password initially.
   - Default credentials are: `okboz.com@gmail.com` / `admin123`.
   - Use the "Admin Demo" button on the login screen to initialize the session.
