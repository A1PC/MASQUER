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
          className="rounded border border-gold/40 px-3 py-1 text-xs text-white/80 hover:bg-gold/10 disabled:opacity-40"
        >
          ★ Save as Favorite
        </button>
      </div>
      {showSavePrompt && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            placeholder={`My Numbers ${favorites.length + 1}`}
            className="flex-1 rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-white"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded bg-gold px-2 py-1 text-xs text-felt-deep"
          >
            Save
          </button>
        </div>
      )}
      {favorites.length > 0 && (
        <div className="rounded border border-white/15 bg-black/20 p-2 text-xs">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Saved favorites</p>
          <ul className="flex flex-col gap-1">
            {favorites.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2"
                data-favorite-id={f.id}
              >
                <button
                  type="button"
                  onClick={() => onLoad({ mainNumbers: f.mainNumbers, bonusNumber: f.bonusNumber })}
                  className="flex-1 truncate text-left text-white/80 hover:text-white"
                  aria-label={`Load favorite ${f.name}`}
                >
                  {f.name}{' '}
                  <span className="text-white/40">
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
                  className="text-white/40 hover:text-white"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${f.name}"?`)) void deleteFavorite(f.id);
                  }}
                  aria-label={`Delete ${f.name}`}
                  className="text-white/40 hover:text-casino-red"
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
