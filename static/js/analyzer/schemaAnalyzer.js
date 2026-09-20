/**
 * SchemaSense - Master Schema Analyzer
 * Orchestrates SQL Parsing, Constraint Analysis, Functional Dependency Resolution,
 * Normalization Ladder (1NF-5NF), Anomaly Generation, Physical/Indexing, and Distributed Analysis.
 */

class SchemaAnalyzer {
    constructor() {
        this.parser = new SQLParser();
    }

    /**
     * Run full end-to-end analysis on either raw SQL text or pre-built Schema object
     * @param {string|Schema} input 
     * @param {object} context 
     * @returns {object} Analysis results bundle
     */
    analyze(input, context = {}) {
        let schema;
        let parseResult = { success: true, errors: [], warnings: [] };

        if (typeof input === 'string') {
            parseResult = this.parser.parse(input);
            if (!parseResult.success) {
                return {
                    success: false,
                    errors: parseResult.errors,
                    warnings: parseResult.warnings,
                    schema: null,
                    smells: [],
                    normalization: {},
                    summary: null
                };
            }
            schema = parseResult.schema;
        } else {
            schema = input;
        }

        // Merge context advanced options into schema
        if (context.advancedOptions) {
            schema.advancedOptions = { ...schema.advancedOptions, ...context.advancedOptions };
        }

        // Attach context functional dependencies to tables if provided
        // In relational theory, X -> Y applies to relation R iff X ⊆ Attrs(R)
        if (context.functionalDependenciesText) {
            const parsedFDs = DependencyEngine.parseFDString(context.functionalDependenciesText);
            for (const table of schema.tables) {
                const tableCols = table.getColumnNames().map(c => c.toLowerCase());
                const relevantFDs = [];
                for (const fd of parsedFDs) {
                    const detInTable = fd.determinant.every(attr => tableCols.includes(attr.toLowerCase()));
                    if (detInTable) {
                        const depInTable = fd.dependent.filter(attr => tableCols.includes(attr.toLowerCase()) && !fd.determinant.includes(attr.toLowerCase()));
                        if (depInTable.length > 0) {
                            relevantFDs.push(new FunctionalDependency(fd.determinant, depInTable));
                        }
                    }
                }
                table.functionalDependencies.push(...relevantFDs);
            }
        }

        // 1. Execute all smell detection engines
        const relationalSmells = RelationalSmellDetector.detectAll(schema, context);
        const normalizationSmells = NormalizationSmellDetector.detectAll(schema, context);
        const consequenceSmells = ConsequenceSmellDetector.detectAll(schema, context);
        const indexingSmells = IndexingSmellDetector.detectAll(schema, context);
        const distributedSmells = DistributedSmellDetector.detectAll(schema, context);

        const allSmells = [
            ...relationalSmells,
            ...normalizationSmells,
            ...consequenceSmells,
            ...indexingSmells,
            ...distributedSmells
        ];

        // 2. Perform table-by-table normalization analysis
        const normalizationReport = {};
        for (const table of schema.tables) {
            normalizationReport[table.name] = DependencyEngine.analyzeTableNormalization(table, context);
        }

        // Determine overall highest normal form across all tables
        const overallNF = this._computeOverallNormalForm(normalizationReport);

        // 3. Compute Transparent Schema Health & Issue Counts
        // Critical Issues = HIGH severity detected smells
        // Warnings = MEDIUM severity detected smells or high potential smells
        // Suggestions = LOW severity detected smells
        const detectedSmells = allSmells.filter(s => s.status === 'Detected');
        const potentialSmells = allSmells.filter(s => s.status === 'Potential / Needs Review');

        const criticalCount = detectedSmells.filter(s => s.severity === 'HIGH').length;
        const warningCount = detectedSmells.filter(s => s.severity === 'MEDIUM').length;
        const suggestionCount = detectedSmells.filter(s => s.severity === 'LOW').length + potentialSmells.length;

        let healthStatus = 'Good';
        let healthDescription = 'The schema exhibits sound relational modeling and complies with core constraints.';
        if (criticalCount >= 2 || (criticalCount >= 1 && warningCount >= 3)) {
            healthStatus = 'Significant Issues';
            healthDescription = 'Multiple critical integrity or normalization smells detected that may cause data anomalies and runtime failures.';
        } else if (criticalCount >= 1 || warningCount >= 2) {
            healthStatus = 'Needs Attention';
            healthDescription = 'Design contains several structural flaws or missing constraints that should be addressed before production use.';
        }

        // 4. Metrics bundle
        const summary = {
            totalTables: schema.tables.length,
            totalColumns: schema.getTotalColumnsCount(),
            totalPrimaryKeys: schema.getTotalPrimaryKeysCount(),
            totalForeignKeys: schema.getTotalForeignKeysCount(),
            totalUniqueConstraints: schema.tables.reduce((acc, t) => acc + t.uniqueConstraints.length, 0),
            totalIndexes: schema.getTotalIndexesCount(),
            totalSmellsDetected: detectedSmells.length,
            totalPotentialSmells: potentialSmells.length,
            criticalCount,
            warningCount,
            suggestionCount,
            healthStatus,
            healthDescription,
            overallNormalForm: overallNF,
            categoryCounts: {
                [SMELL_CATEGORIES.RELATIONAL]: allSmells.filter(s => s.category === SMELL_CATEGORIES.RELATIONAL && s.status === 'Detected').length,
                [SMELL_CATEGORIES.NORMALIZATION]: allSmells.filter(s => s.category === SMELL_CATEGORIES.NORMALIZATION && s.status === 'Detected').length,
                [SMELL_CATEGORIES.CONSEQUENCE]: allSmells.filter(s => s.category === SMELL_CATEGORIES.CONSEQUENCE && s.status === 'Detected').length,
                [SMELL_CATEGORIES.INDEXING]: allSmells.filter(s => s.category === SMELL_CATEGORIES.INDEXING && s.status === 'Detected').length,
                [SMELL_CATEGORIES.DISTRIBUTED]: allSmells.filter(s => s.category === SMELL_CATEGORIES.DISTRIBUTED && s.status === 'Detected').length
            },
            tableSmellCounts: this._computeTableSmellCounts(schema, allSmells)
        };

        // 5. Syllabus Concepts Demonstrated in this run
        const demonstratedConcepts = this._extractDemonstratedConcepts(allSmells);

        return {
            success: true,
            schema,
            parseWarnings: parseResult.warnings,
            smells: allSmells,
            detectedSmells,
            potentialSmells,
            normalization: normalizationReport,
            summary,
            demonstratedConcepts,
            timestamp: new Date().toISOString()
        };
    }

    _computeOverallNormalForm(normReport) {
        const order = ['Unnormalized / Below 1NF', '1NF (2NF Needs FDs)', '1NF', '2NF (3NF Needs FDs)', '2NF', '3NF', 'BCNF', '4NF', '5NF'];
        const values = Object.values(normReport).map(r => r.highestNF);
        if (values.length === 0) return 'Unable to Determine';

        // Find the lowest normal form among all relations (weakest link in the schema)
        let minIndex = 999;
        for (const val of values) {
            const idx = order.indexOf(val);
            if (idx >= 0 && idx < minIndex) {
                minIndex = idx;
            }
        }

        return minIndex !== 999 ? order[minIndex] : 'Unable to Determine';
    }

    _computeTableSmellCounts(schema, smells) {
        const counts = {};
        schema.tables.forEach(t => counts[t.name] = 0);
        smells.filter(s => s.status === 'Detected').forEach(s => {
            for (const t of schema.tables) {
                if (s.affectedObject && s.affectedObject.includes(t.name)) {
                    counts[t.name] = (counts[t.name] || 0) + 1;
                }
            }
        });
        return counts;
    }

    _extractDemonstratedConcepts(smells) {
        const concepts = new Set();
        smells.filter(s => s.status === 'Detected' || s.status === 'Potential / Needs Review').forEach(s => {
            concepts.add(s.syllabus);
        });
        return Array.from(concepts);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SchemaAnalyzer };
}
