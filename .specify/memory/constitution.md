<!--
Sync Impact Report
Version change: unversioned scaffold -> 1.0.0
Modified principles: none; this establishes the initial project principles.
Added sections: Customer Requirements and Implementation Decisions;
  Delivery Workflow and Quality Gates.
Removed sections: none.
Follow-up TODOs: none.
-->
# SplitSmart Constitution

## Core Principles

### I. Java 21 and Maven
The application MUST target Java 21 and use Maven as its build and dependency
management system. The Maven project configuration MUST declare the Java
release level and required dependencies so builds can be reproduced.

### II. Java Swing Presentation
The desktop graphical user interface MUST use Java Swing. Swing components
MUST remain presentation elements and MUST NOT become the source of domain
rules or financial calculations. The Swing implementation decision does not
replace or redefine customer requirements for web, Android, or iOS support.

### III. Object-Oriented Design
Production code MUST use object-oriented design with clear responsibilities,
encapsulation of mutable state, and cohesive classes. Abstractions MUST serve
an identified requirement or maintainability need; unnecessary patterns and
frameworks MUST NOT be introduced.

### IV. Separation of GUI and Business Logic
Business rules MUST reside outside Swing event handlers and view components.
GUI actions MUST call application or domain operations, and those operations
MUST be testable without constructing or displaying the GUI. This separation
allows business behavior to be verified independently of presentation.

### V. Exact Money Arithmetic
All monetary amounts and calculations MUST use `BigDecimal`; `float` and
`double` MUST NOT be used for money. Currency scale, rounding rules, and
percentage-split remainder allocation MUST be explicit, deterministic, and
consistent so that allocated shares reconcile to the expense total.

### VI. JUnit 5 Verification
Automated tests MUST use JUnit 5. Tests MUST cover business behavior and
financial edge cases, including expense splits, balance changes, and payment
settlement. GUI-dependent tests MUST be limited to behavior that cannot be
verified at the business or application boundary.

### VII. PlantUML Design Artifacts
Architecture and interaction diagrams maintained for the project MUST use
PlantUML source. Diagram source MUST be kept with the project and updated when
the represented design changes, so diagrams remain reviewable and consistent
with the implementation.

### VIII. Requirement Traceability
Each implemented customer requirement MUST be traceable from its source
requirement through its specification and acceptance criteria to relevant
implementation and verification evidence. Changes to scope MUST identify
affected requirements and tests; implementation decisions MUST NOT silently
alter customer commitments.

### IX. Human Review of AI Output
AI-generated requirements, designs, code, tests, and documentation MUST be
reviewed by a responsible human before acceptance. Reviewers MUST check
correctness, requirement alignment, security and privacy implications, and
test results; AI output MUST NOT be treated as verified evidence by itself.

## Customer Requirements and Implementation Decisions

`UserRequirement.md` is the source for customer-requested product outcomes,
including accounts, groups, expenses and receipts, notifications, approval,
balances, payments, reporting, and web, Android, and iOS availability.
Java 21, Maven, Swing, JUnit 5, PlantUML, and the design practices in this
constitution are implementation decisions, not additional customer
requirements. They MUST be applied without representing desktop Swing as
satisfying the requested web or mobile platforms. Any change to customer
scope or commitment MUST be made explicitly through the requirements process
and reviewed with the appropriate stakeholders.

## Delivery Workflow and Quality Gates

Maven MUST provide the standard project build and test entry point. Changes
MUST include or update JUnit 5 tests for affected business behavior and
MUST preserve traceability to the requirements they address. Design changes
that affect documented architecture or interactions MUST update their
PlantUML source. Before acceptance, a human reviewer MUST verify the change
against its requirements, tests, and this constitution, including any
AI-generated contribution.

## Governance

This constitution governs project decisions and MUST be considered during
specification, implementation, and review. Amendments MUST be made in a
reviewable change that records the reason, affected principles, and any
required follow-up work. Project maintainers MUST review proposed amendments
for consistency with customer requirements and with existing commitments.

The constitution uses semantic versioning. A MAJOR increment denotes a
backward-incompatible governance change, including removing or redefining a
principle. A MINOR increment denotes a new principle or materially expanded
governance. A PATCH increment denotes a clarification or other
non-semantic refinement. Compliance MUST be checked during reviews of
specifications and implementation changes; deviations MUST be documented
with their rationale and approved by the responsible project reviewer.

**Version**: 1.0.0 | **Ratified**: 2026-10-29 | **Last Amended**: 2026-10-29
