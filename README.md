# QUEUELESS APP

Single Expo app with role-based folders kept separate for navigation clarity.

## Structure

- `Admin/` admin-specific flows
- `Staff/` staff-specific flows
- `Student/` student-specific flows
- `src/` shared app code
- `assets/` images and static files
- `server/` password reset backend

## Run The App

```bash
cd C:\queueless-appdev
npm run web
```

Use Expo tunnel when the phone is not on the same Wi-Fi:

```bash
npm run start:tunnel
```

## Run The Reset Server

```bash
cd C:\queueless-appdev
npm run server:start
```

If the service dependencies are missing:

```bash
npm run server:install
```

## Staff Dev Client

```bash
cd C:\queueless-appdev\Staff
npm run start:tunnel
```

## Optional ADB Commands

Only needed for `expo run:android` or `adb reverse`.

```bash
adb pair IP:PORT
adb connect IP:5555
adb devices
adb disconnect
adb kill-server
adb start-server
```

## Run SMTP Server (Password Reset)

```bash
cd server
npm run server:start
```

To stop the background server:

```bash
taskkill /F /IM node.exe

 
```
Run again 

```bash
npm start

 
```