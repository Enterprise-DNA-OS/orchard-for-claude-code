# Record checks and their sources

Checked 4 October 2026. This is a record review, not certification, spray advice, residue testing or export clearance. All demo products, intervals, people and addresses are fictional. Enter intervals from the actual product label and your crop and market programme. Unknown intervals stay unknown, never zero.

| Rule | Check | Basis |
|---|---|---|
| SPRAY_RECORD | Wind speed, direction, boundary measures and workplace address are present | Growsafe record guidance |
| LABEL_RULE | Withholding days, reentry hours and label reference exist | MPI label guidance plus conservative house policy for incomplete records |
| PICK_HOLD | A recorded pick overlaps a prior spray interval, or its interval is unknown | Entered label rule, not a universal crop interval |
| TRAINING | Applicator training date covers the application date | House policy, not a claim that every spray requires a particular certificate |
| TRACE | Harvest destination and docket are recorded | House policy for trace review |
| DIARY_REVIEW | Diary has been reviewed within seven days | House policy |
| GAP_EVIDENCE | Block certificate date is missing or past | Programme evidence review, not proof that every crop legally requires GAP |

Sources:

- [Growsafe record keeping](https://www.growsafe.co.nz/Growsafe/Growsafe/Rsrc/Record-keeping.aspx): application record fields and keeping spray records for three years. The system has no delete command. Retention still requires backups and access controls.
- [MPI, Labelling Agricultural Chemicals, section 5.6.1](https://www.mpi.govt.nz/dmsdocument/19481/direct): withholding instructions are specific to approved use. Export restrictions require exporter or crop adviser review. The software checks entered durations only. Growth-stage conditions and residue limits need separate review.

## House policies

The seven-day diary review, training currency, destination/docket checks and certificate checks are operating policies. Adjust them through /customise with a numbered migration and matching tests. Missing dates are reported, never silently accepted. No claim of NZGAP or GLOBALG.A.P. certification is made.

New harvest recording checks both withholding and reentry intervals, the original application timestamp and a recent diary review. It does not authorize picking. No release or dispatch command exists. Imported records remain held, including historically compliant picks, until a person reconciles the old records. Late-entered spray history is detected by /compliance on the next review.

AU users must replace these NZ references with state, label and buyer programme rules before operational use. Labour records are allocation records, not a payroll system. Shared database permissions, encrypted backups and restoration checks are deployment work.
