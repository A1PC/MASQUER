import type { JSX } from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Modal,
  Select,
  Slider,
  Switch,
  useToast,
} from '@/components/ui';
import { usePrefsStore, effectivePrefs } from '@/store/prefsStore';
import { useNextDailyEligibleAt, useWalletStore } from '@/store/walletStore';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';
import { useSound } from '@/systems/sound/useSound';
import { clearHistory, deleteAccount } from '@/systems/account';
import { WALLET_CONFIG } from '@/systems/wallet';
import type { Prefs } from '@/db';

/**
 * Settings: sound (master + volume + category mutes), motion (system/full/
 * reduced), and account utilities (clear play history behind a confirm Modal,
 * plus a read-only daily-top-up line). Built entirely from #1 Velvet Deco
 * primitives; every control is labelled and reduced-motion is handled by the
 * primitives themselves. Destructive actions sit apart and require confirmation.
 */
export default function SettingsPage(): JSX.Element {
  const user = useCurrentUser();
  const prefs = effectivePrefs(usePrefsStore((s) => s.prefs));
  const update = usePrefsStore((s) => s.update);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl tracking-[0.18em] text-gold-bright">Settings</h1>
      <div className="flex flex-col gap-6">
        <SoundCard prefs={prefs} update={update} />
        <MotionCard prefs={prefs} update={update} />
        <AccountCard userId={user?.id ?? null} />
      </div>
    </div>
  );
}

type UpdateFn = (patch: Partial<Omit<Prefs, 'userId'>>) => Promise<void>;

/** A labelled row: a label + helper on the left, the control on the right. */
function SettingRow({
  htmlFor,
  label,
  helper,
  children,
}: {
  htmlFor: string;
  label: string;
  helper?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="font-body text-sm text-ivory">
          {label}
        </label>
        {helper ? <p className="mt-0.5 font-body text-xs text-ivory/55">{helper}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SoundCard({ prefs, update }: { prefs: Prefs; update: UpdateFn }): JSX.Element {
  const { play } = useSound();
  const masterId = useId();
  const volumeId = useId();
  const uiId = useId();
  const gameId = useId();
  const ambienceId = useId();
  const off = !prefs.soundEnabled;
  const volumePct = Math.round(prefs.masterVolume * 100);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Icon name="Volume2" size={18} />
        Sound
      </CardHeader>
      <CardBody className="divide-y divide-brass/15">
        <SettingRow htmlFor={masterId} label="Sound effects" helper="Master switch for all audio.">
          <Switch
            id={masterId}
            checked={prefs.soundEnabled}
            onCheckedChange={(checked) => void update({ soundEnabled: checked })}
          />
        </SettingRow>

        <SettingRow
          htmlFor={volumeId}
          label="Master volume"
          helper={off ? 'Enable sound to adjust the volume.' : `${volumePct}%`}
        >
          <Slider
            id={volumeId}
            className="w-40"
            min={0}
            max={100}
            step={1}
            disabled={off}
            value={[volumePct]}
            aria-label="Master volume"
            aria-valuetext={`${volumePct} percent`}
            onValueChange={([v]) => {
              if (v === undefined) return;
              void update({ masterVolume: v / 100 });
              play('ui.click');
            }}
          />
        </SettingRow>

        <SettingRow htmlFor={uiId} label="UI sounds" helper="Clicks, toggles, and alerts.">
          <Switch
            id={uiId}
            disabled={off}
            checked={!prefs.muteUi}
            onCheckedChange={(checked) => void update({ muteUi: !checked })}
          />
        </SettingRow>

        <SettingRow htmlFor={gameId} label="Game sounds" helper="Chips, cards, dice, and wins.">
          <Switch
            id={gameId}
            disabled={off}
            checked={!prefs.muteGame}
            onCheckedChange={(checked) => void update({ muteGame: !checked })}
          />
        </SettingRow>

        <SettingRow htmlFor={ambienceId} label="Ambience" helper="Low background lounge loop.">
          <Switch
            id={ambienceId}
            disabled={off}
            checked={!prefs.muteAmbience}
            onCheckedChange={(checked) => void update({ muteAmbience: !checked })}
          />
        </SettingRow>
      </CardBody>
    </Card>
  );
}

const MOTION_OPTIONS: { value: Prefs['motionPref']; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'full', label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
];

function MotionCard({ prefs, update }: { prefs: Prefs; update: UpdateFn }): JSX.Element {
  const motionId = useId();
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Icon name="Sparkles" size={18} />
        Motion
      </CardHeader>
      <CardBody>
        <SettingRow
          htmlFor={motionId}
          label="Animations"
          helper="“System” follows your operating system's reduced-motion setting."
        >
          <Select
            value={prefs.motionPref}
            onValueChange={(value) => void update({ motionPref: value as Prefs['motionPref'] })}
          >
            <Select.Trigger id={motionId} className="w-40" aria-label="Motion preference">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {MOTION_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </SettingRow>
      </CardBody>
    </Card>
  );
}

function AccountCard({ userId }: { userId: string | null }): JSX.Element {
  const { toast } = useToast();
  const nextDailyAt = useNextDailyEligibleAt();
  const navigate = useNavigate();
  const logout = useSessionStore((s) => s.logout);
  const clearWallet = useWalletStore((s) => s.clear);
  const clearPrefs = usePrefsStore((s) => s.clear);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClear = async (): Promise<void> => {
    if (!userId) return;
    setClearing(true);
    try {
      await clearHistory(userId);
      toast({
        title: 'Play history cleared',
        description: 'Your past rounds were removed. Stats and leaderboards will update.',
        tone: 'info',
      });
    } finally {
      setClearing(false);
      setConfirmOpen(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteAccount(userId);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
    // Reuse the logout flow: clear session + wallet + prefs, then exit to login.
    await logout();
    clearWallet();
    clearPrefs();
    void navigate('/login', { replace: true });
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Icon name="User" size={18} />
        Account
      </CardHeader>
      <CardBody>
        <SettingRow
          htmlFor="daily-topup"
          label="Daily top-up"
          helper={`Claim +${WALLET_CONFIG.DAILY_CLAIM_AMOUNT} chips once every 24 hours.`}
        >
          <span
            id="daily-topup"
            className="font-mono text-xs tabular-nums text-ivory/70"
            data-testid="daily-topup-status"
          >
            {formatNextDaily(nextDailyAt)}
          </span>
        </SettingRow>

        <div className="mt-3 border-t border-brass/15 pt-4">
          <p className="mb-2 font-body text-sm text-ivory">Clear play history</p>
          <p className="mb-3 font-body text-xs text-ivory/55">
            Permanently delete every recorded round for this account. Your chips and profile are
            kept. This cannot be undone.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-chip-loss hover:text-chip-loss"
            onClick={() => setConfirmOpen(true)}
            disabled={!userId}
          >
            Clear play history
          </Button>
        </div>

        <Modal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Clear play history?"
          description="This permanently deletes all of your recorded rounds. Your chip balance and profile are not affected. This cannot be undone."
        >
          <div className="mt-4 flex justify-end gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={() => void handleClear()}
            >
              Clear history
            </Button>
          </div>
        </Modal>

        <div className="mt-5 rounded-lg border-2 border-casino-red/60 bg-casino-red/5 p-4">
          <p className="mb-2 font-display text-xs uppercase tracking-[0.18em] text-casino-red">
            Danger zone
          </p>
          <p className="mb-3 font-body text-xs text-ivory/70">
            Permanently delete your account and all of your data — balance, play history, sessions,
            and lottery entries. This cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={!userId}
          >
            Delete account
          </Button>
        </div>

        <Modal
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete account?"
          description="This permanently deletes your account and all of your data — balance, play history, sessions, and lottery entries. This cannot be undone."
        >
          <div className="mt-4 flex justify-end gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={() => void handleDeleteAccount()}
            >
              Delete forever
            </Button>
          </div>
        </Modal>
      </CardBody>
    </Card>
  );
}

/** Render the daily-top-up status: "Available now" or the next eligible time. */
function formatNextDaily(nextEligibleAt: number | null): string {
  if (nextEligibleAt === null || nextEligibleAt <= Date.now()) return 'Available now';
  return `Next at ${new Date(nextEligibleAt).toLocaleString()}`;
}
