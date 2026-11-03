# Research record checks

Official New Zealand sources checked 3 November 2026. These checks flag records for review. They do not determine whether a business complies with law, and they do not impose a statutory number of days.

| Check | Implemented record check | Basis |
|---|---|---|
| Research purpose and notice | Missing purpose, owner or notice reference | [Privacy principles](https://www.privacy.org.nz/resources-and-learning/knowledge-base/view/376/), collection principles 1 to 4. A reference alone is not proof of lawful collection. |
| Access review | Missing or past access-review date | [Principle 5](https://www.privacy.org.nz/privacy-principles/5/). The local date is an operational reminder, not a legal deadline. |
| Retention review | Missing or past retention-review date | [Principle 9](https://www.privacy.org.nz/privacy-principles/9/). Keep information only for a lawful necessary purpose. The operator selects and records the review date. |
| Analytical quality | Incomplete responses, missing thresholds, inconsistent order and sample below agreed minimum | Local research controls, not legislation. See method.md. |

Use pseudonymous respondent identifiers. They can still be personal information if reidentification is possible. Segment labels must not contain sensitive free text. The importer stores only the seven mapped fields, not other personal columns. Keep source exports private with their own retention schedule.

Rows and evidence are protected from accidental edits through append-only triggers. A database owner can bypass them. This base uses a trusted operator connection with no hosted sign-in or multi-user authorisation. Put appropriate identity enforcement, access control, encryption, backup and disposal procedures around a shared deployment.

The retention check does not delete records. An authorised administrator must assess deletion or anonymisation across responses, review histories, frozen decision snapshots, private drafts, source files and backups. Design and test that procedure before importing personal data. Apply the actual jurisdiction and any customer-specific obligations to the deployed system.
