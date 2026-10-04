# Bring Croptracker harvest records across

Croptracker confirms CSV, Excel and PDF report exports in its [FAQ](https://www.croptracker.com/faqs.html). Its [Harvest Inventory Report help](https://croptracker.atlassian.net/wiki/spaces/DAKB/pages/1194492283) documents the supported standard headings: Harvest Code, Farm/Block/Row, Harvest Date, Weight, Weight Unit, Amount and Unit. Run Reports > Harvest Inventory Report, choose dates and blocks, Apply, then use the export button. The importer supports bin inventory rows from that report plus mapped harvest CSV. Configured reports still need a heading check. Sources checked 4 October 2026.

1. In Croptracker, run the relevant harvest report for the required date range and locations. Export CSV. Retain the original report and your spray, labour and audit reports separately.
2. Add the orchard blocks with their real codes, crop, variety, area and workplace address. Names alone are not a safe way to identify two different locations. Start with a fresh database, not the demo data.
3. Compare your column headings with the supported mapping below. Supply a mapping file when different. Standard Weight and Weight Unit columns convert kg, grams and pounds to kilograms. Amount requires Unit to be bins. Other containers or weight units fail for mapping review. Duplicate On Hand columns are accepted and ignored; they describe remaining inventory, not harvested totals.
4. Run the same import first as a dry run, then apply it. Review record count, bin count and total kilograms against the original. Every imported row stays held. Date-only exports use midnight UTC as a placeholder and are not evidence of same-day interval clearance.

```bash
npm run orchard -- import croptracker --file=harvest.csv --mapping=mapping.json --dry-run
npm run orchard -- import croptracker --file=harvest.csv --mapping=mapping.json
```

With supported headings, omit `--mapping`. A fixture demonstrating that shape lives at `examples/croptracker-harvest.csv`. It is synthetic, not an export obtained from a customer.

| Field | Accepted headings | Required |
|---|---|---|
| ref | Harvest Code, Harvest ID, Harvest Ref, Lot Code, ref | Yes, unique stable row reference |
| block | Farm/Block/Row, Block, Block Code, Location | Yes, matches an existing block |
| picked_at | Harvest Date, Date, picked_at | Yes, ISO date or timestamp with timezone |
| bins | Amount (Unit=bins), Bins, Bin Count | Yes, positive whole number |
| kg | Weight with Weight Unit, Weight (kg), Weight kg, kg | Yes, positive kilograms |
| destination | Destination, Customer | No, missing appears in attention |
| docket | Docket, Docket Number | No, missing appears in attention |

Mapping format: `{"ref":"Your row reference","block":"Your location","picked_at":"Your date","bins":"Your bins","kg":"Your kilogram column"}`. A lot repeated across several rows needs a stable per-row reference in your prepared file. Summary reports cannot recreate individual bins or lot history. Ambiguous headings, locations, duplicate references, invalid values and changed history fail the whole import. Repeating identical records leaves the database unchanged. A dry run rolls back all changes.

Spray applications, operator training, labour, tasks and irrigation are entered through the matching log/add commands or mapped as a separate custom migration. Photos, signatures, attachments, device data, payroll, integrations and audit certificates are not imported by the harvest importer. Enterprise DNA scopes and checks that migration with your exports before cutover. No claim of a full account switch in a day is made without that check.

`npm run orchard -- export` writes all eight record types as JSON, including IDs, history and timestamps. Keep exports private. Test restoration into a separate database before relying on a backup.
