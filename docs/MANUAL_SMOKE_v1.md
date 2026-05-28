# localGamble — Manual Smoke Checklist (v1.0)

> Run before every release tag. Update with any new flow that ships afterwards.
>
> Conventions:
>
> - All amounts are integer chips (no `$`, no decimals).
> - Test admin credentials: username `admin` / password `admin12345`.
> - Starting balance for a freshly-registered player is **1000 chips**; daily top-up is **+50 chips** every 24 h.
> - Where "verify in TopBar" appears, watch the credits chip in the upper-right corner.
> - Where "verify in /stats" appears, the new row should be the latest entry under that game's table.
> - Treat any console error / warning (Network / DevTools console) during the run as a P1 unless explicitly noted.

---

## 0. Reset

- [ ] Open the app in a private/incognito window **OR** sign in as admin and click `/admin/users` → **DANGER ZONE** → type the confirmation phrase → **WIPE LOCAL DATA**.
- [ ] After wipe (or in a fresh private window), navigate to `/` → confirm the router lands on `/login` (no auto-restore from a stale session).
- [ ] Open DevTools → Application → IndexedDB → confirm the `localGamble` database is either absent (private window) or contains zero rows in `users` and `rounds`.
- [ ] Open `/lobby` directly in the URL bar → confirm `RequireAuth` redirects back to `/login` instead of rendering a half-empty shell.
- [ ] Open `/admin` directly → confirm redirect to `/admin/login`.

## 1. Auth surfaces

- [ ] Register a new user with username `smoke1` + a 12-char password → submit → routed to `/lobby` → TopBar credits chip reads **1000**.
- [ ] Click the user menu → **Log out** → routed to `/login` → page focus lands on the username input.
- [ ] Re-login as `smoke1` with the same password → routed to `/lobby` → balance still **1000** (zero rounds played).
- [ ] On `/login`, submit with a wrong password → red inline `role="alert"` error reads "Invalid credentials" (or equivalent) within ~250 ms → no full-page reload.
- [ ] Navigate to `/register` and try username `admin` → submit → inline error mentions the name is reserved → registration does NOT create a row (verify via DevTools → IndexedDB → `users` table).
- [ ] Register a second user (`smoke2`) → log out → register a third user with the same `smoke2` username → inline error "Username already taken" → no duplicate row created.
- [ ] Open `/admin/login` → sign in as `admin` / `admin12345` → routed to `/admin/overview` (or `/admin` index) → admin chrome (left sidebar with sections, header with "MASQUER · Admin") renders.
- [ ] In `/admin/users` → click `smoke1` → click **Ban user** → confirm modal → toast confirms ban → row marked `banned`.
- [ ] Open a second private window → sign in as `smoke1` → `BannedOverlay` covers the entire viewport with the **BANNED** headline → only the **LOG OUT** button is interactive (Tab cycle limited to that button) → click it → routed to `/login`.
- [ ] Return to admin window → `/admin/users/<id>` → click **Unban user** → `smoke1` can now log in normally.
- [ ] Reload `/login` while logged in as `smoke1` → restore-session path resolves → routed to `/lobby` (no flash of the login form for more than ~100 ms).

## 2. Shell

- [ ] Place any 25-chip bet in any game → settle → TopBar credits chip updates within one animation frame (no stale 1000 lingering after the result row appears).
- [ ] Click the sidebar collapse toggle → sidebar width animates to 0 → reload the page → sidebar stays collapsed on remount (state is persisted).
- [ ] Re-expand the sidebar → reload again → sidebar stays expanded.
- [ ] Open `/lobby` → confirm every game tile (Coin-flip, Blackjack, Roulette, Slots, Baccarat, Lottery, Bingo, Plinko, Poker, Craps) is present in the cabinet grid → each tile is keyboard-focusable (Tab walks through all 10) with a visible focus ring.
- [ ] Open `/settings` → drag the volume slider to ~0 → click any other UI element → no sound plays → reload → slider position is preserved (no jump back to default).
- [ ] On `/settings`, set volume to ~50% → reload → slider returns to ~50% → any chip-place sound plays at that level.
- [ ] Open `/profile` → click an avatar color swatch (e.g. casino-red) → save → reload `/profile` → avatar bubble in TopBar + header shows the persisted color.
- [ ] On `/profile/edit`, change username to `smoke1b` → save → no error → TopBar greeting updates → IndexedDB `users` row shows the new username.
- [ ] On `/profile/edit`, try to rename to `smoke2` (already taken) → inline error "Username already taken" → no DB row mutated (verify by reloading and seeing the original username persist).
- [ ] Resize the window to ~360 px width (mobile) → sidebar collapses gracefully → TopBar still legible → no horizontal scrollbar appears on `/lobby`.

## 3. Per-game (golden path + edge cases)

> Each `/play/<game>` URL is lazy-loaded; on cold visit you should see the `RouteFallback` flash for ≤ 200 ms with the brass spinner + "Loading <game>…" label, then the game chrome.

### 3.1 Coin-flip — `/play/coin-flip`

- [ ] **Golden path:** From a 1000-chip account, type `25` in the bet input → click **Heads** → click **Flip** → coin animation plays → outcome banner appears → exactly one row appears in `/stats/coin-flip` (newest = top) → TopBar credits is either **1025** (win) or **975** (loss).
- [ ] **Streak ≥ 2:** Force two consecutive wins (replay until two in a row land) → the flame win-streak badge becomes visible after the second win.
- [ ] **Zero chips:** Sign in as a 0-chip user (admin → adjust credits to 0) → open `/play/coin-flip` → bet input + **Flip** button are disabled with explanatory micro-copy (e.g. "Top up to play") → no `placeBet` toast fires on click.
- [ ] **Non-integer bet:** Type `25.5` in the bet input → blur or submit → inline error rejects the value → no round is recorded.
- [ ] **Idle prompt:** With a fresh balance and no bet entered, the centred idle line ("Choose your side." / "Place a bet, then call heads or tails.") renders below the coin → it disappears once a bet is entered.

### 3.2 Blackjack — `/play/blackjack`

- [ ] **Golden path:** Bet 25 chips → click **DEAL** → two player cards + one dealer up-card render → click **Stand** → dealer auto-plays → outcome row written to `/stats/blackjack` → TopBar credits updates by the correct delta.
- [ ] **Split:** Get dealt a pair (replay or seed) → **Split** button enables → click it → two separate hands render side-by-side → resolve each independently → two rounds rows written (or one row with the split outcome, per ADR — verify both hands' result lands in `/stats/blackjack`).
- [ ] **5-Card Charlie:** Hit four times without busting → outcome banner reads "5-Card Charlie" → payout in TopBar matches 3:2 of the original bet.
- [ ] **Insurance prompt:** Dealer up-card shows an Ace → Insurance prompt modal appears with **Take insurance** / **Decline** → clicking either resolves without breaking the hand → after dealer reveal, insurance payout (or loss) is reflected in the credit delta.
- [ ] **Bet exceeds balance:** With a 100-chip balance, type `500` in the bet input → **DEAL** is disabled → micro-copy explains why ("Insufficient chips" or similar).
- [ ] **Mid-round refresh:** Mid-hand (after **DEAL**, before settle) refresh the page → the round either resumes from persisted state OR the game resets cleanly with no orphan row in `/stats` (whichever the spec prescribes — confirm no half-written round appears).

### 3.3 Roulette — `/play/roulette`

- [ ] **Golden path:** Click red → chip stack lands on the red outside-bet → click **SPIN NOW** → wheel spin animates ≥ 1 s → result number pocket highlights → result row in `/stats/roulette` → TopBar credit delta = either `+bet` (win) or `-bet` (loss).
- [ ] **Multiple bets in one spin:** Place chips on red AND on 17 in the same idle window → **SPIN NOW** → both bets resolve in the same round row (verify the round shows both stake and split payout).
- [ ] **Countdown ring:** Watch the brass countdown ring around the SPIN button — it animates clockwise as time elapses; on auto-spin (if enabled) the spin fires at completion without a click.
- [ ] **Zero chips:** Set balance to 0 → bet chips on the table are disabled (clicks produce no chip stack) → **SPIN NOW** is disabled with explanatory micro-copy.
- [ ] **Clear bets:** Place chips → click **Clear bets** → all chip stacks removed from the table → balance unchanged → no round written.
- [ ] **Console hygiene:** During a failed `placeBet` (e.g. exceed balance via direct click), no `console.warn` leaks to DevTools (this was flagged in audit §2.3).

### 3.4 Slots — `/play/slots`

- [ ] **Golden path:** Bet 25 chips → click **SPIN** → 3 reels spin ≥ 800 ms and stop sequentially → paylines that hit are highlighted in gold → result row in `/stats/slots` → TopBar updates.
- [ ] **Jackpot tier:** Force a 3-of-a-kind top symbol (replay until it lands, or use a seeded session) → jackpot tint flashes magenta → coin-shower animation plays → outcome row marked as jackpot tier in `/stats/slots`.
- [ ] **Reduced motion:** With OS-level `prefers-reduced-motion: reduce`, click **SPIN** → reels stop instantly (no spin animation) → outcome still resolves correctly.
- [ ] **Zero chips:** Balance = 0 → **SPIN** disabled with copy "Top up to play" (or equivalent) → no rounds written on click.
- [ ] **Even payout copy:** If a round resolves with net = 0 (i.e. payout equals stake), the inline copy reads "Push" or "Even" consistently — verify it's the same word used in Blackjack/Baccarat for the same outcome.

### 3.5 Baccarat — `/play/baccarat`

- [ ] **Golden path:** Place a 25-chip Player bet → click **DEAL** → Player + Banker cards animate in → optional third card per rules → outcome banner ("Player wins") → result row in `/stats/baccarat` → TopBar updates.
- [ ] **Tie payout:** Bet on Tie (8:1) → replay until a tie lands → payout in TopBar = original bet × 9 (stake returned + 8 × stake).
- [ ] **Shoe indicator:** Watch the shoe-indicator panel → after 10+ hands the indicator reflects card depletion → shoe re-shuffle banner appears at the documented threshold.
- [ ] **DEAL exceeds balance:** With 50-chip balance, attempt a 100-chip Player bet → **DEAL** is disabled → no console warning fires (audit §2.5 flagged a stray `console.warn` — should be gone after PR G5).
- [ ] **Total-bet display parity:** "Bet:" and "Balance:" rows beside the table use a single number font (`font-numeral tabular-nums`) — no `font-mono` for one and `font-display` for the other (audit §2.5).

### 3.6 Lottery — `/lottery`

- [ ] **Golden path:** Open `/lottery` → Hero shows the next-draw countdown → tap 6 numbers on the grid → tap **Add to cart** → ticket appears in the cart panel → click **Buy tickets** → credit chip in TopBar drops by `tickets × price` → ticket appears under **Your tickets** tab.
- [ ] **Draw animation:** Wait for the draw (or use the admin-side "force draw" if available) → opens the `DrawAnimationModal` → 6 balls drop one by one → matched numbers on the player's ticket highlight in gold.
- [ ] **Favourites:** Save the picked 6 as a favourite via the favourites dropdown → reload → favourite persists → "Apply" loads those numbers back onto the grid.
- [ ] **Pre-draw with no past draws:** Fresh DB (no draws yet) → Hero renders the next-draw countdown WITHOUT crashing → no "last draw" strip is rendered (the seen-state placeholder is intentional — audit §3 row /lottery).
- [ ] **Zero chips edge:** Set balance to 0 → tapping **Add to cart** still allows building a cart but **Buy tickets** is gated → toast or inline error explains "Insufficient chips" → no ticket row inserted.
- [ ] **History slide:** With ≥ 1 completed draw in the DB, the **History** slide lists past draws with timestamps and the player's match counts per draw — no blank rows.

### 3.7 Bingo British — `/play/bingo?variant=british`

- [ ] **Golden path:** Open `/play/bingo?variant=british` → variant modal (if first visit) selects British → buy 1 card at the default stake → click **Start round** → balls call at the documented cadence → first claim tier ("LINE!") fires the matching sound and shows a claim banner → settle → round row in `/stats/bingo`.
- [ ] **Full house claim:** Continue same round until all numbers on a card are marked → **FULL HOUSE!** claim banner fires → larger jackpot payout reflected in TopBar.
- [ ] **Multi-card stake:** Buy 4 cards at once → grid renders all 4 → balls mark across all cards simultaneously → each card's claim is independently announced.
- [ ] **Invalid `?variant=foo`:** Navigate to `/play/bingo?variant=foo` → page falls back to the variant modal with a short explanation rather than crashing (audit §2.7 mentions `invalidVariant` handling).
- [ ] **Zero chips:** Balance = 0 → **Buy in** disabled in the setup panel → micro-copy explains why.

### 3.8 Bingo American — `/play/bingo?variant=american`

- [ ] **Golden path:** Open `/play/bingo?variant=american` → variant modal lands on American → buy 1 card → centre cell shows the FREE square marked → start round → first claim tier ("LINE!" or "FOUR CORNERS!" depending on which lands first) fires.
- [ ] **Four corners claim:** Get all four corners marked → **FOUR CORNERS!** banner + payout.
- [ ] **Blackout claim:** Continue until all 24 non-free cells are marked → **BLACKOUT!** jackpot tier banner + the highest payout for this variant.
- [ ] **Free-square art parity:** The FREE cell uses the same `MaskMark` brand glyph that appears on the lobby tile (audit §2.8 P3 spot check).
- [ ] **Switch variant mid-session:** From a running American round, edit URL to `?variant=british` → confirm the page either re-prompts the variant modal or warns before discarding the in-progress round (no silent loss of stake).

### 3.9 Plinko — `/play/plinko`

- [ ] **Golden path:** From `/play/plinko`, in the setup panel pick `9` rows → set bet to 25 → click **Drop** → ball cascades through pegs (peg-ping sounds fire) → lands in a bucket → multiplier flashes → result row in `/stats/plinko` → TopBar updates by `bet × multiplier - bet`.
- [ ] **Jackpot bucket:** Drop until the ball lands in the outer-edge max-multiplier bucket → `CoinShower` particle effect plays → win-tier sound (jackpot tier) fires.
- [ ] **Manual cooldown:** Click **Drop** repeatedly as fast as possible → only one drop fires per ~150 ms (the cooldown debounce in audit §2.9) → no overlapping balls in the air.
- [ ] **Reduced motion:** With `prefers-reduced-motion: reduce`, **Drop** still resolves → no peg-ping spam → ball animation is instant (no falling animation).
- [ ] **Zero chips:** Balance = 0 → **Drop** disabled → setup panel shows insufficient-chips state.

### 3.10 Hold'em — `/play/poker/holdem`

- [ ] **Golden path:** Pick a stake (e.g. 100-chip buy-in) → click **Start session** → hole cards dealt → flop/turn/river deal as the hand progresses → make a check/call/raise/fold action → hand resolves → round row in `/stats/poker` (or per-variant page) → TopBar net updates.
- [ ] **All-in showdown:** Push all chips → opponent calls → cards reveal → pot is awarded → balance updates → session continues with the winner's chips.
- [ ] **Fold mid-hand:** Click **Fold** pre-flop → hand ends instantly → the small-blind/big-blind stake loss is reflected (no full pot loss) → round row written.
- [ ] **Bust-out:** Lose all chips → session ends → "Out of chips" banner appears → **Return to lobby** CTA → no further actions allowed in the bet panel.
- [ ] **Net display font parity:** The big chip-net display at the bottom of the page uses `font-numeral tabular-nums` (not `font-mono`) and the win/loss tint matches the brand tokens (`text-chip-win` / `text-state-loss`) — audit §2.10/2.11/2.12 flagged this drift.
- [ ] **Action button focus rings:** Tab through Fold/Call/Raise → every button has a visible gold focus ring (no raw `<button>` slipped through PR G10).

### 3.11 Five-Card Draw — `/play/poker/five-card-draw`

- [ ] **Golden path:** Buy in → 5 cards dealt → tap to mark 1–5 cards for discard → click **Draw** → replacement cards animate in → showdown vs opponent → pot resolves → round row in `/stats/poker/five-card-draw`.
- [ ] **Hold all 5 (no discard):** Click **Draw** without selecting any cards → hand resolves without animation jitter → showdown still fires.
- [ ] **Discard 5 (full redraw):** Mark all 5 cards → **Draw** → 5 fresh cards animate in → hand still resolves.
- [ ] **Two consecutive hands:** Complete one hand → start the next → opponent archetype changes (verify by reading the archetype label in the opponent panel) → no carry-over hole cards.
- [ ] **DiscardControls buttons:** Tab through the discard toggles → each has a visible focus ring (audit §2.11 P3 noted raw `<button>` calls; verify PR G11 fixed them).

### 3.12 Omaha — `/play/poker/omaha`

- [ ] **Golden path:** Buy in → 4 hole cards dealt (Omaha rules) → community board fills → make actions across streets → showdown enforces "exactly 2 hole + 3 community" rule on hand evaluation → round row in `/stats/poker/omaha`.
- [ ] **Pre-flop fold:** Fold immediately → blinds-only loss reflected → next hand starts cleanly.
- [ ] **SetupPanel parity with Hold'em:** Omaha's setup panel matches Hold'em's visual layout (same primitives — Omaha imports from `holdem/SetupPanel` per audit §2.12) — buttons, labels, focus rings identical.
- [ ] **Cross-variant navigation:** From Omaha, click the poker lobby breadcrumb → `/play/poker` → confirm Hold'em / Five-Card Draw / Omaha tiles all render with the same chrome → click Hold'em → game loads.
- [ ] **Net display parity:** Same `font-numeral tabular-nums` net display as Hold'em / Five-Card-Draw — no `font-mono` drift.

### 3.13 Craps — `/play/craps`

- [ ] **Golden path:** Open `/play/craps` → setup panel → buy in → place a 25-chip Pass-line bet → click **Roll** → dice animation rolls (≥ 800 ms) → outcome banner ("Point established" or "Natural" or "Craps") → round row in `/stats/craps` → TopBar updates.
- [ ] **Point cycle:** Establish a point (4/5/6/8/9/10) → continue rolling → either make the point (Pass-line wins) or seven-out (Pass-line loses) → outcome banner crossfades correctly between roll outcomes.
- [ ] **Multi-bet spread:** Spread chips across Pass-line + Field + a Place bet in one round → roll → each bet resolves independently → settle row reflects all stakes and payouts.
- [ ] **BetSpot lockout:** After the come-out roll establishes a point, attempt to add to a now-locked spot (e.g. Don't Pass) → spot is `tabIndex=-1` with visible disabled state → no chip lands → screen-reader announces "disabled" (audit §2.13 P2 — verify `aria-disabled` is present after PR G13).
- [ ] **Reduced motion:** With `prefers-reduced-motion: reduce`, dice roll is instant; banner crossfade is replaced with an instant swap → outcome still correct.
- [ ] **Bust-out:** Drain chips to 0 → setup panel offers a fresh buy-in (or returns to lobby) → no orphan round row.

## 4. Admin

> Sign in via `/admin/login` as `admin` / `admin12345` before this section.

### 4.1 Overview

- [ ] `/admin/overview` (or `/admin` index) loads inside the admin chrome → KPI tiles render (total users, total rounds, total chips in circulation, today's net) → numbers are non-blank.
- [ ] The 7-day sparkline (rounds played per day) renders an SVG line — no broken `viewBox`, no zero-height rendering.
- [ ] The "Recent adjustments" panel lists the last N credit adjustments with timestamp + admin + delta — empty state shows a friendly EmptyState (not a blank panel) when no adjustments exist.

### 4.2 Leaderboard

- [ ] `/admin/leaderboard` → all 4 tabs render:
  - [ ] **Top winners** (`data-leaderboard-winners`) — table of top net-profit users.
  - [ ] **Top by volume** (`data-leaderboard-volume`) — table of top wagered users.
  - [ ] **Biggest single win** (`single-win` tab) — table of largest single-round payouts.
  - [ ] **Longest win streak** (`data-leaderboard-streak`) — table sorted by streak length descending.
- [ ] Tab switching re-mounts the body table within ~100 ms; no flash of empty state for already-populated data.
- [ ] DateRangeFilter on this page persists **per-tab** (`storageKey="admin.leaderboard.<tab>.range"`) — switch from "Top winners" with range = 7d to "Top by volume" with range = 30d → switch back → "Top winners" still reads 7d.

### 4.3 Users

- [ ] `/admin/users` → list paginates if > 1 page; search box filters by username substring.
- [ ] Click a user → `/admin/users/:id` drill-down → tabs/panels show recent rounds, current balance, audit log → all populated for an active user.
- [ ] Click **Adjust credits** → modal opens → enter `+100` → confirm → user balance increases by 100 → an audit row appears in `/admin/adjustments` (visible across the next page load).
- [ ] Adjust credits with `-50` (negative delta) → balance decreases → audit log records the negative.
- [ ] Click **Ban user** → confirm → row reflects banned status → audit log records the ban → user attempting to sign in sees `BannedOverlay` (cross-referenced with §1).
- [ ] Click **Unban user** on the banned row → confirm → status flips back → user can sign in normally.

### 4.4 DANGER ZONE

- [ ] On `/admin/users`, scroll to the DANGER ZONE panel → casino-red border + headline reads "DANGER ZONE".
- [ ] Click **WIPE LOCAL DATA** → confirmation modal opens with the exact confirmation phrase → click **CANCEL** → modal closes → no data is wiped → reload `/admin/users` and confirm all users are still present.
- [ ] Repeat: click **WIPE LOCAL DATA** → close the modal via the X button → no data wiped.
- [ ] (Reserve the actual wipe for §0 of the next smoke run — do NOT confirm the wipe during normal smoke unless you intend to start fresh.)

### 4.5 Per-game admin pages

For each route, confirm: page loads inside admin chrome, KPI cards render with numeric values (or an EmptyState if no rounds for that game in range), at least one chart/table renders without layout shift, DateRangeFilter is present.

- [ ] `/admin/coin-flip` (storageKey `admin.coin-flip.range`)
- [ ] `/admin/blackjack` (storageKey `admin.blackjack.range`)
- [ ] `/admin/roulette` (storageKey `admin.roulette.range`)
- [ ] `/admin/slots` (storageKey `admin.slots.range`)
- [ ] `/admin/baccarat` (storageKey `admin.baccarat.range`)
- [ ] `/admin/lottery` (storageKey `admin.lottery.range`)
- [ ] `/admin/bingo` (storageKey `admin.bingo.range`)
- [ ] `/admin/plinko` (storageKey `admin.plinko.range`)
- [ ] `/admin/poker` (storageKey `admin.poker.range`, plus per-variant sub-tabs render — Hold'em / Five-Card Draw / Omaha)
- [ ] `/admin/craps` (storageKey `admin.craps.range`)

### 4.6 DateRangeFilter persistence (per page)

- [ ] On `/admin/blackjack`, switch range from "Last 7 days" to "Last 30 days" → reload the page → range stays on "Last 30 days".
- [ ] Switch to `/admin/roulette` → range there is independent (defaults to "Last 7 days") → switch to "All time" → reload → "All time" persists for roulette only.
- [ ] Return to `/admin/blackjack` → range still reads "Last 30 days" (per-page storage keys are isolated).

### 4.7 Sessions & adjustments (audit log)

- [ ] `/admin/sessions` → table of login/logout sessions → search box filters by username → date-range filter trims by `sinceMs` → pagination controls (prev/next or "Load more") work and disabled state is visible on edges.
- [ ] `/admin/adjustments` → table of credit adjustments → search filters by username or admin actor → date range filters → pagination works → newest row at top.
- [ ] Empty state: filter to a range/query that returns zero rows → friendly EmptyState rendered (not a blank tbody).

## 5. Empty / zero states

> Run these against a fresh DB (§0 reset) and again against an "active player with 0 chips" account.

- [ ] **Fresh DB / new user** — sign in immediately after register → every page in the matrix below renders an intentional empty state (no blank panels, no console errors):
  - [ ] `/lobby` — RecentActivityStrip shows "No rounds played yet" copy (or rotating hint), LobbyHero shows the daily-claim CTA.
  - [ ] `/stats` overview — shared `EmptyState` with copy like "No rounds yet — play a game to see your stats here".
  - [ ] `/stats/coin-flip` (and every per-game stats page) — same empty state pattern (no `null` flash, no broken chart axis).
  - [ ] `/leaderboard` overview — shared empty state ("No rounds yet" or "No players yet").
  - [ ] `/settings` — always populated; daily-top-up status reads "Available now".
  - [ ] `/profile` — Stat tiles render zeros without crashing; metrics section either shows zeros or a soft "no data yet" hint.
- [ ] **Zero chips per game** — admin-adjust the test user to 0 chips, then for each `/play/<game>` confirm the **place-bet / DEAL / SPIN / Drop / Buy-in** primary CTA is disabled with explanatory micro-copy (not just silently failing on click). Cover: coin-flip, blackjack, roulette, slots, baccarat, lottery, bingo (both variants), plinko, hold'em, five-card-draw, omaha, craps.
- [ ] **Banned user** — `BannedOverlay` covers every route the banned user navigates to (test `/lobby`, `/play/coin-flip`, `/stats`, `/settings`, `/profile`) → only LOG OUT is interactive.
- [ ] **Lottery pre-draw / no past draws** — fresh DB → `/lottery` Hero renders the upcoming-draw countdown WITHOUT a "last draw" strip → History slide shows the empty-history state with a friendly line, not a blank table.
- [ ] **Admin overview with no data** — fresh DB → `/admin/overview` KPIs read 0/0/0 → sparkline renders a flat baseline or an EmptyState (NOT a crashed chart) → "Recent adjustments" shows an EmptyState.

## 6. A11y spot checks

- [ ] Tab through `/lobby` from the top of the page → every focusable element receives a visible gold focus ring (TopBar avatar, sidebar collapse, sidebar nav items, game tiles, footer links). No focus rings hidden by `outline: none` with no replacement.
- [ ] Tab into `/play/coin-flip` → focus order is sensible (bet input → heads → tails → flip button → recent items). Activate **Flip** via `Enter` → round resolves.
- [ ] Tab into `/admin/users` → row drilldown links + ban/unban buttons all show focus rings; DANGER ZONE button is reachable via Tab and has a casino-red focus ring distinct from neutral buttons.
- [ ] VoiceOver (macOS Cmd+F5) on `/lobby` → navigate to TopBar credits chip → reads the number with thousands separator (e.g. "one thousand, twenty-five chips") not as digits-only or as a long unbroken integer.
- [ ] VoiceOver on `/play/coin-flip` after a round resolves → outcome banner is announced via `aria-live="polite"` without re-reading on every focus change.
- [ ] System Preferences → Accessibility → **Reduce motion** ON → reload app → in every game, the headline animations (spin, deal, drop, roll) collapse to instant or near-instant; no jank, no missed outcomes.

## 7. Sound

- [ ] On first load, no sound plays before any user gesture (browsers block autoplay; verify no "audio blocked" warnings in DevTools console).
- [ ] Click any button to unlock audio → trigger any chip-place → click sound plays at the current volume.
- [ ] `/settings` → drag volume slider → subsequent sounds (chip place, button click, settle chime) scale accordingly.
- [ ] Set volume to 0 → no sound plays in any game across at least 3 different game routes.
- [ ] Reload the page → volume slider position is restored from persistence → sounds play at that level.
- [ ] Win-tier sounds: trigger a jackpot tier (slots 3-of-a-kind OR plinko outer bucket OR bingo blackout) → the win-tier sound layer fires above the base chip sound.

## 8. Build / perf

- [ ] `pnpm build` succeeds with zero TypeScript errors and zero Vite warnings beyond known harmless ones.
- [ ] Inspect the build output — entry chunk (`dist/assets/index-<hash>.js`) is **≤ 350 KB gzipped** (matches Phase 15 #15 PR C budget).
- [ ] In a private window with cache disabled, cold-load each game route in succession:
  - [ ] `/play/coin-flip`
  - [ ] `/play/blackjack`
  - [ ] `/play/roulette`
  - [ ] `/play/slots`
  - [ ] `/play/baccarat`
  - [ ] `/lottery`
  - [ ] `/play/bingo?variant=british`
  - [ ] `/play/bingo?variant=american`
  - [ ] `/play/plinko`
  - [ ] `/play/poker/holdem`
  - [ ] `/play/poker/five-card-draw`
  - [ ] `/play/poker/omaha`
  - [ ] `/play/craps`

  For each: `RouteFallback` flashes briefly with the brass spinner + "Loading <game>…" label, NO white flash, NO layout jank → game chrome renders within ~500 ms on a warm network.

- [ ] DevTools → Network tab → hover a sidebar link (e.g. Plinko) → confirm a chunk prefetch fires (the chunk request appears in the network panel) before clicking → after click, the chunk hits the cache.
- [ ] `pnpm build-storybook` succeeds → `storybook-static/` builds without errors → spot-load `iframe.html?id=routefallback--default` and confirm the fallback renders.

## 9. Sign-off

- [ ] Every P1 / P2 item above is ticked (or has a written rationale in the release notes explaining why it was deferred).
- [ ] No new console errors / warnings observed during the full run (DevTools console at completion shows only the expected app-startup informational logs, if any).
- [ ] `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .` all green on the merge commit.
- [ ] Ready to tag **v1.0** — run the commands documented in PR E's body:

  ```bash
  git fetch origin main
  git tag -a v1.0 -m "localGamble v1.0 — MASQUER · Velvet Deco launch" origin/main
  git push origin v1.0
  ```
