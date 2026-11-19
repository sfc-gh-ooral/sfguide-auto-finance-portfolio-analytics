# Synthetic data

Everything in this example is synthetic. No customer names, records, or business logic are used. Borrower names are drawn from short lists of common first and last names.

## How it's generated

`npm run generate` runs `scripts/generate-data.mjs`. It's deterministic: every run produces the same numbers.

- **Large tables are built in Snowflake.** The 1.2M applications, 460,424 funded contracts, and 4.6M month-end payment snapshots are too large to ship. `sql/setup.sql` generates them in Snowflake with `GENERATOR` and the same 32-bit integer hash (`HASH32`) that the script runs in JavaScript. Both use exact integer math, so the Sample-mode files in this folder match what Live mode computes in Snowflake. This was checked field by field: every aggregate, dealer, and queue account matched.
- **Dealers ship inside setup.sql.** The script writes the 1,500 dealers into `sql/setup.sql` between the `-- BEGIN GENERATED DEALERS` markers, so setup runs top to bottom with no file uploads.

| File | Contents |
|---|---|
| `data/aggregates.json` | Monthly originations and portfolio (balance, 30+ DPD, charge-offs), FICO band, region, channel, day of week, term and LTV mix, vintage and segment charge-off curves, roll-rate matrices |
| `public/data/dealers.json` | 1,500 synthetic dealers with 24 months of funnel counts and first-payment defaults (loaded on demand by the app) |
| `data/collections.json` | The 400 highest roll-risk accounts in the October 2026 collections queue, with 12 months of status history |
| `data/captured/*.json` | Results captured from a Live run (Ask answers, dealer narratives, account summaries), replayed in Sample mode |

Window: 24 full months, November 2024 through October 2026. Portfolio snapshots are month-end, December 2024 through October 2026.

## Planted stories

These are built into the generator so the walkthrough has findings to discover. All results are **on this synthetic data set**.

1. **Subprime delinquency creep.** The 30+ DPD rate in the **580–619** FICO band rises from 4.0% (October 2025) to 10.1% (October 2026), while the other bands ease. Extra delinquency episodes start in recent calendar months for that band only. The band's share of originations stays flat, so the rise is performance, not mix.
2. **Weak vintage.** Used-vehicle 84-month loans booked February to April 2025 go delinquent about twice as often and roll to charge-off more often. By month 15 on book, cumulative charge-offs reach 12.0% of the original balance, against 2.3% for the same loan type booked in other months of November 2024 to July 2025. The whole Feb–Apr 2025 vintage looks worse as a result.
3. **First-payment-default cluster (dealer 23, Harbor Pre-Owned).** For contracts funded from January 2026, this dealer's loans go delinquent far more often, and most miss the very first payment. Its first-payment default rate on contracts funded January to September 2026 is 22.9% (47 of 205), against 1.7% for the whole book.
4. **Sunbelt Motors Group declines (dealer 7).** A high-volume Southeast dealer whose used-vehicle mix is 70%. From November 2025, its used-vehicle LTV rises 3 points a month, pushing many deals above the 120% LTV policy line. Its decline rate climbs from 32% (May–October 2025) to 42% (May–October 2026).
5. **Weekend look-to-book drop.** Approved applications submitted on Saturday or Sunday fund at about 41%, against about 63% on weekdays.

## Generation rules (summary)

**Applications and funding**

- Application date: uniform over 730 days, with a mild growth tilt (35% of rows take the later of two draws).
- Dealer: 0.4% of applications go to Sunbelt. The rest are split: half skew toward low dealer IDs (larger dealers) and half are uniform.
- FICO bands: <580 8%, 580–619 14%, 620–679 26%, 680–739 28%, 740+ 24%.
- Approval threshold: set by band, minus 26 points above 120% LTV and 9 points above 110% LTV.
- Funding: 63% of approvals fund on weekdays and 41% on weekends. Amount = vehicle price × LTV.

**Delinquency and charge-offs**

- Each funded contract draws once whether it ever goes 30+ days past due. The lifetime chance by band is 52%, 32%, 19%, 9.5%, and 3.8%, plus the story adjustments above, plus 3 points above 120% LTV.
- A delinquent contract has one episode. It starts at a front-loaded month on book (or month 1 for most of Harbor Pre-Owned's 2026 loans). It then follows one of four paths:
  - cure after 30 days (50%)
  - cure after 60 days (20%)
  - cure after 90+ days (5%)
  - charge off (25%): 30, 60, 90+, 90+, then charged off in the episode's fifth month
- Balance amortizes on a straight line: amount × (term − month on book) / term. A charge-off writes off that month's balance; no recoveries are modeled. Contracts have no rows after charge-off.
- First-payment default: the episode starts at month 1 on book. It is observed for contracts funded by September 2026.
- Roll-risk score (collections queue, 0 to 91), the sum of five parts:
  - delinquency: 25 points at 30-59 DPD, 45 at 60-89 DPD
  - FICO band: 20, 16, 10, 5, or 2
  - LTV: 10 above 120%, 5 above 110%
  - term: 8 for 84 months, 4 for 72
  - loan age: 8 at six months on book or less
