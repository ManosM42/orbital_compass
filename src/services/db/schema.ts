/**
 * Forward-looking persistence contracts.
 *
 * ORBITAL currently stores favourites and the observer location in the
 * browser. These types describe the account-backed shape the app will move to
 * when Lovable Cloud is enabled: one row per user record, favourites keyed by
 * NORAD catalog id so nothing has to be migrated.
 *
 * Nothing here is wired to a backend yet — it is the contract the local
 * storage layer already conforms to.
 */

export interface UserProfile {
  id: string;
  displayName: string | null;
  createdAt: string;
}

export interface FavoriteSatelliteRow {
  id: string;
  userId: string;
  /** NORAD catalog id — the stable cross-provider identifier. */
  noradId: number;
  createdAt: string;
}

export interface SavedLocationRow {
  id: string;
  userId: string;
  label: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  isDefault: boolean;
  createdAt: string;
}

export type AlertChannel = "push" | "email";

export interface PassAlertRow {
  id: string;
  userId: string;
  noradId: number;
  locationId: string;
  /** only notify for passes reaching at least this elevation. */
  minElevationDeg: number;
  /** only notify when the pass should be visible to the naked eye. */
  visibleOnly: boolean;
  leadTimeMin: number;
  channels: AlertChannel[];
  enabled: boolean;
  createdAt: string;
}

export type SubscriptionTier = "observer" | "navigator" | "mission";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface SubscriptionRow {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  createdAt: string;
}

/** Local-storage shape used today, matching the future row shapes. */
export interface LocalUserState {
  favorites: number[];
  observer: {
    name: string;
    latitude: number;
    longitude: number;
    altitudeM: number;
  } | null;
}
