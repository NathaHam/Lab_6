# Open Questions and Missing Inputs

The questions below are intentionally unresolved when source material does not authorize a policy. “Before” identifies the latest safe point to decide; earlier resolution is preferable. The responsible stakeholder is a role to assign, not an assumed named person.

## Workspace and project inputs missing

| Missing input | Impact | Owner | Decision timing |
|---|---|---|---|
| Maven project (`pom.xml`, Java package/source tree, build profile) | Cannot inspect current code conventions, dependency choices, module layout, run builds/tests, or validate this design against executable project structure | Project maintainer/instructor | Before implementation tasks or Maven-based validation |
| Existing Java source, tests, database schema/configuration, and runtime packaging | No implementation patterns or persistence choices can be verified; current architecture is a proposal | Project maintainer | Before deciding what to preserve or modify |
| Existing architecture/interaction diagrams beyond the listed design prompts | No established PlantUML conventions or diagram decisions could be inspected | Project maintainer | Before adopting any existing diagram conventions |
| Deployment, security, and privacy policies | Hosting, key custody, account lifecycle, data retention, and operational assumptions are unknown | Product owner/security owner | Before production architecture approval |
| Normal operating profile and performance environment | NFR-003 cannot be meaningfully measured without hardware, network, concurrency, dataset distribution, and workload definitions | Product owner/operations | Before performance acceptance test design |

## Product and domain decisions

| ID | Question / decision needed | Impact | Owner | Decision timing |
|---|---|---|---|---|
| Q-01 | How are equal remainder ties resolved when participant names are identical? What name normalization, case, accent, and locale ordering applies? | FR-004/NFR-002 determinism; allocation may be ambiguous. No participant-ID fallback is invented. | Product owner | Before approving split algorithm or implementing allocation |
| Q-02 | Which currency codes are supported, and what authoritative scale/rounding metadata is used for each? What percentage precision is accepted? | Money storage, UI, input validation, and exact calculations | Product owner/finance stakeholder | Before schema/API and financial tests |
| Q-03 | Can a group have multiple managers? How is manager authority transferred, and what if the last manager leaves or is removed? | Invitation/removal, reviewer assignment, and group lifecycle authorization | Product owner | Before membership implementation |
| Q-04 | What identity does an invitation target (existing account ID, verified email, or either)? Which delivery channel, expiration, duplicate, decline, and revoked-invite rules apply? | Invitation security, email integration, membership acceptance and recovery of invitations | Product owner/security owner | Before invitation workflow implementation |
| Q-05 | Does a removed member retain access to historical expenses, payments, reports, and notifications? How are notices treated after removal? | Privacy/authorization for historical group data | Product owner/privacy owner | Before removal/access-control behavior is accepted |
| Q-06 | What happens when a rejected expense is corrected and resubmitted? Is it a new linked expense, editable draft, or another workflow? Are rejection reasons required? | Audit history, deduplication, and user flow | Product owner | Before expense correction/rejection UI |
| Q-07 | Is a recorded payment allowed to be entered only by the debtor, or can another group member record it? Are parties required to be active members at payment time? | Payment authorization and truthful attribution | Product owner | Before payment use-case authorization is finalized |
| Q-08 | For reports, does a balance mean current balance or balance as of the selected end date? Do date filters use expense/payment occurrence dates or record creation dates, and which time zone defines inclusive boundaries? | Report results and inclusive range correctness | Product owner | Before report contract and acceptance tests |
| Q-09 | Are expense descriptions/date/status edits allowed after submission? If so, which fields and what re-review/posting behavior? | Snapshot immutability and audit correctness | Product owner | Before edit operations are designed |
| Q-10 | Are there one or multiple receipt images per expense? Which actual image formats, maximum byte/pixel limits, malware/content scanning, and retention/deletion rules apply? | Storage policy, privacy, validation, cost, and testing | Product owner/security/operations | Before receipt upload implementation |
| Q-11 | What account deletion, data retention, export, backup, and financial audit-retention policies apply? | Privacy, compliance, account lifecycle, and recovery | Product owner/privacy/legal | Before production data storage |
| Q-12 | Are review levels configurable per full-product group, or group-wide; how are reviewer changes handled after submission? | Full-product extension model; not required for Swing MVP | Product owner | Before full-product multi-level approval design |

## Technical and operational decisions

| ID | Question / decision needed | Impact | Owner | Decision timing |
|---|---|---|---|---|
| Q-13 | Approve the proposed shared Java service boundary and PostgreSQL candidate, or choose another deployment/database topology? | Build, transactions, performance, API, ops, and client connectivity | Project architect/maintainer | Before implementation architecture is baselined |
| Q-14 | What email provider and sender domain are authorized? What verification/invitation/notice templates, retry limits, alerting, privacy wording, and delivery expectation apply? | FR-001/002/007 and durable notification operations | Product owner/operations | Before integration implementation |
| Q-15 | What does “signed out at submission time” mean when a member has multiple devices/sessions or signs out concurrently? Which session snapshot point is authoritative? | Correct FR-007 recipient channel selection | Product owner | Before notification workflow implementation |
| Q-16 | What password hashing algorithm/parameters, TOTP policy, key-management facility, session lifetime/revocation, rate limits, lockout, and MFA recovery policy are approved? | NFR-001 security, privacy, operational risk | Security owner | Before authentication implementation |
| Q-17 | What HTTP/API format, versioning, transport termination, desktop session storage, and client update/packaging approach are approved? | Interoperability and future platform evolution | Project architect/security owner | Before client/service contract and deployment |
| Q-18 | What receipt storage provider and upload lifecycle are approved, including orphan cleanup after failed expense submission? | Receipt confidentiality, reliability, and operations | Operations/security owner | Before receipt adapter implementation |
| Q-19 | What normal operating conditions, concurrency, hosting capacity, dataset distribution, and measurement environment define the NFR-003 2-second target? | Performance acceptance cannot be reproducible without these inputs | Product owner/operations | Before benchmark design |
| Q-20 | What is the intended role of the proposed `BalancePosition` projection; what reconciliation cadence and alert ownership are needed if it is enabled? | Read consistency/performance/operational repair | Architect/operations | Before projection is implemented |

## Decision blockers

- Q-01 blocks a claim that every possible split is deterministically resolved.
- Q-02 blocks final money scale/schema and broad currency acceptance.
- Q-13 blocks an implementation baseline and a reproducible build.
- Q-16 blocks production-ready authentication/security configuration.
- Q-19 blocks valid NFR-003 performance acceptance.
- Q-20 is not an MVP blocker if balances are computed directly from the ledger, but must be decided before adding a projection.
