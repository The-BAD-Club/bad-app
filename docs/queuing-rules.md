# BAD queuing: rules on record (paused 4 Nov 2026)

The court queue was switched off after the first live test on 4 Nov 2026. Courts now runs as a **Check-in & Pay** sheet only. This page keeps every rule we had, so the new queue can be rebuilt from scratch on purpose.

## 1. Levelling rules (kept, still in use)

**BAD levels. Not BWF.** Our club scale helps us mix games. Crew has the final call.

| Level | Meaning | Rating W | Rating M |
|---|---|---|---|
| F | Fresh on court, first-timer | 0.5 | 1 |
| E | Beginner | 1 | 1.5 |
| E+ | Developing beginner | 1.5 | 2 |
| D | Improver | 2 | 2.5 |
| D+ | Strong improver | 2.5 | 3 |
| C | Intermediate | 3 | 3.5 |
| C+ | Upper intermediate | 3.5 | 4 |
| B | Advanced | 4 | 4.5 |
| B+ | Strong advanced | 4.5 | 5 |
| A | High-level competitive | 5 | 5.5 |
| A+ | Elite competitive | 5.5 | 6 |

- Every badminton player has a level (F to A+) and a category: **W** (women's) or **M** (men's).
- The rating comes from the level and category automatically (table above). Crew can adjust it; "Reset" goes back to the automatic value.
- Players pick a starting level when they make their card. **Kenny reassesses everyone**; crew, admins and that session's Game Master can change a level, and every change is logged (who and when, can't be edited).
- Guests and walk-ins can be given a level on the night; it stays on that session only.
- Level groups used for matching: **Beginner** (F, E, E+), **Improver** (D, D+), **Intermediate** (C, C+), **Advanced** (B, B+), **Elite** (A, A+).
- Other departments have their own level lists (volleyball, pickleball, basketball, running, dance). Levels never show on the card.
- **Everyone plays with anyone.** Levels help mix games; they don't choose teammates and we don't promise an even game.

## 2. Queue rules we had (switched off)

**Sessions and formats**
- Booking: 2 courts, 2 hours, 16 players, waiting list of 4. Admins can raise the cap and waiting list, add a court and extend time.
- Target: about 5 games each in 2 hours (shown to crew as a plan, never promised to players).
- Game format: **to 21** when the session is full, **to 30** below capacity. Valid scores: win at 21 by 2+, past 21 by exactly 2, cap 30 (to 30: cap 35).

**Rotation**
- Fewest games play first; ties go to whoever has waited longest.
- Late arrivals start one game behind the lowest count (so they don't jump the queue or fall far behind).
- Nobody is passed over twice.
- Players can sit out a game and keep their place, or ask for extra games.
- The waiting area holds groups lined up for the next free court.

**Matching four players into two teams** (cheapest of the 3 splits)
- Avoid repeating partners (strongest rule).
- Every Beginner needs at least one Beginner opponent: 1 strong + 3 Beginners is fine, 3 strong + 1 Beginner is not.
- Then: close team ratings, fewer repeat opponents, mixed W/M on both sides when possible.
- Crew could re-pair a court or swap players by hand.

**Scores and standings**
- One player enters the score, the other team confirms; crew can fix, void or delete.
- Standings: wins, then points scaled to 21, then fewer games. BADDEST PLAYER: +5 points.

## 3. What went wrong on 4 Nov

1. **Drag and drop** of players on the board was unreliable.
2. **No clear end of game**: finishing a game wasn't obvious, so courts stayed "playing".
3. **The waiting group didn't move onto a free court automatically.**
4. **Guests lost their names** and showed as "Player".
5. **No way to end the whole session.**
6. Rankings weren't used, so they don't matter for now.

## 4. What runs now: Check-in & Pay

- One list of everyone signed up, guests and walk-ins, with their names kept for the night.
- **Here** button for attendance (or players scan the session's check-in QR).
- **Payment** per person: Not paid, Paid by Cash, Bank, Ziina or Careem, or Free. Guests brought by a player show "Paid with" that player.
- Totals: here, paid, collected, still to collect.
- **End session**: closes check-in, can mark everyone who didn't come as a no-show, and can be reopened. Payments can still be updated after.
- Rank board and game stats are hidden.

To bring the old queue back for testing: set `QUEUE_OFF=false` in `src/app/8-courts.js`.

## 5. For the rebuild (to decide together)

- One simple flow per court: **Start → End game → next group moves on**, with a big obvious End button.
- Tap-to-move instead of drag and drop.
- Automatic fill of a free court from the waiting group, with crew able to override.
- Which of the rules in section 2 we keep, and in what order of priority.
