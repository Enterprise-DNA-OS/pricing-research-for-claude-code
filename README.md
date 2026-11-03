# Pricing Research for Claude Code

Keep price-sensitivity responses, review decisions and follow-up in a database you own. A focused alternative for the exported Van Westendorp research work done in Conjointly.

Built by Enterprise DNA. MIT licence. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install the database and commands. | Your research fields, checks and reports. Setup fee, then a retainer for ongoing work. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=github&utm_campaign=conjointly) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=github&utm_campaign=conjointly) |

## Quick start

Node 20 or newer. No vendor account or hosted database is needed for the fictional demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/pricing-research-for-claude-code.git
cd pricing-research-for-claude-code
npm install
npm run demo
npm run research -- psm --study="Harbour Coffee subscription"
npm run view
npm run docs
```

The demo contains two fictional studies. The subscription study has ten responses: eight eligible, one incomplete and one with inconsistent prices. Its study minimum is six for demonstration. Both segments fall below that minimum, so segment summary results are withheld. The gift-box study has no responses and overdue privacy reviews. Real study thresholds must be chosen by the researcher, not copied from this demo.

Local storage uses PGlite in .data/db. DATABASE_URL selects PostgreSQL. Run npm run migrate on a new database. The scripts use a trusted operator account. Hosted use needs enforced identity, access control, backups and a retention process. Typed actor names provide attribution, not authentication.

## The working week

1. `/sample-review` reconciles imported, eligible and excluded responses.
2. `/price-sensitivity` calculates four curves and their intersections.
3. `/segment-review` checks each buyer group against the agreed minimum.
4. `/quality-review` lists incomplete responses, inconsistent answers and review exclusions.
5. `/decision-review` reads the rationale and frozen evidence behind a proposed price.

Use `/weekly-review` to combine the sample, analysis and follow-up into a private review draft. Nothing sends a message or changes a selling price. Thirty slash commands ship with the build. The full list is in [the command index](docs/command-index.json). The one CLI is `npm run research -- help`. Every command accepts --json. Exact names are case insensitive, ID prefixes work, and ambiguous matches list candidates and exit 1.

## Bring your Conjointly research across

Export the raw responses, then save the Respondents worksheet as UTF-8 CSV if your export is an Excel workbook. Map the respondent key, segment, completion status and four price answers. These columns vary by study, so the import requires an explicit map. The supplied example demonstrates the mapping contract and is not a vendor-generated export.

```bash
npm run research -- import conjointly --study="Harbour Coffee subscription" --file=examples/conjointly-respondents.csv --map=examples/conjointly-map.json --expected-count=3 --source-ref="Fictional fixture" --actor="Demo researcher" --dry-run
```

Remove --dry-run to import that fictional example. For real work, use your own file, mapping, independent source row count and operator identity. The import is atomic. Repeating identical evidence adds nothing. Changed answers under the same respondent key are refused. A corrected export goes into a new study. [The switching guide](docs/replace-conjointly.md) explains the boundary.

## What the calculations mean

The base implements unweighted Van Westendorp price-perception analysis. It uses all distinct observed prices, inclusive cumulative counts and piecewise-linear intersections. An interval of equal values remains an interval. Below the study minimum, summary intersections and new pricing decisions are withheld. The curves remain available for exploration and are marked when below the minimum.

The extreme-balance intersection is sometimes called an optimal price point. Here it is called extreme balance because it does not maximise sales, revenue or profit. This base does not run conjoint utility estimation, MaxDiff, Gabor-Granger, purchase-likelihood modelling, respondent recruitment or survey hosting. Scope those requirements before switching. [Method and limitations](docs/method.md).

## Ten questions to ask

These queries work today. They are not claims that Conjointly cannot answer similar questions.

1. How many responses actually support this study? `sample`
2. Which responses failed the review checks? `quality`
3. Which buyer groups are too small for our agreed analysis? `segment-review`
4. How does the too-expensive percentage change across observed prices? `curves`
5. Is the extreme-balance result a point or a range? `psm`
6. How do eligible counts differ between existing and new buyers? `segments`
7. Which study reviews and follow-up actions are overdue? `attention`
8. What evidence supported our proposed price before later exclusions? `decisions`
9. Which source file, mapping and count produced these responses? `imports`
10. Who recorded the reviews, notes and decisions? `history`

Commands that concern one study require --study. Use its ID if a name is ambiguous.

## Your first hour: ten things to ask for

1. Put our business name, logo and colours in brand.json.
2. Register our actual research question and owner.
3. Set the currency and the unit the price refers to.
4. Set a researcher-approved minimum sample.
5. Record the research notice and review dates.
6. Map the actual exported question columns.
7. Reconcile the original count with the import preview.
8. Review inconsistent answers before interpreting curves.
9. Record a proposed price with its rationale and evidence.
10. Render our study brief and weekly review.

`/customise` adds fields or changes a rule through a tested migration. `/new-view` adds a read-only report.

## Reports, records and backups

`npm run view` renders views/week.html. `npm run docs` renders study briefs and decision records in docs-out/. Both use brand.json. They are private HTML documents, not a hosted application. [Why no front end](docs/why-no-front-end.md).

Original responses, import evidence, review events, decisions and notes are append-only. A later review does not rewrite a saved decision snapshot. Study review dates and action status can change with an event recorded by the CLI. The database owner can bypass these protections. Privacy erasure requires an authorised administrator procedure covering the database, exports, snapshots and backups.

`npm run research -- export --file=exports/research-backup.json` exports all eight domain record types in one consistent read. It refuses to overwrite a file. Keep native database backups too. JSON restore is not shipped.

`/compliance` flags missing collection references and overdue access or retention reviews. It supports a privacy review; it does not certify legal compliance. [Rules and official sources](docs/compliance.md).

## Validation

`npm test` exercises every CLI command, known mathematical examples, missing and inconsistent responses, repeated imports, changed evidence, sample controls, frozen decisions, ambiguous names, exports and escaped HTML. Tests use temporary local storage. TEST_DATABASE_URL accepts an explicitly disposable empty PostgreSQL database only. [Validation evidence](docs/validation.md).

[Selection and sources](docs/research.md). Built and optionally operated through [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/conjointly?utm_source=github&utm_medium=readme&utm_campaign=conjointly).
