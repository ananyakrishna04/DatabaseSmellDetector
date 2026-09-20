/**
 * SchemaSense - Functional Dependency & Normalization Engine
 * Implements Armstrong's Axioms, Attribute Closure, Candidate Key Discovery,
 * and Rigorous 1NF, 2NF, 3NF, BCNF, 4NF, and 5NF Analysis.
 */

class DependencyEngine {
    constructor() {}

    /**
     * Parse functional dependencies text into an array of FunctionalDependency objects
     * Accepts formats like:
     *   student_id -> student_name, dept_id
     *   student_id, course_id -> grade
     *   A -> B; B -> C
     * @param {string} text 
     * @returns {FunctionalDependency[]}
     */
    static parseFDString(text) {
        if (!text || !text.trim()) return [];
        const lines = text.split(/[\n;]+/);
        const fds = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('--')) continue;

            const arrowParts = trimmed.split(/->|→/);
            if (arrowParts.length === 2) {
                const lhs = arrowParts[0].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                const rhs = arrowParts[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                if (lhs.length > 0 && rhs.length > 0) {
                    fds.push(new FunctionalDependency(lhs, rhs));
                }
            }
        }
        return fds;
    }

    /**
     * Compute attribute closure X+ under a set of FDs
     * @param {string[]} attributes - Initial attribute set X
     * @param {FunctionalDependency[]} fds - Set of functional dependencies
     * @returns {string[]} - Closure X+
     */
    static computeClosure(attributes, fds) {
        let closure = new Set(attributes.map(a => a.toLowerCase().trim()));
        let changed = true;

        while (changed) {
            changed = false;
            for (const fd of fds) {
                // Check if all determinant attributes are in the closure
                const isSubset = fd.determinant.every(det => closure.has(det.toLowerCase()));
                if (isSubset) {
                    for (const dep of fd.dependent) {
                        const lowerDep = dep.toLowerCase();
                        if (!closure.has(lowerDep)) {
                            closure.add(lowerDep);
                            changed = true;
                        }
                    }
                }
            }
        }

        return Array.from(closure).sort();
    }

    /**
     * Determine if attributes form a superkey for table attributes
     * @param {string[]} attributes 
     * @param {string[]} allTableAttributes 
     * @param {FunctionalDependency[]} fds 
     */
    static isSuperKey(attributes, allTableAttributes, fds) {
        const closure = this.computeClosure(attributes, fds);
        return allTableAttributes.every(attr => closure.includes(attr.toLowerCase()));
    }

    /**
     * Discover all candidate keys of a relation using closure
     * @param {string[]} allTableAttributes 
     * @param {FunctionalDependency[]} fds 
     * @returns {string[][]} Array of candidate keys (each is an array of column names)
     */
    static findCandidateKeys(allTableAttributes, fds) {
        const attrs = allTableAttributes.map(a => a.toLowerCase());
        if (attrs.length === 0) return [];
        if (fds.length === 0) return [attrs]; // Trivial case: all attributes form the key

        // Attributes that never appear on the RHS of any FD must be part of every candidate key
        const rhsAttrs = new Set();
        fds.forEach(fd => fd.dependent.forEach(d => rhsAttrs.add(d.toLowerCase())));
        const mustInclude = attrs.filter(a => !rhsAttrs.has(a));

        // Check if mustInclude is already a superkey
        if (this.isSuperKey(mustInclude, attrs, fds)) {
            return [mustInclude.sort()];
        }

        // Generate power set search for minimal superkeys
        const remaining = attrs.filter(a => !mustInclude.includes(a));
        const candidateKeys = [];

        // Helper to generate combinations of given size
        function getCombinations(arr, k) {
            if (k === 0) return [[]];
            if (arr.length === 0) return [];
            const head = arr[0];
            const tail = arr.slice(1);
            const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
            const withoutHead = getCombinations(tail, k);
            return [...withHead, ...withoutHead];
        }

        let foundMinLength = null;
        for (let size = 0; size <= remaining.length; size++) {
            const combos = getCombinations(remaining, size);
            for (const combo of combos) {
                const testKey = [...mustInclude, ...combo];
                if (this.isSuperKey(testKey, attrs, fds)) {
                    // Check minimality: no subset should be a candidate key
                    const isMinimal = !candidateKeys.some(ck => ck.every(k => testKey.includes(k)));
                    if (isMinimal) {
                        candidateKeys.push(testKey.sort());
                        foundMinLength = testKey.length;
                    }
                }
            }
            // Optimization: candidate keys don't need to check sizes larger than twice min key
            if (foundMinLength !== null && size > foundMinLength + 1) break;
        }

        return candidateKeys.length > 0 ? candidateKeys : [attrs];
    }

    /**
     * Conduct full Normalization Analysis (1NF to 5NF) for a Table
     * @param {Table} table 
     * @param {object} context 
     */
    static analyzeTableNormalization(table, context = {}) {
        const allCols = table.getColumnNames().map(c => c.toLowerCase());
        const primaryKey = table.primaryKey.map(c => c.toLowerCase());
        const fds = table.functionalDependencies || [];

        // 1. 1NF Check
        const oneNF = {
            level: '1NF',
            status: 'PASS',
            reasons: [],
            violations: []
        };

        if (primaryKey.length === 0) {
            oneNF.status = 'FAIL';
            oneNF.reasons.push(`Table '${table.name}' has no Primary Key defined (violates Entity Integrity and 1NF).`);
            oneNF.violations.push('No Primary Key');
        }

        // Check for repeating groups / multivalued columns in column names
        const repeatingPattern = /^(.*?)(\d+)$/i;
        const groupPrefixes = {};
        for (const col of table.columns) {
            const m = col.name.match(repeatingPattern);
            if (m) {
                const prefix = m[1].toLowerCase();
                groupPrefixes[prefix] = (groupPrefixes[prefix] || 0) + 1;
            }
            // Check for known multivalued indicator names
            const lowerName = col.name.toLowerCase();
            if (['phones', 'phone_numbers', 'skills', 'tags', 'hobbies', 'items', 'subjects', 'courses'].includes(lowerName)) {
                oneNF.status = 'FAIL';
                oneNF.reasons.push(`Column '${col.name}' appears to store non-atomic or multivalued data (e.g. comma-separated lists).`);
                oneNF.violations.push(`Multivalued column: ${col.name}`);
            }
        }

        for (const [prefix, count] of Object.entries(groupPrefixes)) {
            if (count >= 2) {
                oneNF.status = 'FAIL';
                oneNF.reasons.push(`Repeating group pattern detected for prefix '${prefix}' (${count} numbered columns like ${prefix}1, ${prefix}2).`);
                oneNF.violations.push(`Repeating group: ${prefix}`);
            }
        }

        if (oneNF.status === 'PASS') {
            oneNF.reasons.push(`Table '${table.name}' satisfies 1NF: All attributes appear atomic, no repeating groups detected, and primary key is designated.`);
        }

        // Find candidate keys
        const candidateKeys = primaryKey.length > 0 
            ? (fds.length > 0 ? this.findCandidateKeys(allCols, fds) : [primaryKey])
            : (fds.length > 0 ? this.findCandidateKeys(allCols, fds) : []);
        
        // Prime attributes: belong to ANY candidate key
        const primeAttributes = new Set();
        candidateKeys.forEach(ck => ck.forEach(attr => primeAttributes.add(attr)));
        const nonPrimeAttributes = allCols.filter(attr => !primeAttributes.has(attr));

        // 2. 2NF Check
        // Requires: 1NF + No partial dependency (no non-prime attribute depends on a proper subset of any candidate key)
        const twoNF = {
            level: '2NF',
            status: 'PASS',
            reasons: [],
            violations: []
        };

        if (oneNF.status === 'FAIL') {
            twoNF.status = 'FAIL';
            twoNF.reasons.push(`Cannot satisfy 2NF because table fails 1NF.`);
        } else if (candidateKeys.length === 0) {
            twoNF.status = 'NEEDS DEPENDENCY INFORMATION';
            twoNF.reasons.push(`No candidate keys or functional dependencies specified to verify partial dependencies.`);
        } else {
            // Check if all candidate keys are single attributes
            const hasCompositeKey = candidateKeys.some(ck => ck.length > 1);
            if (!hasCompositeKey && fds.length === 0) {
                // If candidate key is single-attribute and no explicit violations, 2NF holds trivially
                twoNF.status = 'PASS';
                twoNF.reasons.push(`Satisfies 2NF: The primary/candidate key is a single attribute (${candidateKeys[0].join(', ')}), so no partial dependencies can exist.`);
            } else if (fds.length === 0 && hasCompositeKey) {
                twoNF.status = 'NEEDS DEPENDENCY INFORMATION';
                twoNF.reasons.push(`Composite key detected (${candidateKeys[0].join(', ')}), but no functional dependencies provided to verify if partial dependencies exist.`);
            } else {
                // Check each FD for partial dependency
                for (const fd of fds) {
                    for (const ck of candidateKeys) {
                        if (ck.length > 1) {
                            // Check if fd.determinant is a strict proper subset of ck
                            const isProperSubset = fd.determinant.length < ck.length && 
                                fd.determinant.every(d => ck.includes(d.toLowerCase()));
                            
                            if (isProperSubset) {
                                // Check if any dependent attribute is NON-PRIME
                                const violatedNonPrime = fd.dependent.filter(dep => nonPrimeAttributes.includes(dep.toLowerCase()));
                                if (violatedNonPrime.length > 0) {
                                    twoNF.status = 'FAIL';
                                    const msg = `Partial dependency detected: {${fd.determinant.join(', ')}} -> {${violatedNonPrime.join(', ')}}. Attribute(s) depend on only part of candidate key {${ck.join(', ')}}.`;
                                    twoNF.reasons.push(msg);
                                    twoNF.violations.push(msg);
                                }
                            }
                        }
                    }
                }
                if (twoNF.status !== 'FAIL') {
                    twoNF.status = 'PASS';
                    twoNF.reasons.push(`Satisfies 2NF: Every non-prime attribute is fully functionally dependent on the entire candidate key.`);
                }
            }
        }

        // 3. 3NF Check
        // Requires: 2NF + For every non-trivial X -> A, either X is a superkey OR A is a prime attribute
        const threeNF = {
            level: '3NF',
            status: 'PASS',
            reasons: [],
            violations: []
        };

        if (twoNF.status === 'FAIL') {
            threeNF.status = 'FAIL';
            threeNF.reasons.push(`Cannot satisfy 3NF because table fails 2NF.`);
        } else if (fds.length === 0) {
            threeNF.status = 'NEEDS DEPENDENCY INFORMATION';
            threeNF.reasons.push(`Additional functional dependency information required to rigorously verify transitive dependencies.`);
        } else {
            for (const fd of fds) {
                // Non-trivial: dependent is not a subset of determinant
                const nonTrivialDeps = fd.dependent.filter(d => !fd.determinant.includes(d.toLowerCase()));
                if (nonTrivialDeps.length === 0) continue;

                const isSuper = this.isSuperKey(fd.determinant, allCols, fds);
                if (!isSuper) {
                    // Check if all nonTrivialDeps are prime
                    const nonPrimeViolations = nonTrivialDeps.filter(d => nonPrimeAttributes.includes(d.toLowerCase()));
                    if (nonPrimeViolations.length > 0) {
                        threeNF.status = 'FAIL';
                        const msg = `Transitive dependency detected: {${fd.determinant.join(', ')}} -> {${nonPrimeViolations.join(', ')}}. Determinant is not a superkey and dependent is non-prime.`;
                        threeNF.reasons.push(msg);
                        threeNF.violations.push(msg);
                    }
                }
            }
            if (threeNF.status !== 'FAIL') {
                threeNF.status = 'PASS';
                threeNF.reasons.push(`Satisfies 3NF: No non-prime attribute transitively depends on any candidate key.`);
            }
        }

        // 4. BCNF Check
        // Requires: 3NF + For every non-trivial X -> A, X must be a superkey
        const bcnf = {
            level: 'BCNF',
            status: 'PASS',
            reasons: [],
            violations: []
        };

        if (threeNF.status === 'FAIL') {
            bcnf.status = 'FAIL';
            bcnf.reasons.push(`Cannot satisfy BCNF because table fails 3NF.`);
        } else if (fds.length === 0) {
            bcnf.status = 'NEEDS DEPENDENCY INFORMATION';
            bcnf.reasons.push(`Additional functional dependency information required to verify Boyce-Codd normal form.`);
        } else {
            for (const fd of fds) {
                const nonTrivialDeps = fd.dependent.filter(d => !fd.determinant.includes(d.toLowerCase()));
                if (nonTrivialDeps.length === 0) continue;

                const isSuper = this.isSuperKey(fd.determinant, allCols, fds);
                if (!isSuper) {
                    bcnf.status = 'FAIL';
                    const msg = `BCNF violation: In dependency {${fd.determinant.join(', ')}} -> {${nonTrivialDeps.join(', ')}}, determinant is not a superkey.`;
                    bcnf.reasons.push(msg);
                    bcnf.violations.push(msg);
                }
            }
            if (bcnf.status !== 'FAIL') {
                bcnf.status = 'PASS';
                bcnf.reasons.push(`Satisfies BCNF: Every determinant in non-trivial dependencies is a superkey.`);
            }
        }

        // 5. 4NF Check (Multivalued Dependencies)
        const fourNF = {
            level: '4NF',
            status: 'NEEDS MVD INFORMATION',
            reasons: [
                `Potential Violation – Additional Multivalued Dependency (MVD) information required. In general, 4NF cannot be determined purely from relational DDL without explicit MVD declarations.`
            ],
            violations: []
        };

        // If context provides explicit MVDs, check them
        if (context.mvds && context.mvds.length > 0) {
            // Check MVDs
            let mvdViolation = false;
            context.mvds.forEach(mvd => {
                if (!this.isSuperKey(mvd.determinant, allCols, fds)) {
                    mvdViolation = true;
                    fourNF.violations.push(`Non-trivial MVD ${mvd.determinant.join(', ')} ->> ${mvd.dependent.join(', ')} where determinant is not a superkey.`);
                }
            });
            fourNF.status = mvdViolation ? 'FAIL' : 'PASS';
            fourNF.reasons = mvdViolation ? fourNF.violations : ['Satisfies 4NF based on user-provided MVD specifications.'];
        }

        // 6. 5NF Check (Join Dependencies)
        const fiveNF = {
            level: '5NF',
            status: 'NEEDS JD INFORMATION',
            reasons: [
                `Potential Violation – Additional Join Dependency (JD) information required. Project-Join Normal Form (PJNF/5NF) requires knowledge of lossy vs lossless multi-way decompositions.`
            ],
            violations: []
        };

        // Determine Highest Normal Form
        let highestNF = 'Unable to Determine';
        if (oneNF.status === 'FAIL') {
            highestNF = 'Unnormalized / Below 1NF';
        } else if (twoNF.status === 'FAIL') {
            highestNF = '1NF';
        } else if (twoNF.status === 'PASS' && threeNF.status === 'FAIL') {
            highestNF = '2NF';
        } else if (threeNF.status === 'PASS' && bcnf.status === 'FAIL') {
            highestNF = '3NF';
        } else if (bcnf.status === 'PASS') {
            if (fourNF.status === 'PASS' && fiveNF.status === 'PASS') {
                highestNF = '5NF';
            } else if (fourNF.status === 'PASS') {
                highestNF = '4NF';
            } else {
                highestNF = 'BCNF';
            }
        } else if (twoNF.status === 'PASS') {
            highestNF = '2NF (3NF Needs FDs)';
        } else if (oneNF.status === 'PASS') {
            highestNF = '1NF (2NF Needs FDs)';
        }

        return {
            tableName: table.name,
            highestNF,
            candidateKeys,
            primeAttributes: Array.from(primeAttributes),
            nonPrimeAttributes,
            steps: {
                oneNF,
                twoNF,
                threeNF,
                bcnf,
                fourNF,
                fiveNF
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DependencyEngine };
}
