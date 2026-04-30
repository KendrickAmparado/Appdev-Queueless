const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

admin.initializeApp();

const ADMIN_EMAIL = 'sysadmin@gmail.com';
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MIN_RESEND_MS = 60 * 1000;
const REGION = 'asia-southeast1';
const BCRYPT_ROUNDS = 10;

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getGmailCredentials() {
  const config = typeof functions.config === 'function' ? functions.config() : {};
  const user = config?.gmail?.user || process.env.GMAIL_USER || '';
  const pass = config?.gmail?.app_password || process.env.GMAIL_APP_PASSWORD || '';

  if (!user || !pass) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gmail SMTP is not configured. Set gmail.user and gmail.app_password.',
    );
  }

  return { user, pass };
}

function createTransporter() {
  const { user, pass } = getGmailCredentials();
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });
}

function buildResetEmail(code) {
  const cleanCode = String(code).trim();
  return {
    subject: 'QueueLess Password Reset Code',
    text: `Your QueueLess password reset code is: ${cleanCode}. This code expires in 15 minutes.`,
    html: `<p>Your QueueLess password reset code is:</p><h2>${cleanCode}</h2><p>This code expires in 15 minutes.</p>`,
  };
}

function emailKey(email) {
  return hashValue(normalizeEmail(email));
}

function staffAccountRef(uid) {
  return admin.database().ref(`staffAccounts/${uid}`);
}

function staffAccountEmailRef(email) {
  return admin.database().ref(`staffAccountEmails/${emailKey(email)}`);
}

async function getStaffAccountByEmail(email) {
  const emailSnapshot = await staffAccountEmailRef(email).get();
  const mapping = emailSnapshot.val();
  if (!mapping?.uid) {
    throw new functions.https.HttpsError('not-found', 'No account was found for this email.');
  }

  const accountSnapshot = await staffAccountRef(mapping.uid).get();
  const account = accountSnapshot.val();

  if (!account) {
    throw new functions.https.HttpsError('not-found', 'No account was found for this email.');
  }

  return account;
}

async function createStaffProfile(uid, payload) {
  const profileRef = admin.database().ref(`staffProfiles/${uid}`);
  const existingSnapshot = await profileRef.get();
  const existingProfile = existingSnapshot.val();

  await profileRef.set({
    uid,
    name: payload.name,
    contactNumber: payload.contactNumber,
    officeDepartment: payload.officeDepartment,
    email: payload.email,
    avatarUri: existingProfile?.avatarUri || '',
    role: 'staff',
    approved: false,
    archived: false,
    status: 'pending',
    createdAt: existingProfile?.createdAt || Date.now(),
    approvedAt: null,
    restoredAt: Date.now(),
  });

  await admin.database().ref(`staffArchivedProfiles/${uid}`).remove();
}

exports.registerStaffAccount = functions.region(REGION).https.onCall(async (data) => {
  const name = String(data?.name || '').trim();
  const contactNumber = String(data?.contactNumber || '').trim();
  const officeDepartment = String(data?.officeDepartment || '').trim();
  const email = normalizeEmail(data?.email || '');
  const password = String(data?.password || '');

  if (!name || !contactNumber || !officeDepartment || !email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'All fields are required.');
  }

  if (email === ADMIN_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'This email is reserved for admin.');
  }

  if (password.length < 8) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  }

  const existingEmailSnapshot = await staffAccountEmailRef(email).get();
  if (existingEmailSnapshot.exists()) {
    throw new functions.https.HttpsError('already-exists', 'This email is already registered.');
  }

  const uid = admin.database().ref('staffAccounts').push().key;
  if (!uid) {
    throw new functions.https.HttpsError('internal', 'Unable to create account right now.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = Date.now();

  await staffAccountRef(uid).set({
    uid,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  await staffAccountEmailRef(email).set({
    uid,
    email,
    createdAt: now,
  });

  await createStaffProfile(uid, {
    name,
    contactNumber,
    officeDepartment,
    email,
  });

  const customToken = await admin.auth().createCustomToken(uid, { role: 'staff' });
  return { uid, customToken };
});

exports.signInStaffAccount = functions.region(REGION).https.onCall(async (data) => {
  const email = normalizeEmail(data?.email || '');
  const password = String(data?.password || '');

  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and password are required.');
  }

  const account = await getStaffAccountByEmail(email);
  const matches = await bcrypt.compare(password, String(account.passwordHash || ''));

  if (!matches) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email or password.');
  }

  const profileSnapshot = await admin.database().ref(`staffProfiles/${account.uid}`).get();
  const profile = profileSnapshot.val();
  if (profile?.status === 'disabled') {
    throw new functions.https.HttpsError('permission-denied', 'Your account is disabled.');
  }
  if (profile?.archived === true || profile?.status === 'archived') {
    throw new functions.https.HttpsError('permission-denied', 'Your account is archived.');
  }

  const customToken = await admin.auth().createCustomToken(account.uid, { role: 'staff' });
  return { uid: account.uid, customToken };
});

exports.requestStaffPasswordResetCode = functions.region(REGION).https.onCall(async (data) => {
  const email = String(data?.email || '').trim().toLowerCase();

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }

  if (email === ADMIN_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Admin reset is not allowed here.');
  }

  const resetRef = admin.database().ref(`passwordResetsByEmail/${emailKey(email)}`);
  const existingSnapshot = await resetRef.get();
  const existing = existingSnapshot.val();

  if (existing?.lastSentAt && Date.now() - existing.lastSentAt < MIN_RESEND_MS) {
    throw new functions.https.HttpsError('resource-exhausted', 'Please wait before requesting another code.');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const payload = {
    email,
    codeHash: hashValue(code),
    expiresAt: Date.now() + RESET_CODE_TTL_MS,
    attempts: 0,
    createdAt: Date.now(),
    lastSentAt: Date.now(),
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    verifiedAt: null,
  };

  await resetRef.set(payload);

  const transporter = createTransporter();
  const emailContent = buildResetEmail(code);
  await transporter.sendMail({
    from: `QueueLess Support <${getGmailCredentials().user}>`,
    to: email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  return { ok: true };
});

exports.verifyStaffPasswordResetCode = functions.region(REGION).https.onCall(async (data) => {
  const email = String(data?.email || '').trim().toLowerCase();
  const code = String(data?.code || '').trim();

  if (!email || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and code are required.');
  }

  const resetRef = admin.database().ref(`passwordResetsByEmail/${emailKey(email)}`);
  const snapshot = await resetRef.get();
  const record = snapshot.val();

  if (!record?.codeHash || record?.email !== email) {
    throw new functions.https.HttpsError('not-found', 'Reset code not found.');
  }

  if (record?.expiresAt && Date.now() > record.expiresAt) {
    throw new functions.https.HttpsError('deadline-exceeded', 'Reset code expired.');
  }

  if (record?.attempts >= MAX_ATTEMPTS) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many attempts.');
  }

  if (hashValue(code) !== record.codeHash) {
    await resetRef.update({ attempts: Number(record?.attempts || 0) + 1 });
    throw new functions.https.HttpsError('invalid-argument', 'Invalid reset code.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await resetRef.update({
    resetTokenHash: hashValue(resetToken),
    resetTokenExpiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    verifiedAt: Date.now(),
    codeHash: null,
    expiresAt: null,
  });

  return { resetToken };
});

exports.resetStaffPasswordWithToken = functions.region(REGION).https.onCall(async (data) => {
  const email = String(data?.email || '').trim().toLowerCase();
  const resetToken = String(data?.resetToken || '').trim();
  const newPassword = String(data?.newPassword || '');

  if (!email || !resetToken || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'Email, token, and password are required.');
  }

  if (newPassword.length < 8) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  }

  const resetRef = admin.database().ref(`passwordResetsByEmail/${emailKey(email)}`);
  const snapshot = await resetRef.get();
  const record = snapshot.val();

  if (!record?.resetTokenHash || record?.email !== email) {
    throw new functions.https.HttpsError('not-found', 'Reset session not found.');
  }

  if (record?.resetTokenExpiresAt && Date.now() > record.resetTokenExpiresAt) {
    throw new functions.https.HttpsError('deadline-exceeded', 'Reset session expired.');
  }

  if (hashValue(resetToken) !== record.resetTokenHash) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid reset token.');
  }

  const account = await getStaffAccountByEmail(email);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await staffAccountRef(account.uid).update({
    passwordHash,
    updatedAt: Date.now(),
  });
  await resetRef.remove();

  return { ok: true };
});
