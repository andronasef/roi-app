import { useState } from 'react';

import { HomeScreen } from '@/features/home/HomeScreen';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { getOnboardingCompleted } from '@/services/storage';

export default function IndexRoute() {
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() =>
    getOnboardingCompleted(),
  );

  if (!onboardingDone) {
    return <OnboardingFlow onComplete={() => setOnboardingDone(true)} />;
  }

  return <HomeScreen />;
}
