/**
 * SchemaSense - Normalization Smells (Smells 14 - 19)
 * Detects 1NF, 2NF, 3NF, BCNF, 4NF, and 5NF violations
 */

class NormalizationSmellDetector {
    /**
     * Run all Normalization smell detectors across the schema
     * @param {Schema} schema 
     * @param {object} context 
     * @returns {SmellResult[]}
     */
    static detectAll(schema, context = {}) {
        const results = [];
        const defs = SMELL_DEFINITIONS.filter(d => d.category === SMELL_CATEGORIES.NORMALIZATION);

        const d14 = defs.find(d => d.id === 'NORM-014');
        const d15 = defs.find(d => d.id === 'NORM-015');
        const d16 = defs.find(d => d.id === 'NORM-016');
        const d17 = defs.find(d => d.id === 'NORM-017');
        const d18 = defs.find(d => d.id === 'NORM-018');
        const d19 = defs.find(d => d.id === 'NORM-019');

        for (const table of schema.tables) {
            const normAnalysis = DependencyEngine.analyzeTableNormalization(table, context);
            const steps = normAnalysis.steps;

            // 14. 1NF Violation
            if (steps.oneNF.status === 'FAIL') {
                results.push(new SmellResult({
                    smellDef: d14,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' violates First Normal Form (1NF): ${steps.oneNF.reasons.join(' ')}`,
                    example: steps.oneNF.violations.join('; '),
                    recommendation: `Ensure all attributes contain atomic values, eliminate repeating groups into child tables, and enforce a unique primary key.`
                }));
            }

            // 15. 2NF Violation (Partial Dependency)
            if (steps.twoNF.status === 'FAIL') {
                results.push(new SmellResult({
                    smellDef: d15,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' violates Second Normal Form (2NF): ${steps.twoNF.reasons.join(' ')}`,
                    example: steps.twoNF.violations.join('; '),
                    recommendation: `Decompose table '${table.name}' into 2NF: Extract partially dependent columns into a separate relation where the determinant subset forms the primary key.`
                }));
            } else if (steps.twoNF.status === 'NEEDS DEPENDENCY INFORMATION') {
                results.push(new SmellResult({
                    smellDef: d15,
                    status: 'Potential / Needs Review',
                    severity: 'MEDIUM',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table has a composite primary key (${table.primaryKey.join(', ')}). Without explicit functional dependencies, 2NF compliance cannot be verified with certainty.`,
                    example: `Composite Primary Key: (${table.primaryKey.join(', ')})`,
                    recommendation: `Supply functional dependencies in Tab 3 (Advanced Analysis) to confirm if non-prime attributes depend on only part of the key.`
                }));
            }

            // 16. 3NF Violation (Transitive Dependency)
            if (steps.threeNF.status === 'FAIL') {
                results.push(new SmellResult({
                    smellDef: d16,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' violates Third Normal Form (3NF): ${steps.threeNF.reasons.join(' ')}`,
                    example: steps.threeNF.violations.join('; '),
                    recommendation: `Decompose table '${table.name}' into 3NF: Move the transitive determinant and its dependent attributes into a distinct relation.`
                }));
            } else if (steps.threeNF.status === 'NEEDS DEPENDENCY INFORMATION') {
                results.push(new SmellResult({
                    smellDef: d16,
                    status: 'Potential / Needs Review',
                    severity: 'MEDIUM',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Verification of 3NF (transitive dependencies) requires functional dependencies between non-key attributes.`,
                    example: `Attributes in ${table.name}: ${table.getColumnNames().slice(0, 4).join(', ')}...`,
                    recommendation: `Provide functional dependencies in the Advanced Analysis panel to verify transitive dependencies.`
                }));
            }

            // 17. BCNF Violation
            if (steps.bcnf.status === 'FAIL') {
                results.push(new SmellResult({
                    smellDef: d17,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' violates Boyce-Codd Normal Form (BCNF): ${steps.bcnf.reasons.join(' ')}`,
                    example: steps.bcnf.violations.join('; '),
                    recommendation: `Decompose into BCNF relations so that every non-trivial determinant is a candidate key.`
                }));
            }

            // 18. 4NF Violation (Multivalued Dependency)
            if (steps.fourNF.status === 'FAIL') {
                results.push(new SmellResult({
                    smellDef: d18,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' violates Fourth Normal Form (4NF): Multiple independent multivalued dependencies coexist in the same relation.`,
                    example: steps.fourNF.violations.join('; '),
                    recommendation: `Decompose into independent binary relations (e.g. R1(A, B) and R2(A, C)).`
                }));
            } else {
                results.push(new SmellResult({
                    smellDef: d18,
                    status: 'Potential / Needs Review',
                    severity: 'MEDIUM',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Potential Violation – Additional Multivalued Dependency (MVD) information required. 4NF cannot be determined reliably from DDL alone without declared multivalued facts.`,
                    example: `Table ${table.name} has ${table.columns.length} attributes`,
                    recommendation: `Specify multivalued dependencies (e.g. emp_id ->> skill) in Advanced Options to perform full 4NF verification.`
                }));
            }

            // 19. 5NF Violation (Join Dependency)
            if (steps.fiveNF.status === 'FAIL') {
                results.push(new SmellResult({
                    smellDef: d19,
                    status: 'Detected',
                    severity: 'MEDIUM',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' violates Fifth Normal Form (5NF / PJNF): Join dependency is not implied by candidate keys.`,
                    example: steps.fiveNF.violations.join('; '),
                    recommendation: `Decompose into 5NF project-join relations to eliminate cyclical multi-way redundancy.`
                }));
            } else {
                results.push(new SmellResult({
                    smellDef: d19,
                    status: 'Potential / Needs Review',
                    severity: 'LOW',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Potential Violation – Additional Join Dependency (JD) information required. 5NF applies to ternary or n-ary relations where decomposition into binary joins causes lossy joins.`,
                    example: `Relation: ${table.name}`,
                    recommendation: `Document business join dependencies if ternary constraints govern valid combinations of attributes.`
                }));
            }
        }

        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NormalizationSmellDetector };
}
