# QUEUELESS APP

Single codebase with folder launchers:

- `Admin/` launches the root app in Admin mode workflows (web-friendly).
- `Staff/` launches the root app in Staff mode workflows (android/dev-client friendly).

## One-time setup

Run once from project root:

```bash
cd C:\queueless-appdev
npm install
npx expo install expo-print expo-sharing expo-file-system
```

## Run Admin (from Admin folder)

```bash
cd C:\queueless-appdev\Admin
npm run web
npx expo start --web
```

For Android native rebuild (when needed):

```bash
cd C:\queueless-appdev\Staff
npm run android

```

To pair using wireless debugging

use laptop hotspot

adb pair IP:PORT
adb connect IP:5555
adb devices

```bash


```
✅ 1. Restart ADB completely

Open CMD / Terminal:

adb disconnect
adb kill-server
adb start-server

Then reconnect your device.

```bash
