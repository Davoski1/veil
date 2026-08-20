import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { TabIcon } from '@/components/TabIcon';
import { useTheme } from '../../hooks/useTheme';

/**
 * Bottom tab navigator — primary destinations only.
 *
 * Non-primary screens (swap, vault, agent, etc.) live in the root stack and push
 * over these tabs. Colours come from the theme (Veil gold on near-black), not the
 * legacy ScreenScaffold tokens. The design's raised center-plus tab bar is a
 * follow-up (a custom `tabBar`); this keeps the four primary tabs on-brand.
 */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.4,
          marginBottom: 4,
        },
        tabBarIconStyle: { marginTop: 4 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: 'Send',
          tabBarIcon: ({ color }) => <TabIcon name="send" color={color} />,
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: 'Receive',
          tabBarIcon: ({ color }) => <TabIcon name="receive" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
