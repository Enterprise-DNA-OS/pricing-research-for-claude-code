# Move exported Conjointly price research into your own database

Sources checked 3 November 2026: [export options](https://conjointly.com/guides/export-formats/) and [manual price-sensitivity calculation](https://conjointly.com/guides/manual-calculation-of-van-westendorp/).

1. Export the raw data for the chosen study. Conjointly's manual calculation guide locates the four price answers on the Respondents worksheet. If you have a workbook, save that worksheet as UTF-8 CSV with one header row. Its pricing page also lists CSV exports. Check your account's available format.
2. Keep the original export privately. Record its study, filters and independent row count. The import cannot prove an export contains the full source population.
3. Use add-study to register currency, price unit, purpose, owner and minimum sample. Record the research notice and access and retention review dates.
4. Copy examples/conjointly-map.json into imports/ and replace its seven header names and completion values with your actual headers and values. Use pseudonymous respondent keys. Exclude unrelated personal data before import. The example is a synthetic mapping fixture, not an official vendor header specification.
5. Run the single import command below with --dry-run, reconcile its count, then rerun without that switch.

```bash
npm run research -- import conjointly --study="Your study" --file=imports/respondents.csv --map=imports/column-map.json --expected-count=120 --source-ref="Your export reference and filters" --actor="Your operator" --dry-run
```

Use your actual source count. Mapping declares the currency and price unit and must match the study. Price text must be plain nonnegative decimals, without currency symbols or thousands separators, with at most four decimal places. Blank answers remain missing. Unknown completion values, duplicate respondent keys, malformed numbers and changed evidence fail the whole import.

The seven mapped columns become response records. Incomplete rows, missing answers and inconsistent price ordering are retained but excluded from calculations. The original mapped values, file hash, column mapping, source count and operator support reconciliation. Unmapped columns are not retained. A repeat of identical mapped evidence is skipped. For corrected answers create a new study, record the link in a note, then import the corrected export.

After import, run sample, quality, psm and segment-review. Compare sample counts and selected manual curve calculations against the source before relying on the results. The supplied formulas use equal respondent weights and explicit inclusive cumulative frequencies. A vendor report using weighting or other filters will differ.

Survey layouts, invitations, panel credits, media, conjoint designs, utility models, MaxDiff and purchase-likelihood models do not transfer into this base. Enterprise DNA scopes the other methods, connections and collection workflow required by your business. Do not cancel collection or specialist analysis services until that scope is covered.
