/**
 * SchemaSense - Master Smell Registry
 * Contains metadata, syllabus module mappings, and categorization for all 33 database design smells.
 */

const SMELL_CATEGORIES = {
    RELATIONAL: 'Relational Schema',
    NORMALIZATION: 'Normalization',
    CONSEQUENCE: 'Normalization Consequences / Anomalies',
    INDEXING: 'Physical Design & Indexing',
    DISTRIBUTED: 'Distributed & NoSQL Design'
};

const SEVERITIES = {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
};

const SYLLABUS_MODULES = {
    MODULE_1: 'Module 1: Database Systems, Relational Model & Constraints',
    MODULE_2: 'Module 2: ER Modeling, Relational Guidelines & Normalization (1NF–5NF)',
    MODULE_3: 'Module 3: Physical Database Design, Indexing (B+ Tree, LSM) & Query Optimization',
    MODULE_4: 'Module 4: Transactions, ACID Properties & Concurrency Control',
    MODULE_5: 'Module 5: Distributed Databases, Fragmentation, Replication, NoSQL & CAP Theorem'
};

const SMELL_DEFINITIONS = [
    // A. RELATIONAL SCHEMA SMELLS (1 - 13)
    {
        id: 'REL-001',
        number: 1,
        name: 'Missing Primary Key',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Entity Integrity & Relational Model Fundamentals',
        description: 'Table does not define a Primary Key, violating entity integrity and hindering tuple distinction.',
        recommendation: 'Identify a unique candidate key (e.g. natural key or surrogate auto-increment ID) and declare it as PRIMARY KEY.'
    },
    {
        id: 'REL-002',
        number: 2,
        name: 'Missing Foreign Key',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Referential Integrity & Foreign Key Constraints',
        description: 'Column logically references another table (e.g. name pattern table_id) but lacks an explicit FOREIGN KEY constraint.',
        recommendation: 'Add an explicit FOREIGN KEY constraint referencing the parent table primary key to prevent orphaned records.'
    },
    {
        id: 'REL-003',
        number: 3,
        name: 'Missing NOT NULL Constraint',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Domain Constraints & Three-Valued Logic (3VL)',
        description: 'Mandatory identifying attributes (such as names, dates, foreign keys, or codes) permit NULL values.',
        recommendation: 'Enforce NOT NULL constraints on critical business attributes to prevent three-valued logic bugs and data corruption.'
    },
    {
        id: 'REL-004',
        number: 4,
        name: 'Missing UNIQUE Constraint',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Key Constraints & Candidate Keys',
        description: 'Natural identifying attributes (e.g. email, roll_number, ssn, barcode, username) lack a UNIQUE constraint.',
        recommendation: 'Add a UNIQUE constraint or unique index to enforce candidate key integrity in the database engine.'
    },
    {
        id: 'REL-005',
        number: 5,
        name: 'Invalid / Inconsistent Foreign Key',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Referential Integrity & Type Compatibility',
        description: 'Foreign key references a non-existent table, non-key column, or has incompatible datatypes with the referenced key.',
        recommendation: 'Align data types exactly with the referenced candidate key and verify the target table and column exist.'
    },
    {
        id: 'REL-006',
        number: 6,
        name: 'Redundant Column',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Guidelines for Relational Schema Design',
        description: 'Column duplicates data that is easily obtainable through existing relationships or joins with other tables.',
        recommendation: 'Remove the redundant column and retrieve the attribute via SQL joins or relational views.'
    },
    {
        id: 'REL-007',
        number: 7,
        name: 'Redundant Data / Data Duplication',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Data Redundancy & Storage Inefficiency',
        description: 'Identical descriptive attributes (e.g. department_name, instructor_name) are duplicated across multiple tables.',
        recommendation: 'Decompose the schema into distinct entity relations linked by foreign keys to achieve single-source-of-truth.'
    },
    {
        id: 'REL-008',
        number: 8,
        name: 'Multivalued / Non-Atomic Column',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'First Normal Form (1NF) & Atomicity of Domains',
        description: 'Attribute stores composite or delimited lists (e.g. comma-separated phone numbers, CSV tags, multi-skills).',
        recommendation: 'Create a dedicated child relation with a composite primary key or foreign key to preserve domain atomicity.'
    },
    {
        id: 'REL-009',
        number: 9,
        name: 'Repeating Groups',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'First Normal Form (1NF) & Relational Guidelines',
        description: 'Columns are numbered sequentially (phone1, phone2, subject1, subject2, address1, address2) to store repetitive lists.',
        recommendation: 'Normalize into a separate table with one row per item, linked via foreign key to the parent entity.'
    },
    {
        id: 'REL-010',
        number: 10,
        name: 'Derived Attribute Stored Unnecessarily',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.LOW,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'ER Attributes (Derived vs Stored) & Consistency',
        description: 'Attribute can be computed dynamically from other stored columns (e.g. age from date_of_birth, total from price * qty).',
        recommendation: 'Drop the physical column and compute it dynamically in queries, generated columns, or database views.'
    },
    {
        id: 'REL-011',
        number: 11,
        name: 'Poor / Ambiguous Naming',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.LOW,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Schema Design Standards & Data Dictionary',
        description: 'Generic, reserved, or vague identifiers (e.g. data, info, value, date, type, status) reduce schema clarity.',
        recommendation: 'Rename to clear, domain-specific identifiers (e.g. order_status, registration_date, employee_payload).'
    },
    {
        id: 'REL-012',
        number: 12,
        name: 'Inconsistent Data Types',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Domain Constraints & Cross-Table Consistency',
        description: 'Logically equivalent attributes (e.g. user_id or department_id) use mismatched data types across different tables.',
        recommendation: 'Standardize attribute datatypes across all referring tables (e.g. INT across all foreign keys).'
    },
    {
        id: 'REL-013',
        number: 13,
        name: 'Excessive NULLable Columns',
        category: SMELL_CATEGORIES.RELATIONAL,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_1,
        concept: 'Relational Design & Subtyping / Specialization',
        description: 'A high proportion (>50%) of table columns permit NULLs, indicating sparse modeling or collapsed entity hierarchies.',
        recommendation: 'Extract optional attributes into specialized subtype tables or separate extension relations.'
    },

    // B. NORMALIZATION SMELLS (14 - 19)
    {
        id: 'NORM-014',
        number: 14,
        name: '1NF Violation',
        category: SMELL_CATEGORIES.NORMALIZATION,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'First Normal Form (1NF) & Tuple Uniqueness',
        description: 'Relation contains non-atomic attributes, repeating groups, or lacks a unique tuple identifier.',
        recommendation: 'Eliminate repeating groups, ensure domain values are atomic, and define a unique primary key.'
    },
    {
        id: 'NORM-015',
        number: 15,
        name: '2NF Violation (Partial Dependency)',
        category: SMELL_CATEGORIES.NORMALIZATION,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Second Normal Form (2NF) & Full Functional Dependency',
        description: 'Non-prime attribute depends on a proper subset of a composite candidate key (X -> Y where X ⊂ Candidate Key).',
        recommendation: 'Decompose the table: Move partially dependent attributes into a new table with the determinant as primary key.'
    },
    {
        id: 'NORM-016',
        number: 16,
        name: '3NF Violation (Transitive Dependency)',
        category: SMELL_CATEGORIES.NORMALIZATION,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Third Normal Form (3NF) & Transitive Dependencies',
        description: 'Non-prime attribute depends on another non-prime attribute (X -> Y -> Z), causing update anomalies.',
        recommendation: 'Decompose relation into 3NF: Create a separate table for the determinant and its dependent attributes.'
    },
    {
        id: 'NORM-017',
        number: 17,
        name: 'BCNF Violation',
        category: SMELL_CATEGORIES.NORMALIZATION,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Boyce-Codd Normal Form (BCNF) & Superkey Determinants',
        description: 'A non-trivial functional dependency exists where the determinant is not a candidate key/superkey.',
        recommendation: 'Decompose into relations where every non-trivial determinant is a superkey, ensuring lossless join.'
    },
    {
        id: 'NORM-018',
        number: 18,
        name: '4NF Violation (Multivalued Dependency)',
        category: SMELL_CATEGORIES.NORMALIZATION,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Fourth Normal Form (4NF) & Multivalued Dependencies (MVD)',
        description: 'Two or more independent multi-valued facts about an entity are stored together in a single relation.',
        recommendation: 'Decompose relation into independent binary relations (e.g. Employee-Skills and Employee-Languages).'
    },
    {
        id: 'NORM-019',
        number: 19,
        name: '5NF Violation (Join Dependency)',
        category: SMELL_CATEGORIES.NORMALIZATION,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Fifth Normal Form (5NF / PJNF) & Join Dependencies',
        description: 'Relation has a cyclic or ternary join dependency that cannot be decomposed into binary joins without loss.',
        recommendation: 'Decompose into 5NF projection relations if cyclical ternary constraints govern valid combinations.'
    },

    // C. NORMALIZATION CONSEQUENCE SMELLS (20 - 22)
    {
        id: 'ANOM-020',
        number: 20,
        name: 'Update Anomaly Risk',
        category: SMELL_CATEGORIES.CONSEQUENCE,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Data Anomalies & Redundancy Pitfalls',
        description: 'A single real-world fact is duplicated across multiple rows, requiring synchronized updates or risking inconsistency.',
        recommendation: 'Normalize schema to ensure each fact is stored in exactly one tuple in one table.'
    },
    {
        id: 'ANOM-021',
        number: 21,
        name: 'Insert Anomaly Risk',
        category: SMELL_CATEGORIES.CONSEQUENCE,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Data Anomalies & Artificial Key Requirements',
        description: 'A fact cannot be recorded without artificially inserting dummy or unrelated parent entity information.',
        recommendation: 'Separate independent entity concepts into independent tables with their own lifecycle.'
    },
    {
        id: 'ANOM-022',
        number: 22,
        name: 'Delete Anomaly Risk',
        category: SMELL_CATEGORIES.CONSEQUENCE,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_2,
        concept: 'Data Anomalies & Accidental Loss of Information',
        description: 'Deleting a record representing one entity unintentionally purges information about another distinct entity.',
        recommendation: 'Decompose into normalized relations so entity lifetimes are decoupled.'
    },

    // D. PHYSICAL DESIGN / INDEXING SMELLS (23 - 27)
    {
        id: 'IDX-023',
        number: 23,
        name: 'Missing Index on Frequently Used FK / Search Column',
        category: SMELL_CATEGORIES.INDEXING,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_3,
        concept: 'Indexing, B+ Trees & Query Optimization',
        description: 'Foreign key column or frequently queried search filter lacks an index, forcing full table scans on JOINs.',
        recommendation: 'Create a B+ Tree index on the foreign key column to accelerate JOIN and filter query processing.'
    },
    {
        id: 'IDX-024',
        number: 24,
        name: 'Redundant / Duplicate Index',
        category: SMELL_CATEGORIES.INDEXING,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_3,
        concept: 'B+ Tree Left-Prefix Matching & Index Storage',
        description: 'Index covers columns that are already the left prefix of another compound index or duplicates an existing index.',
        recommendation: 'Drop the redundant single-column index since the composite index left prefix already satisfies the queries.'
    },
    {
        id: 'IDX-025',
        number: 25,
        name: 'Over-Indexing',
        category: SMELL_CATEGORIES.INDEXING,
        defaultSeverity: SEVERITIES.LOW,
        syllabus: SYLLABUS_MODULES.MODULE_3,
        concept: 'Physical Design Trade-offs: Read Speed vs Write Overhead',
        description: 'Table has an excessive number of secondary indexes compared to column count, severely slowing DML operations.',
        recommendation: 'Consolidate or drop rarely queried indexes to reduce B+ tree leaf rebalancing overhead during INSERT/UPDATE.'
    },
    {
        id: 'IDX-026',
        number: 26,
        name: 'Low-Selectivity Index',
        category: SMELL_CATEGORIES.INDEXING,
        defaultSeverity: SEVERITIES.LOW,
        syllabus: SYLLABUS_MODULES.MODULE_3,
        concept: 'Index Selectivity & Query Optimizer Cost Models',
        description: 'Index created on a low-cardinality column (e.g. boolean is_active, status, gender) where sequential scans are cheaper.',
        recommendation: 'Drop index or replace with a partial/filtered index covering only minority rows if supported.'
    },
    {
        id: 'IDX-027',
        number: 27,
        name: 'Wide / Poorly Designed Index',
        category: SMELL_CATEGORIES.INDEXING,
        defaultSeverity: SEVERITIES.LOW,
        syllabus: SYLLABUS_MODULES.MODULE_3,
        concept: 'Index Page Fanout & Buffer Pool Footprint',
        description: 'Compound index contains more than 4 columns, decreasing B+ tree node fanout and increasing buffer cache bloat.',
        recommendation: 'Trim index columns to only high-selectivity predicates or consider index covering with INCLUDE clauses.'
    },

    // E. DISTRIBUTED & NOSQL SMELLS (28 - 33)
    {
        id: 'DIST-028',
        number: 28,
        name: 'Excessive Data Duplication in Distributed / NoSQL Design',
        category: SMELL_CATEGORIES.DISTRIBUTED,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_5,
        concept: 'NoSQL Data Modeling, Denormalization & Dual-Write Consistency',
        description: 'Extensive entity denormalization creates cross-document sync requirements without distributed transaction guarantees.',
        recommendation: 'Balance denormalization: duplicate only immutable read-heavy fields, or use event-driven eventual consistency.'
    },
    {
        id: 'DIST-029',
        number: 29,
        name: 'Unbounded Document / Array',
        category: SMELL_CATEGORIES.DISTRIBUTED,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_5,
        concept: 'Document Databases (MongoDB) & 16MB Document Limits',
        description: 'Embedding 1-to-N relationships as embedded arrays (e.g. comments, audit_logs) can grow indefinitely and exceed document size.',
        recommendation: 'Use referencing/bucketing instead of unbounded embedding for relationships with high cardinality.'
    },
    {
        id: 'DIST-030',
        number: 30,
        name: 'Poor Partition Key / Hot Partition Risk',
        category: SMELL_CATEGORIES.DISTRIBUTED,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_5,
        concept: 'Distributed Databases, Sharding & Horizontal Fragmentation',
        description: 'Selected partition key has low cardinality or monotonically increasing values (e.g. status, date), causing hotspot nodes.',
        recommendation: 'Choose a partition key with high cardinality and even distribution, or prepend a synthetic hash prefix.'
    },
    {
        id: 'DIST-031',
        number: 31,
        name: 'Poor Fragmentation Strategy',
        category: SMELL_CATEGORIES.DISTRIBUTED,
        defaultSeverity: SEVERITIES.MEDIUM,
        syllabus: SYLLABUS_MODULES.MODULE_5,
        concept: 'Horizontal & Vertical Fragmentation, Allocation & Query Shipping',
        description: 'Fragmentation predicate causes distributed cross-partition joins for standard application transactions.',
        recommendation: 'Align fragmentation boundaries with site locality and primary query predicates to minimize network hops.'
    },
    {
        id: 'DIST-032',
        number: 32,
        name: 'Excessive Replication Factor',
        category: SMELL_CATEGORIES.DISTRIBUTED,
        defaultSeverity: SEVERITIES.LOW,
        syllabus: SYLLABUS_MODULES.MODULE_5,
        concept: 'Replication, Quorum Protocols (R+W > N) & Network Overhead',
        description: 'Replication factor (>3) set unnecessarily high for non-critical entities, causing high write latencies and storage waste.',
        recommendation: 'Tune replication factor to 3 with appropriate read/write quorums to balance fault tolerance and write latency.'
    },
    {
        id: 'DIST-033',
        number: 33,
        name: 'CAP / Consistency Requirement Mismatch',
        category: SMELL_CATEGORIES.DISTRIBUTED,
        defaultSeverity: SEVERITIES.HIGH,
        syllabus: SYLLABUS_MODULES.MODULE_5,
        concept: 'CAP Theorem, PACELC & ACID vs BASE',
        description: 'Application demands immediate strict consistency across partitions while choosing an AP / BASE eventually consistent architecture.',
        recommendation: 'Align architecture with CAP realities: choose CP databases (Raft/Paxos) if consistency is non-negotiable under partition.'
    }
];

class SmellResult {
    constructor({ id, smellDef, status = 'Detected', severity = null, affectedObject, 
                  whyDetected, example, concept, recommendation, syllabus, technicalDetails = {} }) {
        this.id = id || smellDef.id;
        this.smellDef = smellDef;
        this.name = smellDef.name;
        this.category = smellDef.category;
        this.status = status; // 'Detected', 'Potential / Needs Review', 'Not Detected', 'Not Applicable'
        this.severity = severity || smellDef.defaultSeverity;
        this.affectedObject = affectedObject;
        this.whyDetected = whyDetected;
        this.example = example;
        this.concept = concept || smellDef.concept;
        this.recommendation = recommendation || smellDef.recommendation;
        this.syllabus = syllabus || smellDef.syllabus;
        this.technicalDetails = technicalDetails;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SMELL_CATEGORIES, SEVERITIES, SYLLABUS_MODULES, SMELL_DEFINITIONS, SmellResult };
}
