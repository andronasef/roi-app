import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { db, deviceClock } from '../db/client';
import {
  IMPLEMENTED_HOME_TOOLS,
  moveHomeTile,
  readHomeTiles,
  readUserProfile,
  saveHomeTiles,
  saveUserProfile,
  toggleHomeTileVisibility,
  type HomeTileConfig,
  type HomeToolId,
  type ToggleHomeTileResult,
  type UserProfile,
} from './repository';

export interface ProfileContextValue {
  profile: UserProfile;
  tiles: HomeTileConfig[];
  updateProfile: (next: UserProfile) => UserProfile;
  updateTiles: (next: readonly HomeTileConfig[]) => HomeTileConfig[];
  toggleTile: (toolId: HomeToolId) => ToggleHomeTileResult;
  reorderTile: (
    toolId: HomeToolId,
    direction: 'up' | 'down',
    scopeTools?: ReadonlySet<HomeToolId>,
  ) => HomeTileConfig[];
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Provides reactive user profile (name, gender) and Home tile configuration
 * hydrated synchronously from SQLite settings inside ContentGate.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() =>
    readUserProfile(db),
  );
  const [tiles, setTiles] = useState<HomeTileConfig[]>(() =>
    readHomeTiles(db),
  );

  const updateProfile = useCallback((next: UserProfile) => {
    const saved = saveUserProfile(db, deviceClock, next);
    setProfile(saved);
    return saved;
  }, []);

  const updateTiles = useCallback((next: readonly HomeTileConfig[]) => {
    const saved = saveHomeTiles(db, deviceClock, next);
    setTiles(saved);
    return saved;
  }, []);

  const toggleTile = useCallback((toolId: HomeToolId) => {
    const result = toggleHomeTileVisibility(
      db,
      deviceClock,
      toolId,
      IMPLEMENTED_HOME_TOOLS,
    );
    if (result.ok) {
      setTiles(result.tiles);
    }
    return result;
  }, []);

  const reorderTile = useCallback(
    (
      toolId: HomeToolId,
      direction: 'up' | 'down',
      scopeTools: ReadonlySet<HomeToolId> = IMPLEMENTED_HOME_TOOLS,
    ) => {
      const next = moveHomeTile(db, deviceClock, toolId, direction, scopeTools);
      setTiles(next);
      return next;
    },
    [],
  );

  const refreshProfile = useCallback(() => {
    setProfile(readUserProfile(db));
    setTiles(readHomeTiles(db));
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      tiles,
      updateProfile,
      updateTiles,
      toggleTile,
      reorderTile,
      refreshProfile,
    }),
    [
      profile,
      tiles,
      updateProfile,
      updateTiles,
      toggleTile,
      reorderTile,
      refreshProfile,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

/** Access reactive user profile and Home tile actions inside ProfileProvider. */
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}
