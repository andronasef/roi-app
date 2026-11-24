import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import migrations from '@/drizzle/migrations';
import { db } from '@/features/db/client';
import { ScriptureSizeProvider } from '@/features/scripture/scripture';
import ar from '@/locales/ar.json';
import { getThemePreference } from '@/services/storage';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    colorScheme.set(getThemePreference());
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-base text-foreground">
          {ar.migrationError}
        </Text>
      </View>
    );
  }

  if (!success) {
    return <View className="flex-1 bg-background" />;
  }

  return (
    <ScriptureSizeProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost />
    </ScriptureSizeProvider>
  );
}
