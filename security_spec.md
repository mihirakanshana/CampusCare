# CampusCare AI — Security Specification

## 1. Data Invariants
1. **Identity Integrity**: A student creating a `users/{uid}` profile must set `uid == request.auth.uid`, `role == 'student'` (unless already an authorized admin), and cannot self-promote to `admin`.
2. **Report Ownership & Immutability**: A student creating a `reports/{reportId}` document must set `studentId == request.auth.uid`, `status == 'Pending'`, `isDemo == false`, and empty `assignedDepartment` / `assignedStaff`. `studentId` and `createdAt` are immutable.
3. **Privilege Separation on Reports**: Students can only read (`get` / `list`) reports where `resource.data.studentId == request.auth.uid`. Students can never update `status`, `priority`, `assignedDepartment`, `assignedStaff`, `adminComments`, or `resolvedAt`. Only verified admins can manage report triage, assignments, status transitions, and demo seeding.
4. **Notification Isolation**: Users can only read (`get` / `list`) notifications where `resource.data.userId == request.auth.uid`, and can only update `isRead` on their own notifications. Admins can create notifications for students on status/comment/assignment updates; students can only create `'submitted'` notifications for their own `userId == request.auth.uid`.
5. **PII Protection**: `users/{userId}` documents contain emails and student IDs and are strictly readable only by the document owner (`request.auth.uid == userId`) or verified admins (`isAdmin()`).
6. **Temporal Integrity**: `createdAt` and `updatedAt` timestamps must match `request.time`.
7. **Admin Bootstrapping & Spoof Protection**: Admin checks require either `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or `request.auth.token.email == 'mihirakanshana@gmail.com' && request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Role Escalation**: Student writes `users/{uid}` with `{ role: 'admin' }`.
2. **Shadow Update on Profile**: Student updates `users/{uid}` adding `{ isVerified: true }` or changing `role: 'admin'`.
3. **PII Scraping**: Student A calls `get` or `list` on `users` belonging to Student B.
4. **Report Spoofing**: Student A creates a report with `studentId: 'studentB_uid'`.
5. **Pre-Approved Report Injection**: Student creates a report with `status: 'Resolved'` or `assignedStaff: 'fake'`.
6. **Student Priority/Status Tampering**: Student updates their own report's `priority: 'Urgent'` or `status: 'Resolved'`.
7. **Cross-Student Report Read**: Student A queries `reports` without `where('studentId', '==', auth.uid)`.
8. **ID Poisoning**: Client writes a document with an invalid ID containing `/` or >128 chars.
9. **Denial of Wallet Payload**: Client submits a report with a 50KB `title` or >50 items in `adminComments`.
10. **Email Spoofing**: Unverified user with `email: 'mihirakanshana@gmail.com'` and `email_verified: false` attempts an admin write.
11. **Notification Hijack**: Student A reads or marks-as-read a notification where `userId == 'studentB_uid'`.
12. **Unauthorized Staff/Department Mutation**: Student attempts to create or delete documents in `departments` or `staff`.
