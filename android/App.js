import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import useAuthStore from './src/stores/authStore';
import useBookingStore from './src/stores/bookingStore';
import useServiceStore from './src/stores/serviceStore';
import usePartnerStore from './src/stores/partnerStore';
import useUserStore from './src/stores/userStore';
import useThemeStore from './src/stores/themeStore';
import HomeScreen from './src/screens/HomeScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileDetailsScreen from './src/screens/ProfileDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ServicesScreen from './src/screens/ServicesScreen';

import BookingScreen from './src/screens/BookingScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import ChatScreen from './src/screens/ChatScreen';
import PartnerDashboardScreen from './src/screens/partner/PartnerDashboardScreen';
import PartnerEarningsScreen from './src/screens/partner/PartnerEarningsScreen';
import PartnerProfileScreen from './src/screens/partner/PartnerProfileScreen';
import SavedAddressesScreen from './src/screens/SavedAddressesScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SupportScreen from './src/screens/SupportScreen';
import ReferralsScreen from './src/screens/ReferralsScreen';
import ThemeScreen from './src/screens/ThemeScreen';
import { useTheme } from './src/theme';
import GlobalNotificationManager from './src/components/GlobalNotificationManager';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function CustomerTabs() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          elevation: 25,
          zIndex: 9999,
          shadowColor: isDark ? '#000000' : 'rgba(0, 0, 0, 0.08)',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-variant';
          else if (route.name === 'Explore') iconName = 'compass';
          else if (route.name === 'Bookings') iconName = 'calendar-blank';
          else if (route.name === 'Profile') iconName = 'account-circle';
          return <MaterialCommunityIcons name={iconName} size={size + 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ServicesScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Profile" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function PartnerTabs() {
  const { colors, isDark } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#ffffff' : '#000000',
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'Earnings') iconName = 'cash-multiple';
          else if (route.name === 'Settings') iconName = 'cog-outline';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={PartnerDashboardScreen} />
      <Tab.Screen name="Earnings" component={PartnerEarningsScreen} />
      <Tab.Screen name="Settings" component={PartnerProfileScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}


function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Referrals" component={ReferralsScreen} />
      <Stack.Screen name="Theme" component={ThemeScreen} />
    </Stack.Navigator>
  );
}

function PartnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PartnerTabs" component={PartnerTabs} />
    </Stack.Navigator>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const initTheme = useThemeStore((s) => s.initTheme);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    initTheme();
    restoreSession();
  }, [initTheme, restoreSession]);

  useEffect(() => {
    // Request notification permission asynchronously in the background so it does not block app startup
    Notifications.requestPermissionsAsync().catch((err) => {
      console.log('Background notification request error:', err);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      useBookingStore.getState().clear();
      useServiceStore.getState().clear();
      usePartnerStore.getState().clear();
      useUserStore.getState().clearProfile();
    }
  }, [user]);

  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const navigationTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: isDark ? '#ffffff' : '#000000',
      background: colors.background,
      card: colors.card,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer key={user ? `${user.role}-${user.id}` : 'guest'} theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            user.role === 'partner' ? (
              <Stack.Screen name="Partner" component={PartnerStack} />
            ) : (
              <Stack.Screen name="Customer" component={CustomerStack} />
            )
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GlobalNotificationManager />
    </SafeAreaProvider>
  );
}