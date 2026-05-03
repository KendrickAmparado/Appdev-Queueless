import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  getAuth,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { get, getDatabase, onValue, push, ref, remove, set, update } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';



function authMessage(error) {

  const code = error?.code || '';

  const message = error?.message || '';

  

  if (code === 'auth/email-already-in-use') {

    return 'This email is already registered. Please use a different email or login instead.';

  }

  if (code === 'auth/invalid-email') {

    return 'Invalid email address format.';

  }

  if (code === 'auth/weak-password') {

    return 'Password is too weak. Please use a stronger password.';

  }

  if (code === 'auth/operation-not-allowed') {

    return 'Email/password accounts are not enabled. Please contact support.';

  }

  if (code === 'auth/network-request-failed') {

    return 'Network error. Please check your internet connection.';

  }

  if (code === 'auth/user-not-found') {

    return 'No account found with this email. Please register first.';

  }

  if (code === 'auth/wrong-password') {

    return 'Incorrect password. Please try again.';

  }

  if (code === 'auth/too-many-requests') {

    return 'Too many attempts. Please try again later.';

  }

  if (code === 'auth/user-disabled') {

    return 'This account has been disabled. Please contact support.';

  }

  if (code === 'auth/invalid-credential') {

    return 'Invalid credentials. Please check your email and password.';

  }

  

  return message || 'An authentication error occurred.';

}



function dbMessage(error) {

  const code = error?.code || '';

  const message = error?.message || '';

  

  if (code === 'PERMISSION_DENIED') {

    return 'Permission denied. Please check Firebase database rules.';

  }

  if (code === 'DATABASE_ERROR') {

    return 'Database error. Please try again.';

  }

  

  return message || 'A database error occurred.';

}



const firebaseConfig = {

  apiKey: 'AIzaSyBjaTEHJhx2SOUr1sVyan2JfQj6QE2MYPs',

  authDomain: 'queueless-4f45c.firebaseapp.com',

  databaseURL: 'https://queueless-4f45c-default-rtdb.asia-southeast1.firebasedatabase.app',

  projectId: 'queueless-4f45c',

  storageBucket: 'queueless-4f45c.firebasestorage.app',

  messagingSenderId: '316587037345',

  appId: '1:316587037345:web:9419d79fde6cf81f7696e0',

  measurementId: 'G-XCSLSMN7WQ',

};



export const ADMIN_EMAIL = 'sysadmin@gmail.com';

export const ADMIN_PASSWORD = 'sysadmin12345';



function isLocalOnlyHost(hostname) {

  const value = String(hostname || '').trim().toLowerCase();

  return (

    value === 'localhost' ||

    value === '127.0.0.1' ||

    value === '::1' ||

    value === '10.0.2.2' ||

    value === '10.0.3.2'

  );

}



function resolveQueueLessWebOrigin() {

  const envOrigin = String(process.env.EXPO_PUBLIC_QR_WEB_ORIGIN || '').trim();

  if (envOrigin) {

    return envOrigin.replace(/\/$/, '');

  }



  const devMachineIp = String(process.env.EXPO_PUBLIC_DEV_MACHINE_IP || '').trim();



  const hostUri =

    Constants?.expoConfig?.hostUri ||

    Constants?.manifest2?.extra?.expoClient?.hostUri ||

    Constants?.manifest?.debuggerHost ||

    '';



  if (hostUri) {

    const hostWithPort = String(hostUri).split('/')[0];

    const [hostname, port] = hostWithPort.split(':');

    if (isLocalOnlyHost(hostname) && devMachineIp) {

      return `http://${devMachineIp}:${port || '8081'}`;

    }

    return `http://${hostWithPort}`;

  }



  if (typeof window !== 'undefined' && window.location?.origin) {

    return String(window.location.origin).replace(/\/$/, '');

  }



  if (devMachineIp) {

    return `http://${devMachineIp}:8081`;

  }



  return 'http://localhost:8081';

}



const QUEUELESS_WEB_ORIGIN = resolveQueueLessWebOrigin();

const QUEUELESS_JOIN_BASE_URL = `${QUEUELESS_WEB_ORIGIN}/join`;

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';



export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);



const authInstance = (() => {

  if (Platform.OS === 'web') {

    return getAuth(app);

  }



  try {

    return initializeAuth(app, {

      persistence: getReactNativePersistence(AsyncStorage),

    });

  } catch {

    return getAuth(app);

  }

})();



export const auth = authInstance;

export const rtdb = getDatabase(app);



const CACHE_KEYS = {

  staffProfile: (uid) => `ql:staffProfile:${uid}`,

  staffProfiles: 'ql:staffProfiles',

  staffQrCodes: (uid) => `ql:staffQrCodes:${uid}`,

  staffArchivedQrCodes: (uid) => `ql:staffArchivedQrCodes:${uid}`,

  staffArchivedProfiles: 'ql:staffArchivedProfiles',

  allStaffQrCodes: 'ql:allStaffQrCodes',

  staffQueue: (uid) => `ql:staffQueue:${uid}`,

  allStaffQueues: 'ql:allStaffQueues',

};

const WORKSPACE_CHAT_PATH = 'workspaceChat/messages';



function createDebouncedCallback(cb, delay = 200) {

  let timer = null;

  let lastArgs = null;

  return (...args) => {

    lastArgs = args;

    if (timer) return;

    timer = setTimeout(() => {

      timer = null;

      try {

        cb(...lastArgs);

      } finally {

        lastArgs = null;

      }

    }, delay);

  };

}



async function saveCache(key, value) {

  if (Platform.OS === 'web') return;



  try {

    await AsyncStorage.setItem(key, JSON.stringify(value));

  } catch {

    // Ignore cache write failures and keep network path as source of truth.

  }

}



async function loadCache(key, fallbackValue) {

  if (Platform.OS === 'web') return fallbackValue;



  try {

    const raw = await AsyncStorage.getItem(key);

    if (!raw) return fallbackValue;

    return JSON.parse(raw);

  } catch {

    return fallbackValue;

  }

}



function staffProfileRef(uid) {

  return ref(rtdb, `staffProfiles/${uid}`);

}



function staffQrCollectionRef(uid) {

  return ref(rtdb, `staffQRCodes/${uid}`);

}



function staffArchivedProfileCollectionRef() {

  return ref(rtdb, 'staffArchivedProfiles');

}



function staffArchivedProfileRef(uid) {

  return ref(rtdb, `staffArchivedProfiles/${uid}`);

}



function staffArchivedQrCollectionRef(uid) {

  return ref(rtdb, `staffArchivedQRCodes/${uid}`);

}



function staffQueueCollectionRef(uid) {

  return ref(rtdb, `staffQueues/${uid}`);

}



function normalizeEmail(email) {

  return String(email || '').trim().toLowerCase();

}



function normalizePushRegistration(value) {

  if (!value) return null;

  if (typeof value === 'string') {

    const token = String(value).trim();

    if (!token) return null;

    if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) {

      return { provider: 'expo', token };

    }

    return { provider: 'fcm', token };

  }

  if (typeof value === 'object') {

    const token = String(value.token || value.data || '').trim();

    if (!token) return null;

    const provider = String(value.provider || value.type || '').trim().toLowerCase();

    if (provider === 'expo' || token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) {

      return { provider: 'expo', token };

    }

    return { provider: 'fcm', token };

  }

  return null;

}



async function sendQueuePushNotification(pushRegistration, title, body, data = {}) {

  const normalized = normalizePushRegistration(pushRegistration);

  if (!normalized || Platform.OS === 'web') return;

  try {

    const response = await fetch(`${RESET_SERVER_URL}/notifications/send`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

      },

      body: JSON.stringify({

        provider: normalized.provider,

        token: normalized.token,

        title,

        body,

        data,

        channelId: 'queue-turn',

      }),

    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('[sendQueuePushNotification] Server rejected notification:', response.status, text.substring(0, 200));
    }

  } catch {

    // Ignore push send failures to avoid blocking queue status updates.

  }

}



export function buildQueueJoinLink(uid, qrId, qrLabel = '') {

  const url = new URL(QUEUELESS_JOIN_BASE_URL);

  url.searchParams.set('uid', String(uid || ''));

  url.searchParams.set('qrId', String(qrId || ''));

  if (qrLabel) {

    url.searchParams.set('label', String(qrLabel));

  }

  return url.toString();

}



function shouldRewriteQrLink(link) {

  const raw = String(link || '').trim();

  if (!raw) return true;



  if (raw.startsWith('exp://') || raw.startsWith('queueLess://') || raw.startsWith('queueless://')) {

    return true;

  }



  if (raw.includes('localhost') || raw.includes('127.0.0.1')) {

    return true;

  }



  if (raw.includes('10.0.2.2') || raw.includes('10.0.3.2') || raw.includes('[::1]')) {

    return true;

  }



  try {

    const parsed = new URL(raw);

    const currentOrigin = new URL(QUEUELESS_WEB_ORIGIN).origin;

    return parsed.origin !== currentOrigin;

  } catch {

    return true;

  }

}



export async function normalizeStaffQrLinks(uid) {

  if (!uid) return;



  const collection = staffQrCollectionRef(uid);

  const snapshot = await get(collection);

  const raw = snapshot.val() || {};

  const updates = {};



  Object.entries(raw).forEach(([id, record]) => {

    const qrId = String(record?.id || id || '');

    const label = String(record?.label || '').trim();

    const value = String(record?.value || '').trim();

    const nextValue = buildQueueJoinLink(uid, qrId, label);



    if (shouldRewriteQrLink(value) && value !== nextValue) {

      updates[`${id}/value`] = nextValue;

      updates[`${id}/updatedAt`] = Date.now();

    }

  });



  if (Object.keys(updates).length > 0) {

    await update(collection, updates);

  }

}



function parseQueueLessQrValue(qrValue) {

  const raw = String(qrValue || '').trim();



  if (!raw) {

    throw new Error('Invalid QR code. Please scan a valid QueueLess QR.');

  }



  if (raw.startsWith('QUEUELESS|')) {

    const parts = raw.split('|');

    if (parts.length !== 4) {

      throw new Error('Invalid QR code. Please scan a valid QueueLess QR.');

    }



    const [, uid, qrLabel, qrId] = parts;

    if (!uid || !qrId) {

      throw new Error('Invalid QR data. Please scan again.');

    }



    return {

      uid,

      qrId,

      qrLabel,

    };

  }



  try {

    const parsedUrl = new URL(raw);

    const uid = parsedUrl.searchParams.get('uid');

    const qrId = parsedUrl.searchParams.get('qrId');

    const qrLabel = parsedUrl.searchParams.get('label') || '';



    if (!uid || !qrId) {

      throw new Error('Invalid QR data. Please scan again.');

    }



    return {

      uid,

      qrId,

      qrLabel,

    };

  } catch {

    throw new Error('Invalid QR code. Please scan a valid QueueLess QR.');

  }

}



export async function signInAdmin(email, password) {

  const normalizedEmail = normalizeEmail(email);



  if (normalizedEmail !== normalizeEmail(ADMIN_EMAIL)) {

    throw new Error('Only sysadmin@gmail.com can access the admin portal.');

  }



  try {

    return await signInWithEmailAndPassword(auth, normalizedEmail, password);

  } catch (error) {

    const isDefaultAdmin =

      normalizedEmail === normalizeEmail(ADMIN_EMAIL) && password === ADMIN_PASSWORD;



    if (isDefaultAdmin && error?.code === 'auth/invalid-credential') {

      throw new Error(

        'Admin password in Firebase does not match sysadmin12345. Update sysadmin@gmail.com password in Firebase Authentication Users.',

      );

    }



    // Bootstrap admin account for first run when credentials match provided defaults.

    if (isDefaultAdmin && error?.code === 'auth/user-not-found') {

      try {

        return await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      } catch (createError) {

        if (createError?.code === 'auth/email-already-in-use') {

          try {

            return await signInWithEmailAndPassword(auth, normalizedEmail, password);

          } catch (retryError) {

            throw new Error(authMessage(retryError));

          }

        }



        throw new Error(authMessage(createError));

      }

    }



    throw new Error(authMessage(error));

  }

}



export async function logoutCurrentUser() {

  console.log('[logoutCurrentUser] Starting logout');

  const user = auth.currentUser;

  console.log('[logoutCurrentUser] Current user:', user?.email);

  

  // Skip push token clear for now due to Firebase rules blocking writes

  // This is not critical for logout functionality

  console.log('[logoutCurrentUser] Skipping push token clear (Firebase rules issue)');

  

  console.log('[logoutCurrentUser] Signing out from Firebase');

  await signOut(auth);

  console.log('[logoutCurrentUser] Logout complete');

}



export async function upsertCurrentUserPushToken(pushToken) {

  const user = auth.currentUser;

  if (!user) return;

  if (normalizeEmail(user.email) === normalizeEmail(ADMIN_EMAIL)) return;



  const normalizedPushRegistration = normalizePushRegistration(pushToken);

  if (!normalizedPushRegistration) return;



  await update(staffProfileRef(user.uid), {

    pushToken: normalizedPushRegistration.token,

    pushProvider: normalizedPushRegistration.provider,

    pushTokenUpdatedAt: Date.now(),

  });

}



export async function registerStaff({ name, contactNumber, officeDepartment, email, password }) {

  const normalizedEmail = normalizeEmail(email);

  const normalizedName = String(name || '').trim();

  const normalizedContact = String(contactNumber || '').trim();

  const normalizedOffice = String(officeDepartment || '').trim();



  if (!normalizedName || !normalizedContact || !normalizedOffice || !normalizedEmail || !password) {

    throw new Error('All fields are required.');

  }



  if (normalizedEmail === normalizeEmail(ADMIN_EMAIL)) {

    throw new Error('Cannot register with admin email address.');

  }



  try {

    console.log('[registerStaff] Creating user with email:', normalizedEmail);

    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

    const uid = userCredential.user.uid;

    console.log('[registerStaff] User created with UID:', uid);



    await updateProfile(userCredential.user, { displayName: normalizedName });

    console.log('[registerStaff] Profile updated');



    const profileData = {

      uid,

      name: normalizedName,

      contactNumber: normalizedContact,

      officeDepartment: normalizedOffice,

      email: normalizedEmail,

      status: 'pending',

      approved: false,

      archived: false,

      createdAt: Date.now(),

    };

    console.log('[registerStaff] Writing profile to Firebase at path:', staffProfileRef(uid).toString());

    console.log('[registerStaff] Profile data:', profileData);

    

    // Add timeout to prevent hanging on database write

    const timeoutPromise = new Promise((_, reject) => 

      setTimeout(() => reject(new Error('Database write timeout')), 5000)

    );

    

    await Promise.race([

      set(staffProfileRef(uid), profileData),

      timeoutPromise

    ]);

    console.log('[registerStaff] Profile written successfully');

    

    // Verify the write by reading back immediately

    console.log('[registerStaff] Verifying write by reading back...');

    const verifySnapshot = await get(staffProfileRef(uid));

    if (verifySnapshot.exists()) {

      console.log('[registerStaff] Verification successful - profile saved:', verifySnapshot.val());

    } else {

      console.error('[registerStaff] Verification FAILED - profile not found after write!');

    }



    return userCredential;

  } catch (error) {

    console.error('[registerStaff] Error:', error);

    console.error('[registerStaff] Error code:', error.code);

    console.error('[registerStaff] Error message:', error.message);

    

    if (error.message === 'Database write timeout') {

      console.error('[registerStaff] DATABASE WRITE FAILED - Firebase rules blocking write access');

      throw new Error('Registration partially successful but profile not saved. Please update Firebase Realtime Database rules to allow write access.');

    }

    

    throw new Error(authMessage(error));

  }

}



export async function signInStaff(email, password) {

  const normalizedEmail = normalizeEmail(email);



  if (normalizedEmail === normalizeEmail(ADMIN_EMAIL)) {

    throw new Error('Staff cannot use admin credentials. Please use the admin portal.');

  }



  try {

    return await signInWithEmailAndPassword(auth, normalizedEmail, password);

  } catch (error) {

    throw new Error(authMessage(error));

  }

}



function resolveResetServerUrl() {
  const configured = String(process.env.EXPO_PUBLIC_RESET_API_BASE || '').trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const devMachineIp = String(process.env.EXPO_PUBLIC_DEV_MACHINE_IP || '').trim();
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    '';

  if (hostUri) {
    const hostWithPort = String(hostUri).split('/')[0];
    const [hostname] = hostWithPort.split(':');
    if (isLocalOnlyHost(hostname) && devMachineIp) {
      return `http://${devMachineIp}:8083`;
    }
    return `http://${hostname}:8083`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const url = new URL(window.location.origin);
    url.port = '8083';
    return url.toString().replace(/\/$/, '');
  }

  if (devMachineIp) {
    return `http://${devMachineIp}:8083`;
  }

  return 'http://localhost:8083';
}

const RESET_SERVER_URL = resolveResetServerUrl();

async function notifyQrScan(uid, qrId) {
  try {
    console.log('[notifyQrScan] Notifying server - uid:', uid, 'qrId:', qrId);
    console.log('[notifyQrScan] Server URL:', `${RESET_SERVER_URL}/qr/scan`);

    const response = await fetch(`${RESET_SERVER_URL}/qr/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, qrId }),
    });

    console.log('[notifyQrScan] Server response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.warn('[notifyQrScan] Server rejected scan update:', response.status, text.substring(0, 200));
    } else {
      const data = await response.json();
      console.log('[notifyQrScan] Scan updated successfully:', data);
    }
  } catch (error) {
    console.warn('[notifyQrScan] Unable to reach server:', error?.message || error);
  }
}

export async function sendTestNotificationToLastStudent() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${RESET_SERVER_URL}/notifications/test-last-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let data = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error('Test notification server returned a non-JSON response.');
    }

    if (!response.ok) {
      throw new Error(data?.details || data?.error || 'Unable to send test notification.');
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Test notification timed out after 12 seconds. Check if the server can reach FCM or Expo.');
    }
    throw new Error(error?.message || 'Unable to send test notification.');
  } finally {
    clearTimeout(timeout);
  }
}

export function watchWorkspaceChatMessages(callback) {

  const messagesRef = ref(rtdb, WORKSPACE_CHAT_PATH);

  return onValue(messagesRef, (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw)
      .sort((a, b) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0))
      .slice(-40);

    callback(list);

  });

}

export async function sendWorkspaceChatMessage(text) {

  const user = auth.currentUser;

  if (!user) {

    throw new Error('You must be signed in to send a message.');

  }

  const trimmedText = String(text || '').trim();

  if (!trimmedText) {

    throw new Error('Message cannot be empty.');

  }

  const isAdmin = normalizeEmail(user.email) === normalizeEmail(ADMIN_EMAIL);
  let senderName = isAdmin ? 'Admin' : String(user.displayName || '').trim();

  if (!isAdmin && !senderName && user.uid) {

    try {

      const snapshot = await get(staffProfileRef(user.uid));

      senderName = String(snapshot.val()?.name || '').trim();

    } catch {

      senderName = '';

    }

  }

  if (!senderName) {

    senderName = isAdmin ? 'Admin' : 'Staff';

  }

  const messageRef = push(ref(rtdb, WORKSPACE_CHAT_PATH));

  await set(messageRef, {

    id: messageRef.key,

    text: trimmedText,

    senderUid: user.uid,

    senderRole: isAdmin ? 'admin' : 'staff',

    senderName,

    createdAt: Date.now(),

  });

}

export async function requestStaffPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === normalizeEmail(ADMIN_EMAIL)) {
    throw new Error('Cannot reset admin password through staff portal.');
  }

  try {
    console.log('[requestStaffPasswordReset] Server URL:', RESET_SERVER_URL);
    console.log('[requestStaffPasswordReset] Calling server API for:', normalizedEmail);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${RESET_SERVER_URL}/reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text();
    console.log('[requestStaffPasswordReset] Raw response:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[requestStaffPasswordReset] JSON parse error. Response was not JSON:', responseText.substring(0, 500));
      throw new Error('Server returned invalid response. Is the server running on the correct port?');
    }

    console.log('[requestStaffPasswordReset] Server response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send reset code');
    }

    return data;
  } catch (error) {
    console.error('[requestStaffPasswordReset] Error:', error);
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please check if the reset server is running and try again.');
    }
    if (error?.message === 'Network request failed') {
      throw new Error('Unable to reach reset server. Make sure your phone and computer are on the same WiFi network.');
    }
    throw new Error(error?.message || 'Unable to send reset code. Please try again later.');
  }
}



export async function verifyStaffPasswordResetCode(email, code) {
  const normalizedEmail = normalizeEmail(email);

  try {
    console.log('[verifyStaffPasswordResetCode] Verifying code for:', normalizedEmail);
    const response = await fetch(`${RESET_SERVER_URL}/reset/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, code }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[verifyStaffPasswordResetCode] JSON parse error. Response was not JSON');
      throw new Error('Server returned invalid response');
    }

    console.log('[verifyStaffPasswordResetCode] Server response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Invalid code');
    }

    return data.resetToken;
  } catch (error) {
    console.error('[verifyStaffPasswordResetCode] Error:', error);
    throw new Error(error.message || 'Unable to verify code');
  }
}



export async function resetStaffPasswordWithToken(email, resetToken, newPassword) {
  const normalizedEmail = normalizeEmail(email);

  try {
    console.log('[resetStaffPasswordWithToken] Resetting password for:', normalizedEmail);
    const response = await fetch(`${RESET_SERVER_URL}/reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        resetToken,
        newPassword,
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[resetStaffPasswordWithToken] JSON parse error. Response was not JSON');
      throw new Error('Server returned invalid response');
    }

    console.log('[resetStaffPasswordWithToken] Server response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }

    return data;
  } catch (error) {
    console.error('[resetStaffPasswordWithToken] Error:', error);
    throw new Error(error.message || 'Unable to reset password');
  }
}



export function watchStaffProfile(uid, callback) {

  loadCache(CACHE_KEYS.staffProfile(uid), null).then((cached) => {

    if (cached) callback(cached);

  });



  const profile = staffProfileRef(uid);

  return onValue(profile, (snapshot) => {

    const value = snapshot.val();

    callback(value);

    saveCache(CACHE_KEYS.staffProfile(uid), value);

  });

}



export function watchAllStaffProfiles(callback) {

  loadCache(CACHE_KEYS.staffProfiles, []).then((cached) => {

    if (cached?.length) callback(cached);

  });



  const profilesRef = ref(rtdb, 'staffProfiles');

  return onValue(profilesRef, (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw);

    callback(list);

    saveCache(CACHE_KEYS.staffProfiles, list);

  });

}



export function watchAllArchivedStaffProfiles(callback) {

  loadCache(CACHE_KEYS.staffArchivedProfiles, []).then((cached) => {

    if (cached?.length) callback(cached);

  });



  const archivedRef = staffArchivedProfileCollectionRef();

  return onValue(archivedRef, (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw);

    callback(list);

    saveCache(CACHE_KEYS.staffArchivedProfiles, list);

  });

}



export async function approveStaff(uid) {

  await update(staffProfileRef(uid), {

    approved: true,

    archived: false,

    status: 'approved',

    approvedAt: Date.now(),

  });

}



export async function disableStaff(uid) {

  await update(staffProfileRef(uid), {

    approved: false,

    archived: false,

    status: 'disabled',

  });

}



export async function enableStaff(uid) {

  await update(staffProfileRef(uid), {

    approved: true,

    archived: false,

    status: 'approved',

    approvedAt: Date.now(),

  });

}



export async function updateStaffProfile(uid, payload) {

  await update(staffProfileRef(uid), payload);

}



export async function deleteStaffPermanently(uid) {

  await remove(staffProfileRef(uid));

  await remove(staffArchivedProfileRef(uid));

  await remove(staffQrCollectionRef(uid));

  await remove(staffArchivedQrCollectionRef(uid));

  await remove(staffQueueCollectionRef(uid));

}



export async function archiveStaff(uid) {

  const profileRef = staffProfileRef(uid);



  try {

    await update(profileRef, {

      approved: false,

      archived: true,

      status: 'disabled',

      archivedAt: Date.now(),

    });

    return;

  } catch {

    const snapshot = await get(profileRef);

    const current = snapshot.val();



    if (!current) {

      throw new Error('Staff account not found.');

    }



    await set(staffArchivedProfileRef(uid), {

      ...current,

      approved: false,

      status: 'disabled',

      archivedAt: Date.now(),

    });

    await remove(profileRef);

  }

}



export async function restoreStaff(uid) {

  const profileRef = staffProfileRef(uid);



  try {

    await update(profileRef, {

      approved: false,

      archived: false,

      status: 'pending',

      restoredAt: Date.now(),

    });

    return;

  } catch {

    const archivedRef = staffArchivedProfileRef(uid);

    const snapshot = await get(archivedRef);

    const archived = snapshot.val();



    if (!archived) {

      throw new Error('Archived staff account not found.');

    }



    const { archivedAt, ...profile } = archived;

    await set(profileRef, {

      ...profile,

      approved: false,

      archived: false,

      status: 'pending',

      restoredAt: Date.now(),

    });

    await remove(archivedRef);

  }

}



export async function generateStaffQrCode(uid, label) {

  const collection = staffQrCollectionRef(uid);

  const codeRef = push(collection);

  const normalizedLabel = String(label || '').trim();



  const record = {

    id: codeRef.key,

    uid,

    label: normalizedLabel,

    value: buildQueueJoinLink(uid, codeRef.key, normalizedLabel),

    scans: 0,

    createdAt: Date.now(),

  };



  await set(codeRef, record);

  return record;

}



export function watchStaffQrCodes(uid, callback) {

  loadCache(CACHE_KEYS.staffQrCodes(uid), []).then((cached) => {

    if (cached?.length) callback(cached);

  });



  const collection = staffQrCollectionRef(uid);

  const debounced = createDebouncedCallback((list) => {

    callback(list);

    saveCache(CACHE_KEYS.staffQrCodes(uid), list);

  }, 200);



  return onValue(collection, (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    debounced(list);

  });

}



export function watchAllStaffQrCodes(callback) {
  console.log('[watchAllStaffQrCodes] Setting up listener');
  loadCache(CACHE_KEYS.allStaffQrCodes, []).then((cached) => {
    console.log('[watchAllStaffQrCodes] Loaded from cache:', cached?.length || 0, 'codes');
    if (cached?.length) callback(cached);
  });

  const collection = ref(rtdb, 'staffQRCodes');
  console.log('[watchAllStaffQrCodes] Listening to path:', collection.toString());

  const debounced = createDebouncedCallback((list) => {
    console.log('[watchAllStaffQrCodes] Debounced callback with', list.length, 'codes');
    callback(list);
    saveCache(CACHE_KEYS.allStaffQrCodes, list);
  }, 250);

  return onValue(collection, (snapshot) => {
    console.log('[watchAllStaffQrCodes] Snapshot received, exists:', snapshot.exists());
    const raw = snapshot.val() || {};
    console.log('[watchAllStaffQrCodes] Raw data keys:', Object.keys(raw));
    const flat = Object.values(raw).flatMap((perStaff) => Object.values(perStaff || {}));
    console.log('[watchAllStaffQrCodes] Flattened codes count:', flat.length);
    const list = flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    debounced(list);
  });
}

export function watchAllArchivedStaffQrCodes(callback) {
  console.log('[watchAllArchivedStaffQrCodes] Setting up listener');
  loadCache('ql:allStaffArchivedQrCodes', []).then((cached) => {
    console.log('[watchAllArchivedStaffQrCodes] Loaded from cache:', cached?.length || 0, 'codes');
    if (cached?.length) callback(cached);
  });

  const collection = ref(rtdb, 'staffArchivedQRCodes');
  console.log('[watchAllArchivedStaffQrCodes] Listening to path:', collection.toString());

  const debounced = createDebouncedCallback((list) => {
    console.log('[watchAllArchivedStaffQrCodes] Debounced callback with', list.length, 'codes');
    callback(list);
    saveCache('ql:allStaffArchivedQrCodes', list);
  }, 250);

  return onValue(collection, (snapshot) => {
    console.log('[watchAllArchivedStaffQrCodes] Snapshot received, exists:', snapshot.exists());
    const raw = snapshot.val() || {};
    console.log('[watchAllArchivedStaffQrCodes] Raw data keys:', Object.keys(raw));
    const flat = Object.values(raw).flatMap((perStaff) => Object.values(perStaff || {}));
    console.log('[watchAllArchivedStaffQrCodes] Flattened codes count:', flat.length);
    const list = flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    debounced(list);
  });
}

export async function addWalkInToQueue(uid, name, qrInfo, options = {}) {

  const queueRef = push(staffQueueCollectionRef(uid));

  const pushRegistration = normalizePushRegistration(options?.pushToken);

  const payload = {

    id: queueRef.key,

    name,

    qrId: qrInfo?.qrId || null,

    qrLabel: qrInfo?.qrLabel || null,

    pushToken: pushRegistration?.token || null,

    pushProvider: pushRegistration?.provider || null,

    status: 'waiting',

    createdAt: Date.now(),

  };



  await set(queueRef, payload);

  return payload;

}



export async function joinStudentQueueByQrValue(qrValue, studentName, options = {}) {

  const cleanName = String(studentName || '').trim();

  if (!cleanName) {

    throw new Error('Please enter your name before joining the queue.');

  }



  const { uid, qrId, qrLabel } = parseQueueLessQrValue(qrValue);

  const qrRef = ref(rtdb, `staffQRCodes/${uid}/${qrId}`);

  const qrSnapshot = await get(qrRef);

  const qrRecord = qrSnapshot.val();



  if (!qrRecord) {

    throw new Error('This QR code is no longer active. Please ask staff for a new QR.');

  }



  const queueRecord = await addWalkInToQueue(uid, cleanName, {

    qrId,

    qrLabel: qrLabel || qrRecord.label || null,

  }, {

    pushToken: options?.pushToken,

  });



  notifyQrScan(uid, qrId);



  return {

    uid,

    queueId: queueRecord.id,

    qrId,

    qrLabel: qrLabel || qrRecord.label || 'Office Queue',

    name: cleanName,

  };

}



export function watchStudentQueueTicket(uid, queueId, callback) {

  if (!uid || !queueId) {

    callback({

      exists: false,

      status: 'not_found',

      position: null,

      waitingCount: 0,

    });

    return () => {};

  }



  return onValue(staffQueueCollectionRef(uid), (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const current = raw[queueId];



    if (!current) {

      callback({

        exists: false,

        status: 'not_found',

        position: null,

        waitingCount: 0,

      });

      return;

    }



    // Filter waiting list to the same QR scope as the current ticket so

    // positions match what staff see when they filter by QR.

    const waitingList = list.filter((item) => {

      if (item.status !== 'waiting') return false;

      // If both have qrId, require exact match.

      if (current?.qrId && item.qrId) return item.qrId === current.qrId;

      // Fallback to matching qrLabel for legacy entries.

      if (!current?.qrId && current?.qrLabel && item.qrLabel) return item.qrLabel === current.qrLabel;

      // If current has no qr info, include all waiting items.

      return !current?.qrId && !current?.qrLabel;

    });



    const waitingIndex = waitingList.findIndex((item) => item.id === queueId);



    callback({

      exists: true,

      ...current,

      position: current.status === 'waiting' && waitingIndex >= 0 ? waitingIndex + 1 : null,

      waitingCount: waitingList.length,

    });

  });

}



export async function updateQueueStatus(uid, queueId, status) {

  const queueRef = ref(rtdb, `staffQueues/${uid}/${queueId}`);

  const snapshot = await get(queueRef);

  const current = snapshot.val();

  const previousStatus = String(current?.status || '');



  await update(queueRef, {

    status,

    updatedAt: Date.now(),

  });



  const pushRegistration =
    normalizePushRegistration({

      token: current?.pushToken,

      provider: current?.pushProvider,

    }) || normalizePushRegistration(current?.pushToken);

  if (!pushRegistration || previousStatus === status) return;



  if (status === 'serving') {

    await sendQueuePushNotification(

      pushRegistration,

      'QueueLess: It is your turn',

      `Hi ${current?.name || 'Student'}, please proceed to ${current?.qrLabel || 'the counter'} now.`,

      {

        queueId,

        uid,

        status,

      },

    );

  }



  if (status === 'successful') {

    await sendQueuePushNotification(

      pushRegistration,

      'QueueLess: Queue completed',

      `Hi ${current?.name || 'Student'}, your queue transaction is complete.`,

      {

        queueId,

        uid,

        status,

      },

    );

  }

}



export async function updateCurrentStaffProfile({ name, contactNumber }) {

  const user = auth.currentUser;

  if (!user) {

    throw new Error('No active user session found. Please log in again.');

  }



  const nextName = String(name || '').trim();

  const nextContactNumber = String(contactNumber || '').trim();



  if (!nextName || !nextContactNumber) {

    throw new Error('Name and contact number are required.');

  }



  if (nextName !== (user.displayName || '').trim()) {

    await updateProfile(user, { displayName: nextName });

  }



  await update(staffProfileRef(user.uid), {

    name: nextName,

    contactNumber: nextContactNumber,

    updatedAt: Date.now(),

  });

}



export async function updateCurrentStaffAvatar(avatarUri) {

  const user = auth.currentUser;

  if (!user) {

    throw new Error('No active user session found. Please log in again.');

  }



  const nextAvatarUri = String(avatarUri || '').trim();

  if (!nextAvatarUri) {

    throw new Error('Invalid avatar image.');

  }



  await update(staffProfileRef(user.uid), {

    avatarUri: nextAvatarUri,

    updatedAt: Date.now(),

  });

}



export function watchStaffQueue(uid, callback) {

  loadCache(CACHE_KEYS.staffQueue(uid), []).then((cached) => {

    if (cached?.length) callback(cached);

  });



  const debounced = createDebouncedCallback((list) => {

    callback(list);

    saveCache(CACHE_KEYS.staffQueue(uid), list);

  }, 200);



  return onValue(staffQueueCollectionRef(uid), (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    debounced(list);

  });

}



export function watchAllStaffQueues(callback) {

  loadCache(CACHE_KEYS.allStaffQueues, []).then((cached) => {

    if (cached?.length) callback(cached);

  });



  const collection = ref(rtdb, 'staffQueues');

  const debounced = createDebouncedCallback((flat) => {

    callback(flat);

    saveCache(CACHE_KEYS.allStaffQueues, flat);

  }, 300);



  return onValue(collection, (snapshot) => {

    const raw = snapshot.val() || {};

    const flat = Object.values(raw).flatMap((perStaff) => Object.values(perStaff || {}));

    debounced(flat);

  });

}



export async function archiveStaffQrCode(uid, qrCodeId) {

  const codeRef = ref(rtdb, `staffQRCodes/${uid}/${qrCodeId}`);

  const snapshot = await get(codeRef);

  const data = snapshot.val();



  if (!data) {

    throw new Error('QR code not found.');

  }



  await set(ref(rtdb, `staffArchivedQRCodes/${uid}/${qrCodeId}`), {

    ...data,

    archivedAt: Date.now(),

  });

  await remove(codeRef);

}



export function watchStaffArchivedQrCodes(uid, callback) {

  loadCache(CACHE_KEYS.staffArchivedQrCodes(uid), []).then((cached) => {

    if (cached?.length) callback(cached);

  });



  const collection = staffArchivedQrCollectionRef(uid);

  return onValue(collection, (snapshot) => {

    const raw = snapshot.val() || {};

    const list = Object.values(raw).sort((a, b) => (b.archivedAt || b.createdAt || 0) - (a.archivedAt || a.createdAt || 0));

    callback(list);

    saveCache(CACHE_KEYS.staffArchivedQrCodes(uid), list);

  });

}



export async function deleteArchivedStaffQrCode(uid, qrCodeId) {

  await remove(ref(rtdb, `staffArchivedQRCodes/${uid}/${qrCodeId}`));

}



export async function restoreArchivedStaffQrCode(uid, qrCodeId) {

  const archivedRef = ref(rtdb, `staffArchivedQRCodes/${uid}/${qrCodeId}`);

  const snapshot = await get(archivedRef);

  const data = snapshot.val();



  if (!data) {

    throw new Error('Archived QR code not found.');

  }



  const { archivedAt, ...restored } = data;

  await set(ref(rtdb, `staffQRCodes/${uid}/${qrCodeId}`), {

    ...restored,

    restoredAt: Date.now(),

  });

  await remove(archivedRef);

}
