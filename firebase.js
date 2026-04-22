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
  allStaffQrCodes: 'ql:allStaffQrCodes',
  staffQueue: (uid) => `ql:staffQueue:${uid}`,
  allStaffQueues: 'ql:allStaffQueues',
};

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

function staffArchivedQrCollectionRef(uid) {
  return ref(rtdb, `staffArchivedQRCodes/${uid}`);
}

function staffQueueCollectionRef(uid) {
  return ref(rtdb, `staffQueues/${uid}`);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeExpoPushToken(token) {
  const value = String(token || '').trim();
  if (!value) return '';
  if (value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken[')) return value;
  return '';
}

async function sendQueuePushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || Platform.OS === 'web') return;

  try {
    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        channelId: 'queue-turn',
      }),
    });
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

function authMessage(error) {
  const code = error?.code || '';

  if (code === 'auth/invalid-email') return 'The email address is invalid.';
  if (code === 'auth/missing-password') return 'Please enter your password.';
  if (code === 'auth/invalid-credential') return 'Invalid email or password.';
  if (code === 'auth/user-not-found') return 'No account was found for this email.';
  if (code === 'auth/email-already-in-use') return 'This email is already registered.';
  if (code === 'auth/weak-password') return 'Password is too weak. Use at least 8 characters.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your internet and try again.';
  if (code === 'auth/operation-not-allowed') {
    return 'Email/password sign-in is disabled in Firebase Console.';
  }

  return error?.message || 'Authentication failed. Please try again.';
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

export async function signInStaff(email, password) {
  const normalizedEmail = normalizeEmail(email);

  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error) {
    throw new Error(authMessage(error));
  }

  if (normalizeEmail(credential.user.email) === normalizeEmail(ADMIN_EMAIL)) {
    await signOut(auth);
    throw new Error('Admin account is only allowed on the web admin portal.');
  }

  const profile = await getStaffProfile(credential.user.uid);
  if (profile?.status === 'disabled') {
    await signOut(auth);
    throw new Error('Your account is disabled. Contact the admin.');
  }

  return credential;
}

export async function registerStaff({ name, contactNumber, officeDepartment, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === normalizeEmail(ADMIN_EMAIL)) {
    throw new Error('This email is reserved for admin.');
  }

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error) {
    throw new Error(authMessage(error));
  }

  await updateProfile(credential.user, {
    displayName: name,
  });

  await set(staffProfileRef(credential.user.uid), {
    uid: credential.user.uid,
    name,
    contactNumber,
    officeDepartment,
    email: normalizedEmail,
    avatarUri: '',
    role: 'staff',
    approved: false,
    status: 'pending',
    createdAt: Date.now(),
    approvedAt: null,
  });

  return credential;
}

export async function logoutCurrentUser() {
  const user = auth.currentUser;
  if (user && normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)) {
    try {
      await update(staffProfileRef(user.uid), {
        pushToken: null,
        pushTokenUpdatedAt: Date.now(),
      });
    } catch {
      // Ignore token cleanup failure and continue logging out.
    }
  }

  return signOut(auth);
}

export async function upsertCurrentUserPushToken(pushToken) {
  const user = auth.currentUser;
  if (!user) return;
  if (normalizeEmail(user.email) === normalizeEmail(ADMIN_EMAIL)) return;

  const normalizedPushToken = normalizeExpoPushToken(pushToken);
  if (!normalizedPushToken) return;

  await update(staffProfileRef(user.uid), {
    pushToken: normalizedPushToken,
    pushTokenUpdatedAt: Date.now(),
  });
}

export async function signInAdminDefault() {
  return signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
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

export async function getStaffProfile(uid) {
  try {
    const snapshot = await get(staffProfileRef(uid));
    const value = snapshot.val();
    await saveCache(CACHE_KEYS.staffProfile(uid), value);
    return value;
  } catch {
    return loadCache(CACHE_KEYS.staffProfile(uid), null);
  }
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

export async function approveStaff(uid) {
  await update(staffProfileRef(uid), {
    approved: true,
    status: 'approved',
    approvedAt: Date.now(),
  });
}

export async function disableStaff(uid) {
  await update(staffProfileRef(uid), {
    approved: false,
    status: 'disabled',
  });
}

export async function enableStaff(uid) {
  await update(staffProfileRef(uid), {
    approved: true,
    status: 'approved',
    approvedAt: Date.now(),
  });
}

export async function updateStaffProfile(uid, payload) {
  await update(staffProfileRef(uid), payload);
}

export async function deleteStaff(uid) {
  await remove(staffProfileRef(uid));
  await remove(staffQrCollectionRef(uid));
  await remove(staffQueueCollectionRef(uid));
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
  loadCache(CACHE_KEYS.allStaffQrCodes, []).then((cached) => {
    if (cached?.length) callback(cached);
  });

  const collection = ref(rtdb, 'staffQRCodes');
  const debounced = createDebouncedCallback((list) => {
    callback(list);
    saveCache(CACHE_KEYS.allStaffQrCodes, list);
  }, 250);

  return onValue(collection, (snapshot) => {
    const raw = snapshot.val() || {};
    const flat = Object.values(raw).flatMap((perStaff) => Object.values(perStaff || {}));
    const list = flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    debounced(list);
  });
}

export async function addWalkInToQueue(uid, name, qrInfo, options = {}) {
  const queueRef = push(staffQueueCollectionRef(uid));
  const pushToken = normalizeExpoPushToken(options?.pushToken);
  const payload = {
    id: queueRef.key,
    name,
    qrId: qrInfo?.qrId || null,
    qrLabel: qrInfo?.qrLabel || null,
    pushToken: pushToken || null,
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

  await update(qrRef, {
    scans: Number(qrRecord?.scans || 0) + 1,
    lastScannedAt: Date.now(),
  });

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

  const pushToken = normalizeExpoPushToken(current?.pushToken);
  if (!pushToken || previousStatus === status) return;

  if (status === 'serving') {
    await sendQueuePushNotification(
      pushToken,
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
      pushToken,
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