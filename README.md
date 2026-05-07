# QUEUELESS APP

QueueLess is a single Expo app with role-based folders kept separate for clearer navigation and easier maintenance.

## Project Layout

- `Admin/` admin-specific screens and flows
- `Staff/` staff launcher and staff-specific screens
- `Student/` student-specific screens
- `src/` shared components, navigation, theme, and utilities
- `assets/` static images and other files
- `server/` password reset backend

## System Overview

QueueLess is a single Expo app that serves three roles from one codebase:

- Admin manages accounts, reviews reports, and views staff QR codes.
- Staff generates QR codes, monitors the queue, and updates their profile or settings.
- Students scan a QR code and wait for queue updates.

The app starts in [App.js](App.js), where push notifications are registered and the navigation tree is loaded. From there, [src/navigation/AppNavigator.js](src/navigation/AppNavigator.js) decides which screens to show based on the signed-in user, their role, and the platform.

Firebase is the main data and authentication layer. It handles sign-in, staff approval status, realtime data, push token storage, and logout behavior through [firebase.js](firebase.js).

The password reset flow runs through the Node server in [server/index.js](server/index.js), which supports SMTP checks and reset-related backend logic.

Shared visual styling lives in [src/theme/index.js](src/theme/index.js), which keeps colors, spacing, and typography consistent across admin, staff, and student screens.

## Quick Start

Run the app from the project root:

## ADB Utilities
These are only needed for Android device pairing or `adb reverse` troubleshooting:

```bash
adb pair IP:PORT
adb connect IP:5555
adb devices
adb disconnect
adb kill-server
adb start-server
```

```bash
cd C:\queueless-appdev
npx expo start --web
```

## Password Reset Server

The backend lives in `server/` and is normally started through the root script:

```bash
cd C:\queueless-appdev
npm run server:start
```

If you need to run it directly from the server folder:

```bash
cd C:\queueless-appdev\server
npm start
```

## Notes

- Keep shared components in `src/` to avoid platform-specific bundling issues.
- When adding web-only or native-only logic, prefer platform-specific files such as `Component.web.js` and `Component.js`.