import type { JSX } from 'react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listFavorites, saveFavorite, renameFavorite, deleteFavorite } from '@/systems/lottery';
import type { LotteryFavorite } from '@/db';

interface Props {
  userId: string;
  /** Current pick — if valid, the Save button is enabled. */
  currentPick: { mainNumbers: number[]; bonusNumber: number } | null;
  /** Called when the user loads a favorite into the picker. */
  onLoad: (fav: { mainNumbers: number[]; bonusNumber: number }) => void;
}

const EMPTY_FAVS: readonly LotteryFavorite[] = [];

/**
 * FavoritesDropdown — save/load/rename/delete the player's favourite lines.
 * Reskinned in Phase 15 #9 for MASQUER tokens, ≥44 px touch targets, and a
 * scrollable favourites list (`max-h-[60vh] overflow-y-auto`) so long lists
 * don't push the buy CTA below the fold.
 */
export default function FavoritesDropdown({ userId, currentPick, onLoad }: Props): JSX.Element {
  const favorites = useLiveQuery(() => listFavorites(userId), [userId], EMPTY_FAVS);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingName, setPendingName] = useState('');

  const canSave = currentPick !== null;

  async function handleSave(): Promise<void> {
    if (!currentPick) return;
    const name = pendingName.trim() || `My Numbers ${favorites.length + 1}`;
    await saveFavorite({ userId, name, ...currentPick });
    setPendingName('');
    setShowSavePrompt(false);
  }

  return (
    <div className="flex flex-col gap-2" data-favorites-dropdown>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => setShowSavePrompt((v) => !v)}
          className="min-h-[44px] rounded-md border border-brass/60 bg-felt-table-deep px-3 py-1 text-xs text-ivory/85 hover:bg-velvet-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
        >
          ★ Save as Favorite
        </button>
      </div>
      {showSavePrompt && (
        <div
          data-favorite-save-prompt
          className="flex items-center gap-2 rounded border border-brass/40 bg-velvet-deep p-2"
        >
          <input
            type="text"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            placeholder={`My Numbers ${favorites.length + 1}`}
            className="flex-1 rounded border border-brass/40 bg-felt-table-deep px-2 py-1 text-xs text-ivory placeholder:text-ivory/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            className="min-h-[44px] rounded bg-gold px-3 py-1 font-display text-xs tracking-[0.18em] text-velvet-deep hover:bg-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Save
          </button>
        </div>
      )}
      {favorites.length > 0 && (
        <div
          className="rounded border border-brass/40 bg-felt-table-deep p-2 text-xs"
          data-favorites-list-shell
        >
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ivory/50">
            Saved favorites
          </p>
          <ul data-favorites-list className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto pr-1">
            {favorites.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-ivory/90 hover:bg-velvet-deep"
                data-favorite-id={f.id}
              >
                <button
                  type="button"
                  onClick={() => onLoad({ mainNumbers: f.mainNumbers, bonusNumber: f.bonusNumber })}
                  className="min-h-[36px] flex-1 truncate text-left text-ivory/90 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  aria-label={`Load favorite ${f.name}`}
                >
                  {f.name}{' '}
                  <span className="text-ivory/40">
                    — {f.mainNumbers.join(',')} | {f.bonusNumber}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Rename favorite to:', f.name);
                    if (name) void renameFavorite(f.id, name);
                  }}
                  aria-label={`Rename ${f.name}`}
                  className="rounded px-1 text-ivory/40 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${f.name}"?`)) void deleteFavorite(f.id);
                  }}
                  aria-label={`Delete ${f.name}`}
                  className="rounded px-1 text-ivory/40 hover:text-state-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
