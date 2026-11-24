import { Redirect, Stack } from 'expo-router';

import { DEV_TOOLS_ENABLED, ROUTES } from '@/constants/app';

export default function DevLayout() {
  if (!DEV_TOOLS_ENABLED) {
    return <Redirect href={ROUTES.home} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
