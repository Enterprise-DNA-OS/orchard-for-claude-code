# Orchard for Claude Code

Blocks, spray diaries, harvest lots and labour allocation in a database you own. Built by Enterprise DNA. Free under MIT. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free code. Clone and run it. Agent and hosting costs are yours. | Your fields, rules, capture screens and Croptracker export mapping. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=croptracker&utm_medium=github). | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [See the offer](https://enterprisedna.co/omni/instead-of/croptracker?utm_source=github&utm_medium=readme&utm_campaign=croptracker). |

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/orchard-for-claude-code.git
cd orchard-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Node 20 or newer. Local mode uses embedded PGlite, without a server. Demo data includes a spray hold, a held harvest without a docket, missing label evidence, overdue tasks and expired training. Products and intervals are fictional. The demo is idempotent and must stay separate from live data.

For a shared Postgres database, supply DATABASE_URL through the environment and run `npm run migrate`. The same SQL and CLI run on both adapters. Configure access controls and backups before team use. A local database accepts one process at a time.

## Weekly work

| `/add` | add |
| `/attention` | attention |
| `/block` | block |
| `/blocks` | blocks |
| `/complete-task` | complete task |
| `/compliance` | compliance |
| `/customise` | customise |
| `/documents` | documents |
| `/draft-weekly` | draft weekly |
| `/export` | export |
| `/harvest-plan` | harvest plan |
| `/harvests` | harvests |
| `/import` | import |
| `/irrigation` | irrigation |
| `/labour-review` | labour review |
| `/log` | log |
| `/new-view` | new view |
| `/review-diary` | review diary |
| `/spray-diary` | spray diary |
| `/tasks` | tasks |
| `/trace` | trace |
| `/weekly-review` | weekly review |
| `/workers` | workers |
| `/yields` | yields |

`npm run orchard -- help` lists the CLI. Add --json for machine output. Every read supports plain text. Block, worker, task and harvest references accept codes, partial UUIDs and case-insensitive names, with ambiguity reported rather than guessed.

```bash
npm run orchard -- add block --code=B05 --name="West Fuji" --crop=Apple --variety=Fuji --hectares=3 --address="Your orchard address"
npm run orchard -- add worker --code=W04 --name="Your operator" --training-expires=2027-06-30
npm run orchard -- log note --block=B05 --note="First block walk recorded"
npm run orchard -- add task --ref=T05 --block=B05 --title="Review spray diary" --due=2026-10-10 --owner="Your operator"
```

Required write flags are documented in [docs/cli.md](docs/cli.md). Dates use ISO format. Spray and pick timestamps include a timezone. Missing or malformed numbers fail. Supplied labour costs use your single chosen currency and do not calculate payroll.

## Records and checks

Eight tables hold blocks, workers, sprays, harvests, labour, irrigation, tasks and notes. Three shared views produce the attention list, pick planning and performance totals. Totals cover all loaded history, not an inferred season.

A live harvest entry fails if a prior spray interval is unresolved, withholding or reentry time remains, or the diary has not been reviewed. Imports preserve history in held status. A late-entered spray is reported by the next compliance review. No command releases or dispatches fruit.

[Compliance rules and sources](docs/compliance.md) distinguish cited guidance from house policies. These checks do not certify NZGAP, GLOBALG.A.P., residue safety or export access.

## Ten questions to ask across your records

Croptracker provides configurable reports and custom reporting. We have not established that these questions are impossible there. Here they are reproducible reads you can change yourself.

1. Which blocks have pick dates before their recorded spray interval ends? (`harvest-plan`)
2. Which blocks have no recent diary review? (`compliance`)
3. Which spray entries still lack a label rule? (`compliance`)
4. Which recorded picks overlap a prior spray interval? (`compliance`)
5. Which harvest lots have no destination or docket? (`attention`)
6. Which blocks have the highest recorded labour cost per kilogram? (`yields`)
7. Where have we logged labour but no harvest yet? (`yields`)
8. How much recorded irrigation water is allocated per harvested kilogram? (`yields`)
9. Which block tasks are overdue and who owns them? (`tasks`)
10. Which spray records used an operator whose training date had passed? (`compliance`)

## Documents and views

`npm run docs` creates spray diaries, harvest dockets and labour summaries in docs-out/. `npm run view` creates the orchard week dashboard in views/. They use brand.json for the business name, logo and colours. Read-only output, no web app and nothing sends. /new-view adds an agreed view from a numbered migration.

## Your first hour: ten things to ask for

1. Set our orchard name and reviewer.
2. Put our logo on the spray diary.
3. Add our block codes and varieties.
4. Bring across a harvest report with its original units checked.
5. Add our buyer programme reference to each block.
6. Show overdue tasks by owner.
7. Add a season filter to the performance review.
8. Change the diary review interval to our agreed policy.
9. Add maturity sampling records.
10. Draft our weekly block review.

/customise reads the current schema, writes a numbered migration, updates affected commands and documents, runs it and tests the result.

## Instead of Croptracker

The [switch guide](docs/replace-croptracker.md) covers report export, supported columns, mapping, dry runs and reconciliation. The base imports the standard Harvest Inventory Report for bin records, or a mapped harvest CSV, in one command. It does not transfer every Croptracker module. The fixture is synthetic. Reimports are idempotent; conflicting history fails atomically.

```bash
npm run orchard -- import croptracker --file=examples/croptracker-harvest.csv --dry-run
npm run orchard -- export
```

[Why no front end](docs/why-no-front-end.md) explains mobile, offline and device limitations. This base does not include machine vision, packhouse operations or payroll. Enterprise DNA scopes those connections and capture screens with you.

## Verification and licence

`npm test` uses a temporary database, runs migrations and seed twice, checks every CLI path, exercises rejected writes, imports, rollback, HTML documents and JSON export. CI runs Linux and Windows plus a separate PostgreSQL job. Never run tests against a live database.

Built with Codex. MIT. Copyright 2026 Enterprise DNA.
