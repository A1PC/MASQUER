import { useEffect } from 'react';
import { db } from '@/db';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';
import type { Round } from '@/db';

type Game = Round['game'];

/**
 * Records a game-page visit. Writes a `gameVisits` row on mount, closes it
 * (sets `exitedAt` + `durationMs`) on unmount. Called from inside GameShell
 * so every game page is instrumented uniformly.
 *
 * Silent no-op when there's no user or no active session — the dashboard
 * can ignore the (rare) gap.
 */
export function useGameVisit(game: Game): void {
  const userId = useCurrentUser()?.id;
  const sessionId = useSessionStore((s) => s.currentSessionId);

  useEffect(() => {
    if (!userId || !sessionId) return;
    const visitId = crypto.randomUUID();
    const enteredAt = Date.now();

    void db.gameVisits.add({
      id: visitId,
      userId,
      sessionId,
      game,
      enteredAt,
      exitedAt: null,
      durationMs: null,
    });

    return () => {
      const now = Date.now();
      void db.gameVisits.update(visitId, {
        exitedAt: now,
        durationMs: now - enteredAt,
      });
    };
  }, [userId, sessionId, game]);
}
