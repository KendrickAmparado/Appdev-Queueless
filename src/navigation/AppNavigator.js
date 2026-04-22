import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import Constants from 'expo-constants';

import AdminOverviewScreen from '../../Admin/screens/AdminOverviewScreen';
import PendingAccountsScreen from '../../Admin/screens/PendingAccountsScreen';
import ReportsScreen from '../../Admin/screens/ReportsScreen';
import StaffQrCodesScreen from '../../Admin/screens/StaffQrCodesScreen';
import GenerateQrScreen from '../../Staff/screens/GenerateQrScreen';
import QueueListScreen from '../../Staff/screens/QueueListScreen';
import SettingsScreen from '../../Staff/screens/SettingsScreen';
import StaffQrCodeScreen from '../../Staff/screens/StaffQrCodeScreen';
import ProfileScreen from '../../Staff/screens/ProfileScreen';
import AwaitingApprovalScreen from '../../Staff/screens/AwaitingApprovalScreen';
import { colors } from '../theme';
import { ADMIN_EMAIL, auth, logoutCurrentUser, watchStaffProfile } from '../../firebase';
import AdminLoginScreen from '../../Admin/screens/Login/AdminLoginScreen';
import AdminWelcomeScreen from '../../Admin/screens/Login/AdminWelcomeScreen';
import StaffLoginScreen from '../../Staff/screens/Login/StaffLoginScreen';
import StaffRegisterScreen from '../../Staff/screens/Login/StaffRegisterScreen';
import StaffWelcomeScreen from '../../Staff/screens/Login/StaffWelcomeScreen';
import StudentScanScreen from '../../Student/screens/StudentScanScreen';
import StudentWaitingScreen from '../../Student/screens/StudentWaitingScreen';

const Stack = createNativeStackNavigator();
const AdminTab = createBottomTabNavigator();
const StaffTab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.secondary,
  },
};

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

const qrWebOrigin = (() => {
  const envOrigin = String(process.env.EXPO_PUBLIC_QR_WEB_ORIGIN || '').trim();
  if (envOrigin) return envOrigin.replace(/\/$/, '');

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
})();

const linking = {
  prefixes: ['queueless://', qrWebOrigin],
  config: {
    screens: {
      StudentScan: {
        path: 'join',
        parse: {
          uid: (value) => String(value || ''),
          qrId: (value) => String(value || ''),
          label: (value) => String(value || ''),
        },
      },
      StudentWaiting: 'student/waiting',
    },
  },
};

function AdminLogoutPlaceholderScreen() {
  return null;
}

function AdminTabs() {
  return (
    <AdminTab.Navigator screenOptions={tabStyles}>
      <AdminTab.Screen
        name="Overview"
        component={AdminOverviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="chart-pie" size={size} color={color} solid />
          ),
        }}
      />
      <AdminTab.Screen
        name="Pending"
        component={PendingAccountsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="user-check" size={size} color={color} solid />
          ),
        }}
      />
      <AdminTab.Screen
        name="Staff QR"
        component={StaffQrCodesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="qrcode" size={size} color={color} solid />
          ),
        }}
      />
      <AdminTab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="chart-line" size={size} color={color} solid />
          ),
        }}
      />
      <AdminTab.Screen
        name="Logout"
        component={AdminLogoutPlaceholderScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="sign-out-alt" size={size} color={color} solid />
          ),
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            logoutCurrentUser().catch((error) => {
              Alert.alert('Logout failed', error?.message || 'Unable to log out right now.');
            });
          },
        }}
      />
    </AdminTab.Navigator>
  );
}

function StaffTabs() {
  return (
    <StaffTab.Navigator screenOptions={tabStyles}>
      <StaffTab.Screen
        name="Generate"
        component={GenerateQrScreen}
        options={{
          title: 'Generate QR',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="plus-square" size={size} color={color} solid />
          ),
        }}
      />
      <StaffTab.Screen
        name="Queue"
        component={QueueListScreen}
        options={{
          title: 'Queue List',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="list-ol" size={size} color={color} solid />
          ),
        }}
      />
      <StaffTab.Screen
        name="QR Code"
        component={StaffQrCodeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="qrcode" size={size} color={color} solid />
          ),
        }}
      />
      <StaffTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="cog" size={size} color={color} solid />
          ),
        }}
      />
      <StaffTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="user-circle" size={size} color={color} solid />
          ),
        }}
      />
    </StaffTab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loadingStaffProfile, setLoadingStaffProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoadingAuth(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || user?.email === ADMIN_EMAIL) {
      setStaffProfile(null);
      setLoadingStaffProfile(false);
      return undefined;
    }

    setLoadingStaffProfile(true);
    const unsubscribe = watchStaffProfile(user.uid, (nextProfile) => {
      setStaffProfile(nextProfile);
      if (nextProfile?.status === 'disabled') {
        Alert.alert('Account Disabled', 'Your account has been disabled by an administrator.', [
          {
            text: 'OK',
          },
        ]);
        // Delay logout slightly to allow UI to finish rendering and avoid
        // immediate large realtime DB writes causing jank on other clients.
        setTimeout(() => logoutCurrentUser().catch(() => {}), 700);
      }
      setLoadingStaffProfile(false);
    });

    return unsubscribe;
  }, [user]);

  if (loadingAuth || (Platform.OS === 'android' && user && user?.email !== ADMIN_EMAIL && loadingStaffProfile)) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.text}>Checking session...</Text>
      </View>
    );
  }

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      {isWeb ? (
        <Stack.Navigator initialRouteName="AdminWelcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="StudentScan" component={StudentScanScreen} />
          <Stack.Screen name="StudentWaiting" component={StudentWaitingScreen} />
          <Stack.Screen name="AdminWelcome" component={AdminWelcomeScreen} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
          {isAdmin ? <Stack.Screen name="AdminTabs" component={AdminTabs} /> : null}
        </Stack.Navigator>
      ) : isAndroid ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="StaffWelcome" component={StaffWelcomeScreen} />
              <Stack.Screen name="StaffLogin" component={StaffLoginScreen} />
              <Stack.Screen name="StaffRegister" component={StaffRegisterScreen} />
              <Stack.Screen name="StudentScan" component={StudentScanScreen} />
              <Stack.Screen name="StudentWaiting" component={StudentWaitingScreen} />
            </>
          ) : staffProfile?.status === 'approved' || staffProfile?.approved === true ? (
            <>
              <Stack.Screen name="StaffTabs" component={StaffTabs} />
              <Stack.Screen name="StudentScan" component={StudentScanScreen} />
              <Stack.Screen name="StudentWaiting" component={StudentWaitingScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="AwaitingApproval" component={AwaitingApprovalScreen} />
              <Stack.Screen name="StudentScan" component={StudentScanScreen} />
              <Stack.Screen name="StudentWaiting" component={StudentWaitingScreen} />
            </>
          )}
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Unsupported" component={UnsupportedPlatformScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

function UnsupportedPlatformScreen() {
  return (
    <View style={unsupportedStyles.container}>
      <Text style={unsupportedStyles.title}>Platform Not Assigned</Text>
      <Text style={unsupportedStyles.subtitle}>Admin is available on Web. Staff is available on Android.</Text>
    </View>
  );
}

const tabStyles = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.ink500,
  tabBarStyle:
    Platform.OS === 'web'
      ? {
          position: 'relative',
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
          height: 68,
          borderTopWidth: 0,
          borderRadius: 18,
          backgroundColor: colors.cardStrong,
          shadowColor: '#0A1633',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 20,
          elevation: 6,
        }
      : {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 76,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundColor: colors.cardStrong,
          shadowColor: '#0A1633',
          shadowOpacity: 0.11,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 12,
          elevation: 8,
        },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  tabBarIconStyle: {
    marginTop: 8,
  },
};

const unsupportedStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink900,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: colors.ink500,
    lineHeight: 22,
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  text: {
    fontSize: 15,
    color: colors.ink700,
    fontWeight: '600',
  },
});
