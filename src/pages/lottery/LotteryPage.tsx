import type { JSX } from 'react';
import { useState } from 'react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { buyTicket } from '@/systems/lottery';
import NumberGrid from './NumberGrid';
import TicketCart from './TicketCart';
import FavoritesDropdown from './FavoritesDropdown';
import { useLotteryCart } from './useLotteryCart';

const LINE_COST = 10;

export default function LotteryPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const cart = useLotteryCart();
  const [mainSelected, setMainSelected] = useState<number[]>([]);
  const [bonusSelected, setBonusSelected] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  if (!user) return null;

  const currentPick =
    mainSelected.length === 5 && bonusSelected !== null
      ? { mainNumbers: mainSelected, bonusNumber: bonusSelected }
      : null;

  function handleMainToggle(n: number): void {
    setMainSelected((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
    setAddError(null);
  }

  function handleAddLine(): void {
    if (!currentPick) {
      setAddError('Pick 5 main numbers and 1 bonus number first.');
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
    cart.clear();
    setPurchaseMessage(
      `Bought ticket with ${result.lines.length} line${result.lines.length === 1 ? '' : 's'}.`,
    );
  }

  const totalCost = cart.lines.length * LINE_COST;
  const buyDisabledReason =
    cart.duplicateError ??
    (totalCost > balance ? `Not enough chips (need ${totalCost.toLocaleString()})` : undefined);

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">DAILY LOTTERY</h1>
          <span className="font-display text-xs text-white/60">
            Balance:{' '}
            <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </span>
        </header>

        <section
          data-hero-placeholder
          className="mb-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          HERO countdown ↔ winning balls — ships in PR D.
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 flex flex-col gap-4">
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
                className="flex-1 rounded-md border border-gold bg-felt-deep py-2 font-display text-xs tracking-wider text-gold-bright hover:bg-gold/10"
              >
                ADD LINE
              </button>
              <button
                type="button"
                disabled
                title="Lucky dip ships in PR C"
                className="flex-1 rounded-md border border-gold/40 bg-felt-deep py-2 font-display text-xs tracking-wider text-white/40"
              >
                ADD LUCKY DIP
              </button>
            </div>
            {addError && <p className="text-xs text-casino-red">{addError}</p>}
            {purchaseMessage && <p className="text-xs text-chip-win">{purchaseMessage}</p>}
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

        <section
          data-history-placeholder
          className="mt-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          History slide — ships in PR E.
        </section>
      </main>
    </div>
  );
}
