import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import {
  Card,
  CardHeader,
  Field,
  Input,
  Button,
  Icon,
  Divider,
  useToast,
  cn,
} from '@/components/ui';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { updateProfile } from '@/systems/auth';
import { db } from '@/db';
import { getUserMetrics, type UserMetrics } from '@/systems/stats';
import { AVATAR_PALETTE } from '@/systems/avatar';
import { formatChips } from '@/lib/formatChips';

interface ProfilePageProps {
  /** When true, the page opens directly in edit mode (the `/profile/edit` route). */
  edit?: boolean;
}

function formatJoined(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** A stat tile with a label + a tabular-numeral value. */
function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-brass/40 bg-base/40 px-3 py-2.5">
      <p className="font-body text-[10px] uppercase tracking-[0.15em] text-ivory/55">{label}</p>
      <p className="mt-1 font-numeral text-lg tabular-nums text-ivory">{value}</p>
    </div>
  );
}

export default function ProfilePage({ edit = false }: ProfilePageProps): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<UserMetrics | null>(null);

  // Draft state for edit mode, seeded once from the current user. The page is
  // re-mounted on the /profile <-> /profile/edit route change, so lazy
  // initializers correctly reset the draft each time edit mode is entered.
  const [draftName, setDraftName] = useState(() => user?.username ?? '');
  const [draftColor, setDraftColor] = useState(() => user?.avatarColor ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    void getUserMetrics(user.id)
      .then((m) => {
        if (!cancelled) setMetrics(m);
      })
      .catch(() => {
        // Metrics are non-critical; ignore (e.g. DB torn down on unmount in tests).
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const refreshCurrentUser = async (): Promise<void> => {
    const fresh = await db.users.get(user.id);
    if (fresh) useSessionStore.setState({ currentUser: fresh });
  };

  const onSave = async (): Promise<void> => {
    setNameError(null);
    const trimmed = draftName.trim();
    if (trimmed.length < 3) {
      setNameError('Username must be at least 3 characters.');
      return;
    }
    setSaving(true);
    const res = await updateProfile(user.id, { username: trimmed, avatarColor: draftColor });
    setSaving(false);
    if (!res.ok) {
      if (res.error === 'username_taken') {
        setNameError('That username is already taken.');
      } else {
        setNameError('Could not save your profile. Please try again.');
      }
      return;
    }
    await refreshCurrentUser();
    toast({ title: 'Profile updated', tone: 'info' });
    await navigate('/profile');
  };

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Card surface="velvet">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 shrink-0 rounded-full border-2 border-brass shadow-gold-glow"
            style={{ backgroundColor: edit ? draftColor || user.avatarColor : user.avatarColor }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl tracking-[0.1em] text-gold">
              {user.username}
            </h1>
            <p className="font-body text-xs text-ivory/60">Joined {formatJoined(user.createdAt)}</p>
          </div>
        </div>

        <Divider className="my-5" />

        {edit ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
            noValidate
            className="space-y-5"
          >
            <CardHeader>Edit profile</CardHeader>

            <Field
              id="profile-username"
              label="Username"
              {...(nameError ? { error: nameError } : {})}
            >
              <Input
                id="profile-username"
                type="text"
                autoComplete="username"
                autoFocus
                state={nameError ? 'error' : 'default'}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </Field>

            <fieldset>
              <legend className="mb-2 font-body text-[10px] uppercase tracking-[0.15em] text-ivory/70">
                Avatar colour
              </legend>
              <RadixRadioGroup.Root
                value={draftColor}
                onValueChange={setDraftColor}
                aria-label="Avatar colour"
                className="flex flex-wrap gap-2.5"
              >
                {AVATAR_PALETTE.map((color) => (
                  <RadixRadioGroup.Item
                    key={color}
                    value={color}
                    aria-label={color}
                    style={{ backgroundColor: color }}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 border-transparent outline-none transition-transform',
                      'focus-visible:ring-2 focus-visible:ring-gold/50 motion-safe:hover:scale-110',
                      'data-[state=checked]:border-gold data-[state=checked]:scale-110',
                    )}
                  >
                    <RadixRadioGroup.Indicator className="flex h-full w-full items-center justify-center">
                      <Icon name="Check" size={16} className="text-[#241702]" />
                    </RadixRadioGroup.Indicator>
                  </RadixRadioGroup.Item>
                ))}
              </RadixRadioGroup.Root>
            </fieldset>

            <div className="flex gap-2.5">
              <Button type="submit" variant="primary" loading={saving}>
                Save changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => void navigate('/profile')}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="Balance" value={formatChips(balance ?? 0)} />
              <Stat label="Rounds" value={formatChips(metrics?.totalRounds ?? 0)} />
              <Stat
                label="Net"
                value={
                  metrics
                    ? `${metrics.netChange >= 0 ? '+' : ''}${formatChips(metrics.netChange)}`
                    : '0'
                }
              />
              <Stat label="Won" value={formatChips(metrics?.totalWon ?? 0)} />
            </div>

            <Button variant="secondary" onClick={() => void navigate('/profile/edit')}>
              <Icon name="Pencil" size={14} /> Edit profile
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
