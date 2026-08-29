import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Shield, Award, Eye, Zap, LogOut, User as UserIcon, Edit3, Check, X, Camera, CreditCard, Loader2 } from "lucide-react";
import { profileService, type UserProfile, type UserPreferences } from "@/services/profile/profileService";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { checkoutService } from "@/services/subscription/checkoutService";
import { PageHeader, Stat } from "@/components/Chrome";

export const Route = createFileRoute("/profile")({
  component: ProfileRouteComponent,
});

function ProfileRouteComponent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      await checkoutService.redirectToBillingPortal();
    } catch (err: any) {
      setPortalLoading(false);
      setPortalError(err.message ?? "Could not open billing portal.");
    }
  };

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
      return;
    }

    if (user) {
      profileService
        .getSecureProfile()
        .then((res) => {
          setProfile(res.profile);
          setEmail(res.email);
          if (res.profile) {
            setDisplayName(res.profile.display_name || "");
            setBio(res.profile.bio || "");
            setPreferences(res.profile.preferences || {});
            setAvatarPreview(res.profile.avatar_url);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setError("Avatar file size must be less than 2MB.");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        avatarUrl = await profileService.uploadAvatar(avatarFile);
      }

      await profileService.updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        preferences,
      });

      // Refresh local profile
      const updated = await profileService.getSecureProfile();
      setProfile(updated.profile);
      if (updated.profile) {
        setAvatarPreview(updated.profile.avatar_url);
      }

      setIsEditing(false);
      setSuccessMessage("Profile parameters updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground animate-pulse">
          <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
          Authenticating secure telemetry feed...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Secure Telemetry Feed"
        title="Commander Profile"
        description="Encrypted telemetry and orbital clearance credentials."
      />

      {error && (
        <div className="mt-6 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-primary/50 bg-primary/10 p-4 font-mono text-xs text-primary">
          {successMessage}
        </div>
      )}

      {profile && (
        <div className="mt-8 grid gap-6">
          {/* Main ID Card */}
          <div className="panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
            {!isEditing ? (
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-secondary/80 text-foreground shadow-inner">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-primary/20 py-0.5 text-center font-mono text-[9px] uppercase text-primary">
                      LVL {profile.level}
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      {profile.display_name || "Orbital Commander"}
                    </h2>
                    <p className="font-mono text-xs text-muted-foreground">{email}</p>
                    {profile.bio && (
                      <p className="mt-2 text-sm text-muted-foreground max-w-md">{profile.bio}</p>
                    )}
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary border border-primary/25">
                      <Shield className="h-3 w-3" />
                      Clearance: Verified Operator
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => signOut().then(() => navigate({ to: "/" }))}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h3 className="font-display text-lg font-bold text-foreground">Edit Commander Parameters</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/80">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                      <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">Click to change avatar</span>
                  </div>

                  {/* Form Fields */}
                  <div className="sm:col-span-2 space-y-4">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={50}
                        className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Orbital Commander"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Commander Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={200}
                        rows={2}
                        className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Brief telemetry operator summary..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Units Preference
                        </label>
                        <select
                          value={preferences.units || "metric"}
                          onChange={(e) =>
                            setPreferences({ ...preferences, units: e.target.value as "metric" | "imperial" })
                          }
                          className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="metric">Metric (km, m/s)</option>
                          <option value="imperial">Imperial (mi, mph)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Notifications
                        </label>
                        <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.notificationsEnabled ?? true}
                            onChange={(e) =>
                              setPreferences({ ...preferences, notificationsEnabled: e.target.checked })
                            }
                            className="rounded border-border bg-secondary/40 text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-sm text-foreground">Pass alerts enabled</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Orbital Level"
              value={`Level ${profile.level}`}
              hint={`${profile.xp} XP Accumulated`}
            />
            <Stat
              label="Logged Sightings"
              value={profile.sightings_count.toString()}
              hint="Verified satellite passes"
            />
            <Stat
              label="Unlocked Badges"
              value={profile.badges.length.toString()}
              hint="Achievements unlocked"
            />
            <Stat
              label="Active Plan"
              value={(subscription?.plan?.name ?? "Explorer").toUpperCase()}
              hint={
                subLoading
                  ? "Loading…"
                  : subscription?.cancel_at_period_end
                    ? "Cancels at period end"
                    : "Encrypted telemetries unlocked"
              }
            />
          </div>

          {/* Subscription / Billing */}
          <div className="panel rounded-3xl p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Subscription & Billing
            </h3>

            {portalError && (
              <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                {portalError}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-foreground font-semibold">
                  {subscription?.plan?.name ?? "Explorer"} plan
                  <span className="ml-2 text-xs font-normal text-muted-foreground uppercase">
                    {subscription?.status ?? "active"}
                  </span>
                </p>
                {subscription?.current_period_end && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subscription.cancel_at_period_end ? "Access ends" : "Renews"} on{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {subscription?.stripe_customer_id ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    {portalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Manage / Cancel Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => navigate({ to: "/pricing" })}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                  >
                    Upgrade Plan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="panel rounded-3xl p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Orbital Badges & Achievements
            </h3>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {profile.badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="font-medium text-sm text-foreground">{badge.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}