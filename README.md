# SchemaSense – Database Schema Smell Detector

An academic web application developed for the **B.Tech Database Systems** course under the guidance of **Dr. Swaminathan A**, Assistant Professor.

---

## 🎯 Overview

**SchemaSense** allows students, researchers, and instructors to input or upload relational database schemas (via SQL DDL or interactive visual modeling) and automatically detects **33 common database design smells** based on concepts from Modules 1 to 5 of the Database Systems curriculum.

The application:
1. **Parses** SQL DDL schemas (tables, columns, datatypes, PKs, FKs, UNIQUE, NOT NULL, CHECK, indexes).
2. **Computes** functional dependency closures, candidate keys, and Armstrong's axioms.
3. **Analyzes** normalization step-by-step from **1NF through 5NF**.
4. **Detects** 33 database design smells across 5 distinct categories.
5. **Generates** concrete schema-grounded examples of Update, Insert, and Delete anomalies.
6. **Renders** interactive SVG ER diagrams with problem-highlight badges and foreign key relationship connectors.
7. **Provides** side-by-side Before vs After normalization redesign recommendations.
8. **Generates** comprehensive academic reports downloadable in **PDF**, **TXT**, and **JSON** formats.
9. **Includes** an automated 12-scenario test runner to verify algorithmic correctness.

---

## 📚 Syllabus Mapping & The 33 Implemented Smells

### A. Relational Schema Smells (Module 1 & 2)
1. **Missing Primary Key (REL-001):** Tables without primary keys violating entity integrity.
2. **Missing Foreign Key (REL-002):** Inferred logical relationships lacking explicit referential integrity constraints.
3. **Missing NOT NULL Constraint (REL-003):** Identifying attributes permitting NULLs, triggering Three-Valued Logic bugs.
4. **Missing UNIQUE Constraint (REL-004):** Natural identifiers (e.g. email, roll_no) lacking candidate key uniqueness.
5. **Invalid / Inconsistent Foreign Key (REL-005):** Mismatched datatypes or references to non-existent tables/columns.
6. **Redundant Column (REL-006):** Persistent columns duplicating easily computable/joined attributes.
7. **Redundant Data / Data Duplication (REL-007):** Descriptive attributes replicated across multiple independent relations.
8. **Multivalued / Non-Atomic Column (REL-008):** Delimited lists (e.g. CSV phone numbers or tags) violating 1NF.
9. **Repeating Groups (REL-009):** Sequentially numbered columns (e.g. `phone1, phone2`, `subject1, subject2`) violating 1NF.
10. **Derived Attribute Stored Unnecessarily (REL-010):** Stored computable values (e.g. `age` alongside `date_of_birth`).
11. **Poor / Ambiguous Naming (REL-011):** Reserved, overly generic, or uninformative identifiers (`data`, `val`, `info`).
12. **Inconsistent Data Types (REL-012):** Identically named attributes using conflicting datatypes across tables.
13. **Excessive NULLable Columns (REL-013):** Tables with >60% nullable attributes, indicating collapsed entity subtyping.

### B. Normalization Smells (Module 2)
14. **1NF Violation (NORM-014):** Non-atomic values, repeating groups, or missing primary keys.
15. **2NF Violation (NORM-015):** Partial functional dependencies on composite candidate keys (\(X \subset CK \rightarrow Y\)).
16. **3NF Violation (NORM-016):** Transitive dependencies between non-prime attributes (\(X \rightarrow Y \rightarrow Z\)).
17. **BCNF Violation (NORM-017):** Non-trivial functional dependencies where the determinant is not a superkey.
18. **4NF Violation (NORM-018):** Independent multivalued facts (\(X \twoheadrightarrow Y\)) stored together (with clear dependency caveat).
19. **5NF Violation (NORM-019):** Cyclical or ternary join dependencies requiring multi-way decomposition (with clear JD caveat).

### C. Normalization Consequence Smells (Module 2)
20. **Update Anomaly Risk (ANOM-020):** Duplicated facts requiring multi-row updates, risking inconsistent state.
21. **Insert Anomaly Risk (ANOM-021):** Inability to insert independent catalog facts without dummying parent keys.
22. **Delete Anomaly Risk (ANOM-022):** Unintended cascading loss of independent entities when deleting a child record.

### D. Physical Design & Indexing Smells (Module 3)
23. **Missing Index on Frequently Used FK / Search Column (IDX-023):** Foreign keys without B+ tree index causing full table scans.
24. **Redundant / Duplicate Index (IDX-024):** Exact duplicate indexes or indexes that duplicate the left prefix of composite indexes.
25. **Over-Indexing (IDX-025):** Excessive secondary indexes causing severe B+ tree rebalancing overhead on DML writes.
26. **Low-Selectivity Index (IDX-026):** Indexes on low-cardinality flags (e.g. boolean `is_active`) ignored by query optimizers.
27. **Wide / Poorly Designed Index (IDX-027):** Compound indexes spanning >4 columns causing buffer cache bloat and reduced fanout.

### E. Distributed & NoSQL Smells (Module 5)
28. **Excessive Duplication in NoSQL (DIST-028):** Uncontrolled denormalization creating dual-write consistency overhead.
29. **Unbounded Document / Array (DIST-029):** Embedded arrays (e.g. comments) risking the 16MB document size ceiling in MongoDB.
30. **Poor Partition Key / Hot Partition Risk (DIST-030):** Low-cardinality shard keys bottlenecking write traffic on a single node.
31. **Poor Fragmentation Strategy (DIST-031):** Complex hybrid fragmentation causing expensive distributed cross-partition joins.
32. **Excessive Replication Factor (DIST-032):** Replication factors (>3) causing high write quorum latency without availability benefits.
33. **CAP / Consistency Requirement Mismatch (DIST-033):** Infeasible simultaneous demand for CP + AP under Brewer's theorem.

---

## 🚀 How to Run

### Requirements
- Python 3.8+ (Tested on Python 3.13)
- Modern Web Browser (Chrome, Edge, Firefox)

### Quick Start
1. Double click `run.bat`, **OR** run from PowerShell / terminal:
   ```bash
   python app.py
   ```
2. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 🧪 Automated Verification Test Suite (12 Scenarios)
The application features a built-in automated test runner executing:
1. **Perfect Relational Schema:** Validates 3NF/BCNF compliance with 0 critical issues.
2. **Schema Without Primary Keys:** Tests entity integrity enforcement (REL-001).
3. **Schema With Missing Foreign Keys:** Tests logical relation inference (REL-002).
4. **Schema With Multivalued Attributes:** Tests 1NF atomicity detection (REL-008).
5. **Schema With Repeating Groups:** Tests sequential column detection (REL-009).
6. **Schema With 2NF Violation:** Tests composite key partial dependency flagging (NORM-015).
7. **Schema With 3NF Violation:** Tests transitive dependency flagging (NORM-016).
8. **Schema With Indexing Problems:** Tests missing index on foreign key (IDX-023).
9. **Schema With Duplicate Indexes:** Tests duplicate and prefix index detection (IDX-024).
10. **Invalid SQL Input:** Tests line-tracked syntax error handling without crashing.
11. **Empty Input:** Tests empty string validation rejection.
12. **Partially Specified Dependency Info:** Tests the engine's explicit labeling of "Needs Dependency Information".

---

## 👨‍🏫 Project Credits & Guidance
- **Faculty Guide:** Dr. Swaminathan A, Assistant Professor, Department of Computer Science & Engineering
- **Student Contributors:** [ENTER NAME] ([ENTER REGISTER NUMBER])
- **Course:** B.Tech Database Systems
