const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('[reset-server] ENV loaded. PORT =', process.env.PORT || '(default 8082)');
console.log('[reset-server] SMTP user set:', Boolean(process.env.SMTP_USER));
console.log('[reset-server] Firebase service account set:', Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS));

const RESET_ROOT = 'passwordResets';
const ADMIN_EMAIL = 'sysadmin@gmail.com';
const DEFAULT_CODE_LENGTH = 6;
const DEFAULT_CODE_TTL_MINUTES = 1;
const DEFAULT_TOKEN_TTL_MINUTES = 15;
const MAX_VERIFY_ATTEMPTS = 6;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function maskEmail(email) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) return email;
  const safeName = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
}

function generateCode(length) {
  const digits = '0123456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += digits[Math.floor(Math.random() * digits.length)];
  }
  return value;
}

function getNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.');
}

function initFirebase() {
  if (admin.apps.length) return;
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

function getMailer() {
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  if (!user || !pass) {
    throw new Error('Missing SMTP_USER or SMTP_PASS.');
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

async function sendExpoNotification(token, title, body, data, channelId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        channelId,
      }),
      signal: controller.signal,
    });

    const expoBody = await expoResponse.json().catch(() => null);
    if (!expoResponse.ok) {
      throw new Error(`Expo push failed: ${JSON.stringify(expoBody || expoResponse.statusText)}`);
    }

    return expoBody;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendFcmNotification(token, title, body, data, channelId) {
  return Promise.race([
    admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'default',
        },
      },
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('FCM send timed out after 10 seconds.')), 10000);
    }),
  ]);
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

async function checkExistingServer(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/test-smtp', async (req, res) => {
  try {
    const transporter = getMailer();
    await transporter.verify();
    res.json({ ok: true, message: 'SMTP connection successful' });
  } catch (error) {
    console.error('[test-smtp] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/notifications/send', async (req, res) => {
  try {
    initFirebase();
    const provider = String(req.body?.provider || 'fcm').trim().toLowerCase();
    const token = String(req.body?.token || '').trim();
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const channelId = String(req.body?.channelId || 'queue-turn').trim();
    const rawData = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};

    if (!token || !title || !body) {
      return res.status(400).json({ error: 'token, title, and body are required.' });
    }

    const data = Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => [key, String(value ?? '')]),
    );

    if (provider === 'expo') {
      const expoBody = await sendExpoNotification(token, title, body, data, channelId);

      return res.json({ ok: true, provider: 'expo', result: expoBody });
    }

    const messageId = await sendFcmNotification(token, title, body, data, channelId);

    res.json({ ok: true, provider: 'fcm', messageId });
  } catch (error) {
    console.error('[notifications/send] Error:', error);
    res.status(500).json({ ok: false, error: 'Unable to send notification.', details: error?.message });
  }
});

app.post('/notifications/test-last-student', async (req, res) => {
  try {
    initFirebase();

    const queueSnapshot = await admin.database().ref('staffQueue').get();
    const allQueues = queueSnapshot.val() || {};

    const latestEntry = Object.entries(allQueues)
      .flatMap(([uid, queueMap]) =>
        Object.values(queueMap || {}).map((item) => ({
          uid,
          ...item,
        })),
      )
      .filter((item) => String(item.pushToken || '').trim())
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];

    if (!latestEntry) {
      return res.status(404).json({ ok: false, error: 'No student queue entry with a push token was found.' });
    }

    const provider = String(latestEntry.pushProvider || '').trim().toLowerCase() || 'fcm';
    const token = String(latestEntry.pushToken || '').trim();
    const title = 'QueueLess: Test notification';
    const body = `Test sent to ${latestEntry.name || 'student'} for ${latestEntry.qrLabel || 'Office Queue'}.`;
    const data = {
      queueId: String(latestEntry.id || ''),
      uid: String(latestEntry.uid || ''),
      status: String(latestEntry.status || 'waiting'),
      type: 'debug_test_notification',
    };

    if (provider === 'expo') {
      const expoBody = await sendExpoNotification(token, title, body, data, 'queue-turn');

      return res.json({
        ok: true,
        provider,
        tokenPreview: `${token.slice(0, 18)}...`,
        queueId: latestEntry.id || null,
        studentName: latestEntry.name || null,
        qrLabel: latestEntry.qrLabel || null,
        result: expoBody,
      });
    }

    const messageId = await sendFcmNotification(token, title, body, data, 'queue-turn');

    return res.json({
      ok: true,
      provider,
      tokenPreview: `${token.slice(0, 18)}...`,
      queueId: latestEntry.id || null,
      studentName: latestEntry.name || null,
      qrLabel: latestEntry.qrLabel || null,
      messageId,
    });
  } catch (error) {
    console.error('[notifications/test-last-student] Error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to send test notification.', details: error?.message });
  }
});

app.post('/reset/request', async (req, res) => {
  try {
    initFirebase();
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (email === normalizeEmail(ADMIN_EMAIL)) {
      return res.status(400).json({ error: 'Admin password resets are not supported here.' });
    }

    const length = getNumber(process.env.RESET_CODE_LENGTH, DEFAULT_CODE_LENGTH);
    const ttlMinutes = getNumber(process.env.RESET_CODE_TTL_MINUTES, DEFAULT_CODE_TTL_MINUTES);

    const code = generateCode(length);
    const emailKey = sha256(email);
    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60 * 1000;
    const codeHash = sha256(`${email}|${code}`);

    const resetRef = admin.database().ref(`${RESET_ROOT}/${emailKey}`);
    await resetRef.set({
      email,
      codeHash,
      createdAt: now,
      expiresAt,
      attempts: 0,
    });

    console.log('[reset/request] Sending email via SMTP to:', email);
    const transporter = getMailer();
    const fromEmail = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
    const fromName = String(process.env.SMTP_FROM_NAME || 'QueueLess').trim();

    console.log('[reset/request] SMTP config - From:', fromEmail, 'User:', process.env.SMTP_USER);

    try {
      const info = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'QueueLess password reset code',
        text: `Your QueueLess password reset code is ${code}. This code expires in ${ttlMinutes} minute(s).`,
        html: `<p>Your QueueLess password reset code is <strong>${code}</strong>.</p><p>This code expires in ${ttlMinutes} minute(s).</p>`,
      });
      console.log('[reset/request] Email sent successfully:', info.messageId);
    } catch (smtpError) {
      console.error('[reset/request] SMTP Error:', smtpError.message);
      console.error('[reset/request] SMTP Error code:', smtpError.code);
      throw new Error(`SMTP failed: ${smtpError.message}`);
    }

    return res.json({
      ok: true,
      sentTo: maskEmail(email),
      expiresAt,
      message: 'Reset code sent.',
    });
  } catch (error) {
    console.error('[reset/request] Error:', error);
    const details = process.env.NODE_ENV !== 'production' ? error?.message : undefined;
    return res.status(500).json({ error: 'Unable to send reset code.', details });
  }
});

app.post('/reset/verify', async (req, res) => {
  try {
    initFirebase();
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const emailKey = sha256(email);
    const resetRef = admin.database().ref(`${RESET_ROOT}/${emailKey}`);
    const snapshot = await resetRef.get();
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Reset request not found.' });
    }

    const record = snapshot.val() || {};
    if (record.expiresAt && Date.now() > record.expiresAt) {
      await resetRef.remove();
      return res.status(410).json({ error: 'Reset code expired.' });
    }

    const attempts = Number(record.attempts || 0);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await resetRef.remove();
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
    }

    const codeHash = sha256(`${email}|${code}`);
    if (record.codeHash !== codeHash) {
      await resetRef.update({ attempts: attempts + 1 });
      return res.status(403).json({ error: 'Invalid code.' });
    }

    const tokenTtlMinutes = getNumber(process.env.RESET_TOKEN_TTL_MINUTES, DEFAULT_TOKEN_TTL_MINUTES);
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = sha256(`${email}|${token}`);
    const tokenExpiresAt = Date.now() + tokenTtlMinutes * 60 * 1000;

    await resetRef.update({
      verifiedAt: Date.now(),
      tokenHash,
      tokenExpiresAt,
    });

    return res.json({ ok: true, resetToken: token, tokenExpiresAt });
  } catch (error) {
    console.error('[reset/verify] Error:', error);
    return res.status(500).json({ error: 'Unable to verify code.' });
  }
});

app.post('/reset/confirm', async (req, res) => {
  try {
    initFirebase();
    const email = normalizeEmail(req.body?.email);
    const resetToken = String(req.body?.resetToken || '').trim();
    const newPassword = String(req.body?.newPassword || '').trim();

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, token, and password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const emailKey = sha256(email);
    const resetRef = admin.database().ref(`${RESET_ROOT}/${emailKey}`);
    const snapshot = await resetRef.get();
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Reset request not found.' });
    }

    const record = snapshot.val() || {};
    if (!record.tokenHash || !record.tokenExpiresAt) {
      return res.status(400).json({ error: 'Reset token not verified.' });
    }
    if (Date.now() > record.tokenExpiresAt) {
      await resetRef.remove();
      return res.status(410).json({ error: 'Reset token expired.' });
    }

    const tokenHash = sha256(`${email}|${resetToken}`);
    if (record.tokenHash !== tokenHash) {
      return res.status(403).json({ error: 'Invalid reset token.' });
    }

    // Try to find user in Firebase Auth, if not found, check staffProfiles
    let uid;
    try {
      const user = await admin.auth().getUserByEmail(email);
      uid = user.uid;
      console.log('[reset/confirm] Found user in Firebase Auth:', uid);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log('[reset/confirm] User not in Firebase Auth, checking staffProfiles...');
        // Look up staff in database by email
        const staffSnapshot = await admin.database().ref('staffProfiles').orderByChild('email').equalTo(email).once('value');
        if (!staffSnapshot.exists()) {
          console.error('[reset/confirm] Staff not found in database either:', email);
          return res.status(404).json({ error: 'No staff account found with this email.' });
        }
        const staffData = staffSnapshot.val();
        const staffEntry = Object.entries(staffData)[0];
        uid = staffEntry[0]; // UID is the key
        const staffProfile = staffEntry[1];
        console.log('[reset/confirm] Found staff in database:', uid, staffProfile.name);
        // Create Firebase Auth user with the new password
        try {
          const newUser = await admin.auth().createUser({
            uid: uid,
            email: email,
            password: newPassword,
            displayName: staffProfile.name || 'Staff'
          });
          console.log('[reset/confirm] Created Firebase Auth user:', newUser.uid);
          await resetRef.remove();
          return res.json({ ok: true, message: 'Password reset and account created successfully.' });
        } catch (createError) {
          console.error('[reset/confirm] Error creating user:', createError);
          return res.status(500).json({ error: 'Failed to create user account.' });
        }
      } else {
        throw authError;
      }
    }

    // User exists in Firebase Auth, update password
    await admin.auth().updateUser(uid, { password: newPassword });
    console.log('[reset/confirm] Password updated for user:', uid);

    await resetRef.remove();
    return res.json({ ok: true });
  } catch (error) {
    console.error('[reset/confirm] Error:', error);
    return res.status(500).json({ error: 'Unable to reset password.' });
  }
});

app.post('/qr/scan', async (req, res) => {
  try {
    initFirebase();
    const uid = String(req.body?.uid || '').trim();
    const qrId = String(req.body?.qrId || '').trim();

    console.log('[qr/scan] Received request - uid:', uid, 'qrId:', qrId);

    if (!uid || !qrId) {
      console.log('[qr/scan] Missing uid or qrId');
      return res.status(400).json({ error: 'uid and qrId are required.' });
    }

    const qrRef = admin.database().ref(`staffQRCodes/${uid}/${qrId}`);
    console.log('[qr/scan] Looking up QR at path:', `staffQRCodes/${uid}/${qrId}`);

    // Use get and set instead of transaction for Admin SDK compatibility
    const qrSnapshot = await qrRef.get();
    if (!qrSnapshot.exists()) {
      console.log('[qr/scan] QR code not found in database');
      return res.status(404).json({ error: 'QR code not found.' });
    }

    const current = qrSnapshot.val();
    const previousScans = Number(current.scans || 0);
    const scans = previousScans + 1;

    console.log('[qr/scan] Previous scans:', previousScans, 'New scans:', scans);

    await qrRef.update({
      scans,
      lastScannedAt: Date.now(),
    });

    console.log('[qr/scan] Updated successfully');
    return res.json({ ok: true, scans });
  } catch (error) {
    console.error('[qr/scan] Error:', error);
    return res.status(500).json({ error: 'Unable to update scan count.' });
  }
});

const port = Number(process.env.PORT || 8082);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[reset-server] Listening on 0.0.0.0:${port}`);
});

server.on('error', async (error) => {
  if (error?.code !== 'EADDRINUSE') {
    console.error('[reset-server] Failed to start:', error);
    process.exit(1);
    return;
  }

  const alreadyRunning = await checkExistingServer(port);
  if (alreadyRunning) {
    console.log(`[reset-server] QueueLess server is already running on port ${port}.`);
    process.exit(0);
    return;
  }

  console.error(`[reset-server] Port ${port} is already in use by another process.`);
  process.exit(1);
});
