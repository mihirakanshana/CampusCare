# CampusCare - Report a Community Issue

A responsive issue-reporting page where students and staff can report campus problems (electrical, plumbing, Wi-Fi, furniture, cleaning, laboratory, safety and more). It comes in two versions that look and behave the same:

| Version        | Files                                                        | Needs a build step? |
| -------------- | ------------------------------------------------------------ | ------------------- |
| **Standalone** | `report-issue.html`                                          | No                  |
| **React**      | `index.html`, `src/main.jsx`, `SubmitReport.jsx`, `SubmitReport.css` | Yes (Vite)          |

## Features

- Clean, card-based layout with a navbar, heading and footer
- Fields: issue title, detailed description (500-character counter), category, urgency level
- Location by **GPS** ("Get Current Location") or **manual entry**
- Optional image upload with drag-and-drop, preview, remove button and 5MB limit
- Inline validation with error messages that clear as the user edits
- Loading state on submit, then a thank-you screen with "Submit another report"
- Fully responsive (two-column fields collapse to one column on phones)

## Option 1: Standalone page

1. Open `report-issue.html` in any modern browser.
2. That's it. All HTML, CSS and JavaScript are inside the one file.

> The browser's GPS prompt may be blocked when a file is opened directly from disk (`file://`). It works on `localhost` and on `https://` sites. "Enter Manually" works everywhere.

## Option 2: React (Vite)

```bash
npm create vite@latest campuscare -- --template react
cd campuscare
npm install
```

Then:

1. Copy `SubmitReport.jsx` and `SubmitReport.css` into `src/`.
2. Replace the root `index.html` with the one provided (it loads the Inter font).
3. Make `src/main.jsx` look like this:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import SubmitReport from "./SubmitReport";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SubmitReport />
  </React.StrictMode>
);
```

4. Start the dev server:

```bash
npm run dev
```

## Project structure (React version)

```
campuscare/
├── index.html
├── package.json
└── src/
    ├── main.jsx
    ├── SubmitReport.jsx
    └── SubmitReport.css
```

## Firebase (React version)

The React version saves every report to **Cloud Firestore** (collection `reports`) and uploads the optional photo to **Cloud Storage**, so the Admin Dashboard can read the reports.

### Setup

1. Run `npm install firebase` in the project.
2. In the [Firebase console](https://console.firebase.google.com), create a project, add a **Web app**, and enable **Firestore Database**. Enable **Storage** too if you want photos (check that your project's plan supports Storage).
3. Copy `.env.example` to `.env` and paste in your web app config values, then restart `npm run dev`.
4. Put `firebase.js` in `src/`.
5. Publish `firestore.rules` and `storage.rules` (Firestore > Rules, Storage > Rules, or `firebase deploy --only firestore:rules,storage`). Without rules, Firestore blocks or exposes everything depending on the mode you picked.

### What gets saved

Each report is a document in `reports`, and the **document ID is the Report ID** (for example `CC-20261118-7KQ2MX`):

| Field                   | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `reportId`              | Same as the document ID                          |
| `title`, `description`  | What the user typed                              |
| `category`, `urgency`   | Selected values                                  |
| `location`              | Typed location, or "lat, lng" for GPS            |
| `locationType`          | `"gps"` or `"manual"`                            |
| `coordinates`           | `{ latitude, longitude }` for GPS, otherwise `null` |
| `imageUrl`              | Download URL of the photo, or `null`             |
| `status`                | Always `"Pending"` on submission                 |
| `createdAt`             | Server timestamp                                 |

### Confirmation screen

After a successful save the user sees "Report submitted successfully.", the unique Report ID (with a copy button), the submitted category, and the current status (Pending).

### Reading reports in the Admin Dashboard

```js
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Live list, newest first
const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
const unsubscribe = onSnapshot(q, (snap) => {
  const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // set state with reports
});

// Update a status
await updateDoc(doc(db, "reports", reportId), { status: "In Progress" });
```

The dashboard must be signed in with Firebase Authentication, because the rules only let signed-in users read or update reports. Before going live, restrict this further (for example to users with an `admin` custom claim).

## Connecting a different backend (standalone page)

`report-issue.html` still uses a **simulated 0.8-second delay** and is not connected to Firebase. To send its reports to your own server, find the commented-out request in the submit handler and replace the delay with it:

```js
const res = await fetch("/api/reports", { method: "POST", body: data });
if (!res.ok) throw new Error("Request failed");
```

The request is `multipart/form-data` with these fields:

| Field         | Description                                             |
| ------------- | ------------------------------------------------------- |
| `title`       | Short issue title                                       |
| `description` | Detailed description (up to 500 characters)             |
| `category`    | One of the listed categories                            |
| `urgency`     | Low Priority, Medium Priority, High Priority or Urgent  |
| `latitude`, `longitude` | Sent when the user chose GPS                  |
| `location`    | Sent when the user typed the location manually          |
| `image`       | Optional image file                                     |

Your backend should accept either `latitude` + `longitude` **or** `location`, not always both.

## Validation rules

| Field       | Rule                                                  |
| ----------- | ----------------------------------------------------- |
| Title       | Required                                              |
| Description | At least 10 characters                                |
| Category    | Must be selected                                      |
| Urgency     | Defaults to Medium Priority                           |
| Location    | Must pick GPS (and get a position) or type a location |
| Image       | Optional, images only, under 5MB                      |

## Customizing

- **Colors:** edit the variables at the top of the CSS (`--primary`, `--primary-dark`, `--primary-soft`, and so on).
- **Categories and urgency levels:** change the `CATEGORIES` and `URGENCY_LEVELS` arrays in `SubmitReport.jsx`, or the `<option>` lists in `report-issue.html`.
- **Limits:** `MAX_DESC` (description length) and `MAX_IMAGE_MB` (image size) are at the top of `SubmitReport.jsx`. In the standalone file, change `maxlength` on the textarea and `MAX_IMAGE` in the script.
- **Heading and branding:** edit the `<h1>`, subtitle and brand name in either version.

## Known limitations

- Navbar links are placeholders and don't go anywhere yet.
- No server, authentication or database is included.
- GPS coordinates are sent as raw numbers; no address lookup (reverse geocoding) is done.

## Ideas for next steps

- Handle non-OK server responses with specific error messages
- Add a "My Reports" page with report status tracking
- Add reverse geocoding to turn GPS coordinates into a readable address
- Add file-type and multiple-image support
