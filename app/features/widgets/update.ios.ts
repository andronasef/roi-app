import { TORTURE_FIXTURES, toArabicDigits } from '@roi/shared';

import RoiSpike from './ios/RoiSpike';

const PS23_1 = TORTURE_FIXTURES.find((fixture) => fixture.id === 'ps23-1') ?? TORTURE_FIXTURES[0];

/** Push a fresh verse and Arabic-Indic counter snapshot to the iOS RoiSpike widget. */
export async function pushSpikeWidget(count: number): Promise<void> {
  RoiSpike.updateSnapshot({
    verse: PS23_1.text,
    count: toArabicDigits(count),
  });
}
