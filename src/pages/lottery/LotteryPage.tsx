import type { JSX } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { buyTicket, evaluateLine, LINE_COST, MAIN_PICKS } from '@/systems/lottery';
import NumberGrid from './NumberGrid';
import TicketCart from './TicketCart';
import FavoritesDropdown from './FavoritesDropdown';
import { useLotteryCart } from './useLotteryCart';
import DrawAnimationModal, { type PurchaseRevealLine } from './DrawAnimationModal';
import HeroSection from './HeroSection';
import { useLotteryBackfill } from './useLotteryBackfill';
import HistorySlide from './HistorySlide';
import YourTicketsSlide from './YourTicketsSlide';
import LotteryRules from './LotteryRules';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
import RulesButton from '@/games/_shared/RulesButton';
import RulesModal from '@/games/_shared/RulesModal';
import { db } from '@/db';
import type { LotteryDraw, LotteryLine } from '@/db';
import { useSound } from '@/systems/sound/useSound';

/**
 * LotteryPage — MASQUER · Lottery (Phase 15 #9 reskin).
 *
 * Manually retrofits the shared shell (no `GameShell` wrapper — lottery is a
 * top-level page per ADR-0040, not a games-sandbox citizen). LobbyButton
 * sits top-left, OddsInfoBox top-right, Rules button bottom-left opening
 * the shared `RulesModal`. Pick-6+1 with the new UK National Lottery payout
 * table; ticket cost 5 chips per line.
 *
 * Sound wiring (spec §4.5):
 *  - `chip.place` on each successful ticket purchase commit.
 *  - `ball.drop` per ball is fired from `HeroSection` + `DrawAnimationModal`.
 *  - Win-tier stingers (`win.jackpot/.medium/.small`) on draw settle gated
 *    on the highest tier in the freshly settled draws. `loss` fires when
 *    the user had tickets but no tier hit. `'2'` (match-2 free re-entry)
 *    is intentionally silent — the value is the next-draw entry.
 */
export default function LotteryPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const cart = useLotteryCart();
  const { play } = useSound();
  const [mainSelected, setMainSelected] = useState<number[]>([]);
  const [bonusSelected, setBonusSelected] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [revealLines, setRevealLines] = useState<PurchaseRevealLine[] | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const { freshDraws } = useLotteryBackfill();
  const [drawModalDraws, setDrawModalDraws] = useState<
    Array<{ draw: LotteryDraw; userLines: LotteryLine[] }>
  >([]);

  // Enrich fresh draws with the user's lines so the modal can show per-line
  // tier badges. Also gates the win-tier stinger sound.
  useEffect(() => {
    if (freshDraws.length === 0) return;
    if (!user) return;
    const userId = user.id;
    void (async () => {
      const enriched = await Promise.all(
        freshDraws.map(async (d) => {
          const userLines = await db.lotteryLines
            .where('[userId+drawId]')
            .equals([userId, d.id])
            .toArray();
          return { draw: d, userLines };
        }),
      );
      setDrawModalDraws(enriched);
      // `settleMissedDraws` calls `wallet.settleRound` directly (not via the
      // store wrapper), so any payouts went to Dexie but the Zustand store
      // still shows the pre-payout balance. Re-hydrate so winnings show up.
      await useWalletStore.getState().hydrate(userId);
      // Sound: scan the freshly settled draws for the best tier and fire one
      // matching stinger. `'2'` (free re-entry) is intentionally silent.
      let bestRank = 0;
      for (const { draw, userLines } of enriched) {
        for (const line of userLines) {
          const tier = evaluateLine(line, { mainNumbers: draw.mainNumbers, bonus: draw.bonus });
          const rank = tierRank(tier);
          if (rank > bestRank) bestRank = rank;
        }
      }
      if (bestRank >= 4)
        play('win.jackpot'); // 6 or 5+bonus
      else if (bestRank === 3)
        play('win.medium'); // 5
      else if (bestRank >= 1)
        play('win.small'); // 4 or 3
      else {
        // bestRank === 0 means either no tickets, only '2' tickets, or only
        // null tier. Fire `loss` only if the user had tickets but every line
        // missed (no tier at all).
        const hadAnyLine = enriched.some((d) => d.userLines.length > 0);
        const allMissed =
          hadAnyLine &&
          enriched.every((d) =>
            d.userLines.every(
              (l) =>
                evaluateLine(l, { mainNumbers: d.draw.mainNumbers, bonus: d.draw.bonus }) === null,
            ),
          );
        if (allMissed) play('loss');
      }
    })();
  }, [freshDraws, user, play]);

  const currentPick = useMemo(
    () =>
      mainSelected.length === MAIN_PICKS && bonusSelected !== null
        ? { mainNumbers: mainSelected, bonusNumber: bonusSelected }
        : null,
    [mainSelected, bonusSelected],
  );

  if (!user) return null;

  function handleMainToggle(n: number): void {
    setMainSelected((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
    setAddError(null);
  }

  function handleAddLine(): void {
    if (!currentPick) {
      setAddError(`Pick ${MAIN_PICKS} main numbers and 1 bonus number first.`);
      return;
    }
    const result = cart.addManual(currentPick);
    if (!result.ok) {
      setAddError(result.error);
    } else {
      setMainSelected([]);
      setBonusSelected(null);
      setAddError(null);
    }
  }

  async function handleBuy(): Promise<void> {
    if (cart.lines.length === 0) return;
    setPurchaseMessage(null);
    const result = await buyTicket({ userId: user!.id, lines: cart.lines });
    if (!result.ok) {
      setPurchaseMessage(
        result.error === 'insufficient-chips' ? 'Not enough chips.' : `Error: ${result.error}`,
      );
      return;
    }
    // `buyTicket` calls `wallet.placeBet` straight through the systems module
    // (not the store wrapper), so Dexie is correct but the displayed balance
    // in the Zustand store is stale. Re-hydrate so the UI reflects the debit.
    await useWalletStore.getState().hydrate(user!.id);
    play('chip.place');
    cart.clear();
    setPurchaseMessage(
      `Bought ticket with ${result.lines.length} line${result.lines.length === 1 ? '' : 's'}.`,
    );
    const luckyDipPresent = result.lines.some((l) => l.isLuckyDip);
    if (luckyDipPresent) {
      setRevealLines(
        result.lines.map((l) => ({
          isLuckyDip: l.isLuckyDip,
          mainNumbers: l.mainNumbers,
          bonusNumber: l.bonusNumber,
        })),
      );
    }
  }

  const totalCost = cart.lines.length * LINE_COST;
  const buyDisabledReason =
    cart.duplicateError ??
    (totalCost > balance ? `Not enough chips (need ${totalCost.toLocaleString()})` : undefined);

  return (
    <div className="flex h-full flex-col bg-felt-table text-ivory">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex w-full items-start justify-between gap-4">
          <div className="flex-shrink-0">
            <LobbyButton />
          </div>
          <h1
            className="min-w-0 flex-1 truncate text-center font-display text-2xl tracking-[0.18em] text-gold-bright"
            title="MASQUER · Lottery"
          >
            MASQUER &middot; Lottery
          </h1>
          <div className="flex-shrink-0">
            <OddsInfoBox>
              <span className="tabular-nums">
                Jackpot 20M &middot; 5+B 1M &middot; 5 1,750 &middot; 4 150 &middot; 3 30 &middot; 2
                free re-entry
              </span>
            </OddsInfoBox>
          </div>
        </header>

        <p className="mb-3 text-right text-xs text-ivory/60">
          Balance:{' '}
          <span className="font-display tabular-nums text-gold-bright">
            {balance.toLocaleString()}
          </span>
        </p>

        <HeroSection userId={user.id} />

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-4 md:col-span-2">
            <NumberGrid
              mainSelected={mainSelected}
              bonusSelected={bonusSelected}
              onMainToggle={handleMainToggle}
              onBonusSelect={(n) => {
                setBonusSelected(n);
                setAddError(null);
              }}
            />
            <FavoritesDropdown
              userId={user.id}
              currentPick={currentPick}
              onLoad={(fav) => {
                setMainSelected(fav.mainNumbers);
                setBonusSelected(fav.bonusNumber);
                setAddError(null);
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddLine}
                className="min-h-[44px] flex-1 rounded-md border border-brass bg-felt-table-deep py-2 font-display text-xs tracking-[0.18em] text-gold-bright hover:bg-velvet-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                ADD LINE
              </button>
              <button
                type="button"
                onClick={cart.addLuckyDip}
                className="min-h-[44px] flex-1 rounded-md border border-brass bg-felt-table-deep py-2 font-display text-xs tracking-[0.18em] text-gold-bright hover:bg-velvet-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                ADD LUCKY DIP
              </button>
            </div>
            {addError && <p className="text-xs text-state-loss">{addError}</p>}
            {purchaseMessage && <p className="text-xs text-state-win">{purchaseMessage}</p>}
          </div>
          <div>
            <TicketCart
              lines={cart.lines}
              lineCost={LINE_COST}
              onRemoveLine={cart.removeLine}
              onBuy={() => void handleBuy()}
              {...(buyDisabledReason !== undefined ? { buyDisabled: true, buyDisabledReason } : {})}
            />
          </div>
        </section>

        <div className="mt-6">
          <YourTicketsSlide userId={user.id} />
        </div>

        <div className="mt-6">
          <HistorySlide userId={user.id} />
        </div>

        <DrawAnimationModal
          mode="purchase"
          open={revealLines !== null}
          lines={revealLines ?? []}
          onClose={() => setRevealLines(null)}
        />
        <DrawAnimationModal
          mode="draw"
          open={drawModalDraws.length > 0}
          draws={drawModalDraws}
          onClose={() => setDrawModalDraws([])}
        />

        <RulesButton onClick={() => setRulesOpen(true)} />
        <RulesModal open={rulesOpen} title="MASQUER · Lottery" onClose={() => setRulesOpen(false)}>
          <LotteryRules />
        </RulesModal>
      </main>
    </div>
  );
}

/** Map a tier to a numeric rank used to pick the highest-value win stinger. */
function tierRank(tier: ReturnType<typeof evaluateLine>): number {
  switch (tier) {
    case '6':
      return 5;
    case '5+bonus':
      return 4;
    case '5':
      return 3;
    case '4':
      return 2;
    case '3':
      return 1;
    case '2':
    case null:
      return 0;
  }
}
