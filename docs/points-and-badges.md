# Points and BADges

The rules for the BAD App. The live numbers are kept on the **Points Settings** tab of
BAD APP – Master (sheet `1ATPRh9Z-voVhE_8a5PNQUZnrLoEHBhM9iZAIR-1FeRA`), so the app should
read them from there rather than hard-coding them.

## Two things, kept separate

| | Points | BADges |
|---|---|---|
| What it's for | Joining activities | Loyalty and community spirit |
| How you get it | Automatically, every paid session or activity you join | Given by hand by the founders and crew |
| What you do with it | Spend 100 on a free session | Never spent. It sets your BADge level |
| Does it expire? | Yes. Points reset after 90 days with no activity | Never |

## Points

| Rule | Value (Points Settings cell) |
|---|---|
| Points per paid session or activity joined, any department, any price | 5 (B5) |
| Points for a free session | 100 (B6), about 20 activities |
| Reset after days without activity | 90 (B7). After a gap longer than this, the balance starts again from zero |
| Launch date | B8. Nothing counts before it. Everyone starts at zero |

Points are only added once the session is marked **paid**. Unpaid sessions earn 0 until paid.

Other points (Points Settings A15:B19):

| Type | Points |
|---|---|
| Event or tournament | +10 |
| BAD Retreat | +20 |
| No-show or late cancellation | −4 |
| Free session redeemed | −100 |
| Adjustment | any |

There is **no** welcome bonus, referral points, crew points or streak points any more. Those are BADges now.

## BADges

- Given only by **founders and crew** (Membership level Founder, Crew or Community Manager).
- Each BADge records: date, player, how many (default 1, up to 5), who gave it, reason.
- They never expire and are never spent.
- Founders are always at the top level, whatever their BADge count.

When to give a BADge (Points Settings A36:C41): crew help, brought a new player, 4 weeks in a row,
completed their player card, tried a new department, above and beyond (1 to 5).

### BADge levels (Points Settings A28:C32)

| Level | BADges | Perks |
|---|---|---|
| Rookie | 0 | Player card, earn points, join any session |
| Member | 3 | Silver Member card, sign-ups open 24 hours early |
| Core | 10 | Skip the waitlist when a session is full, 5% off merch, a vote on new sessions and events |
| Legend | 25 | Black Legend card, 10% off merch, first pick of limited drops, members-only events, first spots for BAD Retreat |
| Top level (name to be chosen) | Founders only | Every perk, always |

## What the app needs

1. **Points**: replace the old rules (`attend:10, paid:5, welcome:20, referrer:25…`, tiers Starter/Rising/Silver/Gold)
   with the rules above, read from the Points Settings tab.
2. **BADges**: an admin action "Give a BADge", visible only to founders and crew, with player, number (1–5),
   reason (pick from the list or type one). Save who gave it.
3. **Player card and Home**: show the points balance (with "Play by [date] to keep them") and BADges + BADge level as two separate tiles.
4. **Explain it to players**: replace "How points work" with the copy below.
5. **Sheet sync**: write BADges to the **BADges** tab and points entries (events, no-shows, redeemed free sessions)
   to the **Points Ledger** tab of BAD APP – Master, so the Dashboard and the app show the same numbers.

## Copy for players

**Points**
Every session you join earns you 5 points, whatever you play. Collect 100 points and your next session is on us.
Points reset if you go 90 days without playing, so keep showing up.

**BADges**
BADges are our way of saying thank you. The founders and crew give them for loyalty and BAD spirit: helping run a session,
bringing a friend, showing up week after week, trying a new sport with us. BADges never expire. The more you collect,
the higher your level: Member, Core, then Legend.
