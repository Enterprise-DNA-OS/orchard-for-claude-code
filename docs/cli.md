# CLI write reference

Prefix every line with `npm run orchard --`. All commands accept `--json`. Every option takes `--name=value`; quote values containing spaces. Use one chosen currency for all labour allocations.

- `add block --code= --name= --crop= --variety= --hectares= --address= [--gap-expires=YYYY-MM-DD] [--planned-pick=YYYY-MM-DD]`
- `add worker --code= --name= [--training-expires=YYYY-MM-DD]`
- `add task --ref= --block= --title= --due=YYYY-MM-DD --owner=`
- `log spray --ref= --block= --worker= --product= --at=<ISO timestamp with zone> --amount= --unit=L|kg --wind-speed= --wind-direction= --boundary= --whp-days= --rei-hours= --label=`
- `log harvest --ref= --block= --at=<ISO timestamp with zone> --bins= --kg= --destination= --docket=`
- `log labour --ref= --block= --worker= --date=YYYY-MM-DD --activity= --hours= --cost=`
- `log irrigation --ref= --block= --date=YYYY-MM-DD --source= --litres=`
- `log note --block= --note=`
- `review-diary <block> --date=YYYY-MM-DD --note=<reviewer and evidence>`
- `complete <task>`
- `import croptracker --file=<CSV> [--mapping=<JSON>] [--dry-run]`
- `export [--out=<new JSON path>]`
- `draft-weekly`

Spray dates and intervals come from actual records and labels. A new harvest fails on unresolved rules or a stale diary. Review the block and original evidence before writing. Imports never mark fruit as cleared. No automatic release, delete, payment, email or dispatch action exists.
