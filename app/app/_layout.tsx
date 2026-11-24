import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import migrations from '@/drizzle/migrations';
import { db } from '@/features/db/client';
import ar from '@/locales/ar.json';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{ar.migrationError}</Text>
      </View>
    );
  }

  if (!success) {
    return <View style={styles.pending} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  pending: {
    flex: 1,
    backgroundColor: '#FAF6EC',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FAF6EC',
  },
  errorText: {
    fontSize: 16,
    color: '#2B2620',
    textAlign: 'center',
  },
});
