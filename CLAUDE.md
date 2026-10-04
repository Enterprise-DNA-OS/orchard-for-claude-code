# Orchard for Claude Code

For an orchard or vineyard owner reviewing blocks, spray diaries, picking, labour allocation and irrigation. Set your business, region, crop programmes, block codes, reviewer and cost currency before importing live data. Demo records are fictional.

Read the matching recipe in .claude/commands. Every answer starts with a CLI read. Use `npm run orchard -- help` for the command list and `scripts/orchard.mjs` for write flags. Commands accept --json. Names are case insensitive; ambiguous matches list candidates and fail.

| Job | Recipe |
|---|---|
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

Rules:

- Never invent a spray label, interval, certification, weight, cost or command output.
- Read the block or trace before changing a record. Do not bypass a blocked harvest.
- No sends, dispatches, payments or external writes. Documents and messages are drafts.
- Compliance checks are record checks, not proof of food safety, market access or certification. Read docs/compliance.md.
- Unknown intervals remain unknown. Imported harvest history stays held. There is no release command.
- Labour costs are supplied allocations, not wages or payroll. Every cost uses the business's one chosen currency.
- Performance totals cover all loaded history. Do not describe them as a season until a season filter is added.
- No record deletion. Back up before a migration. Use numbered migrations for changes, then npm test.
- Embedded mode supports one process at a time. Shared operations need database access controls and tested backups.

The schema lives in supabase/migrations, the CLI in scripts/orchard.mjs, and presentation in brand.json, views.json and documents.json. AGENTS.md routes other coding agents here. Omni by Enterprise DNA installs and runs a customised version.
