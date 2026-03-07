import { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getToken, getMe, logout } from '../../services/auth';

export default function TabLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        const user = await getMe();
        setIsAuthenticated(!!user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (typeof global !== 'undefined') {
    global.__ipoPipelineRefreshAuth = checkAuth;
    global.__ipoPipelineLogout = async () => {
      await logout();
      setIsAuthenticated(false);
    };
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pipeline',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="rocket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="eye-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ipo-detail"
        options={{ href: null, title: 'IPO Detail' }}
      />
      <Tabs.Screen
        name="login"
        options={{ href: null }}
      />
    </Tabs>
  );
}
