# CampusCare AI — Smart Campus Issue Reporting & Management System

CampusCare AI is a full-stack campus maintenance reporting, AI triage, and facilities analytics platform built with React, TypeScript, Tailwind CSS, Express, Firebase (Auth, Firestore, Storage), and Google Gemini (`@google/genai`).

## Firebase Setup & Configuration

Firebase Firestore and Google Authentication are configured in `firebase-applet-config.json` (project `neat-climber-df900`) and hardened rules are deployed via `firestore.rules`.

### 1. Enable Email/Password Sign-In (Optional if using Google Sign-In)
Google Sign-In is enabled automatically. To allow university Email/Password registration and login:
1. Open the [Firebase Authentication Providers Console](https://console.firebase.google.com/project/neat-climber-df900/authentication/providers).
2. Click **Add new provider** -> **Email/Password** -> toggle **Enable** -> **Save**.

### 2. Enable Firebase Storage & Deploy `storage.rules`
To store uploaded campus issue photographs (`JPG`, `PNG`, `WEBP` up to 5 MB):
1. Open **Storage** in the [Firebase Console](https://console.firebase.google.com/project/neat-climber-df900/storage) and click **Get started**.
2. Deploy the provided `storage.rules` file via Firebase CLI:
   ```bash
   firebase deploy --only storage
   ```

### 3. Firestore Indexes
If Firestore prompts for a composite index on `reports` (`studentId` + `createdAt`) or `notifications` (`userId` + `createdAt`), open the generated index creation link in the browser console or deploy `firestore.indexes.json`.

### 4. Administrator Access
- Public registration strictly assigns the `student` role.
- The bootstrapped administrator account (`mihirakanshana@gmail.com`) is granted `admin` access upon verified Google Sign-In.
- Existing administrators can grant `admin` access to additional staff members under **Settings -> Authorized Administrator Setup**.

## Local Development & Production Build

```bash
npm install
npm run dev      # Starts Express + Vite dev server on port 3000
npm run lint     # TypeScript check
npm run build    # Builds production frontend into dist/
npm start        # Serves production build + /api/ai/* routes on port 3000
```

Set `GEMINI_API_KEY` in server environment variables (or AI Studio Settings > Secrets) for server-side Gemini multimodal issue analysis, assistant chat, and CampusCare Intelligence insights.
