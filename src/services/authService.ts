import { initializeApp, deleteApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  db,
  isBootstrappedAdminEmail,
  FIREBASE_PROJECT_ID,
  OperationType,
  handleFirestoreError,
} from '../firebase/config';
import { UserProfile, UserRole } from '../types/campuscare';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return `Email/Password sign-in is not yet enabled in Firebase Authentication. Enable it in Firebase Console (https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers) or sign in with Google below.`;
    case 'auth/email-already-in-use':
      return 'An account with this university email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid university email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

async function resolveUserRole(firebaseUser: FirebaseUser): Promise<UserRole> {
  if (
    firebaseUser.emailVerified &&
    isBootstrappedAdminEmail(firebaseUser.email)
  ) {
    return 'admin';
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    if (adminSnap.exists()) {
      return 'admin';
    }
  } catch {
    // Non-admin users cannot read other admin records, or doc doesn't exist
  }
  return 'student';
}

function toUserProfile(data: Record<string, unknown>, uid: string): UserProfile {
  const ts = data.createdAt;
  return {
    uid,
    fullName: String(data.fullName || 'Campus User'),
    email: String(data.email || ''),
    studentId: String(data.studentId || ''),
    role: data.role === 'admin' ? 'admin' : 'student',
    createdAt: ts instanceof Timestamp ? ts.toDate() : null,
  };
}

export async function ensureUserProfile(
  firebaseUser: FirebaseUser,
  overrides?: { fullName?: string; studentId?: string }
): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const resolvedRole = await resolveUserRole(firebaseUser);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
  }

  if (!snap.exists()) {
    const fullName = (overrides?.fullName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Campus Student').slice(0, 120);
    const email = (firebaseUser.email || '').slice(0, 200);
    const studentId = (overrides?.studentId || '').slice(0, 40);

    try {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        fullName,
        email,
        studentId,
        role: resolvedRole,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
    }

    return {
      uid: firebaseUser.uid,
      fullName,
      email,
      studentId,
      role: resolvedRole,
      createdAt: new Date(),
    };
  }

  const profile = toUserProfile(snap.data(), firebaseUser.uid);
  if (resolvedRole === 'admin' && profile.role !== 'admin') {
    try {
      await updateDoc(userRef, { role: 'admin' });
      profile.role = 'admin';
    } catch {
      // ignore if user doc update not permitted
    }
  }
  return profile;
}

export async function registerStudentWithEmail(params: {
  fullName: string;
  email: string;
  studentId: string;
  password: string;
}): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
  await updateProfile(cred.user, { displayName: params.fullName.trim() });
  return ensureUserProfile(cred.user, {
    fullName: params.fullName.trim(),
    studentId: params.studentId.trim(),
  });
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return ensureUserProfile(cred.user);
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  return ensureUserProfile(cred.user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function updateOwnStudentProfile(
  uid: string,
  updates: { fullName: string; studentId: string }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      fullName: updates.fullName.trim().slice(0, 120),
      studentId: updates.studentId.trim().slice(0, 40),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function sendCurrentUserVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No authenticated user found.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function reloadCurrentUser(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

export async function createAdminAccountByAdmin(params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ uid: string; email: string; promotedExisting: boolean }> {
  const appName = `admin-provisioner-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    let targetUser: FirebaseUser;
    let promotedExisting = false;

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        params.email.trim(),
        params.password
      );
      await updateProfile(cred.user, { displayName: params.fullName.trim() });
      targetUser = cred.user;
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') {
        const existingCred = await signInWithEmailAndPassword(
          secondaryAuth,
          params.email.trim(),
          params.password
        );
        targetUser = existingCred.user;
        promotedExisting = true;
      } else {
        throw err;
      }
    }

    const newUid = targetUser.uid;
    const cleanEmail = params.email.trim().slice(0, 200);
    const cleanName = (
      params.fullName.trim() ||
      targetUser.displayName ||
      cleanEmail.split('@')[0]
    ).slice(0, 120);

    try {
      await setDoc(doc(db, 'admins', newUid), {
        uid: newUid,
        email: cleanEmail,
        fullName: cleanName,
        grantedAt: serverTimestamp(),
      });

      const existingUserDoc = await getDoc(doc(db, 'users', newUid));
      if (existingUserDoc.exists()) {
        await updateDoc(doc(db, 'users', newUid), { role: 'admin' });
      } else {
        await setDoc(doc(db, 'users', newUid), {
          uid: newUid,
          fullName: cleanName,
          email: cleanEmail,
          studentId: '',
          role: 'admin',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${newUid}`);
    }

    await signOut(secondaryAuth);
    return { uid: newUid, email: cleanEmail, promotedExisting };
  } finally {
    await deleteApp(secondaryApp);
  }
}
