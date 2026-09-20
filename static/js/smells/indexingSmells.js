/**
 * SchemaSense - Physical Design & Indexing Smells (Smells 23 - 27)
 * Analyzes B+ Tree index coverage, redundancy, selectivity, and write overhead.
 */

class IndexingSmellDetector {
    /**
     * Run all Physical Design and Indexing smell detectors
     * @param {Schema} schema 
     * @param {object} context 
     * @returns {SmellResult[]}
     */
    static detectAll(schema, context = {}) {
        const results = [];
        const defs = SMELL_DEFINITIONS.filter(d => d.category === SMELL_CATEGORIES.INDEXING);

        const d23 = defs.find(d => d.id === 'IDX-023');
        const d24 = defs.find(d => d.id === 'IDX-024');
        const d25 = defs.find(d => d.id === 'IDX-025');
        const d26 = defs.find(d => d.id === 'IDX-026');
        const d27 = defs.find(d => d.id === 'IDX-027');

        const workloadCols = (schema.advancedOptions && schema.advancedOptions.workloadSearchColumns) || [];

        for (const table of schema.tables) {
            const tableIndexes = table.indexes || [];

            // 23. Missing Index on Frequently Used FK / Search Column
            // Check FK columns without an index starting with that column
            for (const fk of table.foreignKeys) {
                for (const fkCol of fk.fromColumns) {
                    const hasIndex = tableIndexes.some(idx => idx.columns.length > 0 && idx.columns[0].toLowerCase() === fkCol.toLowerCase()) ||
                                     (table.primaryKey.length > 0 && table.primaryKey[0].toLowerCase() === fkCol.toLowerCase());
                    
                    if (!hasIndex) {
                        results.push(new SmellResult({
                            smellDef: d23,
                            status: 'Detected',
                            severity: 'MEDIUM',
                            affectedObject: `Column: ${table.name}.${fkCol}`,
                            whyDetected: `Foreign key column '${fkCol}' in table '${table.name}' has no supporting index. In SQL joins, missing indexes on foreign keys cause nested loop full table scans or hash join spills, severely degrading join performance.`,
                            example: `FOREIGN KEY (${fkCol}) REFERENCES ${fk.toTable} -- No supporting index found!`,
                            recommendation: `Add a B+ tree index: CREATE INDEX idx_${table.name}_${fkCol} ON ${table.name}(${fkCol});`
                        }));
                    }
                }
            }

            // Check user-designated workload search columns
            for (const wCol of workloadCols) {
                const parts = wCol.split('.');
                const targetTable = parts.length === 2 ? parts[0] : null;
                const targetCol = parts.length === 2 ? parts[1] : parts[0];

                if (!targetTable || targetTable.toLowerCase() === table.name.toLowerCase()) {
                    const colObj = table.getColumn(targetCol);
                    if (colObj) {
                        const hasIdx = tableIndexes.some(idx => idx.columns.map(c => c.toLowerCase()).includes(targetCol.toLowerCase()));
                        if (!hasIdx && !colObj.isPrimaryKey) {
                            results.push(new SmellResult({
                                smellDef: d23,
                                status: 'Detected',
                                severity: 'MEDIUM',
                                affectedObject: `Column: ${table.name}.${colObj.name}`,
                                whyDetected: `Workload-designated search column '${colObj.name}' lacks an index, resulting in sequential scans for high-frequency queries.`,
                                example: `User specified '${colObj.name}' as frequent filter predicate`,
                                recommendation: `Create an index on (${colObj.name}) to optimize WHERE clause filter evaluation.`
                            }));
                        }
                    }
                }
            }

            // 24. Redundant / Duplicate Index
            for (let i = 0; i < tableIndexes.length; i++) {
                for (let j = 0; j < tableIndexes.length; j++) {
                    if (i === j) continue;
                    const idxA = tableIndexes[i];
                    const idxB = tableIndexes[j];

                    const colsA = idxA.columns.map(c => c.toLowerCase());
                    const colsB = idxB.columns.map(c => c.toLowerCase());

                    // Check exact duplicate
                    if (colsA.join(',') === colsB.join(',') && i < j) {
                        results.push(new SmellResult({
                            smellDef: d24,
                            status: 'Detected',
                            severity: 'MEDIUM',
                            affectedObject: `Indexes: ${table.name}.(${idxA.name}, ${idxB.name})`,
                            whyDetected: `Indexes '${idxA.name}' and '${idxB.name}' index the exact same columns in identical order (${colsA.join(', ')}). This doubles write overhead and disk storage without query benefit.`,
                            example: `Index 1: ${idxA.name} (${colsA.join(', ')}) vs Index 2: ${idxB.name} (${colsB.join(', ')})`,
                            recommendation: `Drop redundant index: DROP INDEX ${idxB.name} ON ${table.name};`
                        }));
                    }
                    // Check left-prefix redundancy: idxA is prefix of idxB
                    else if (colsB.length > colsA.length) {
                        const isPrefix = colsA.every((col, idx) => colsB[idx] === col);
                        if (isPrefix && !idxA.isUnique) { // Unique index on subset might be needed for constraint enforcement
                            results.push(new SmellResult({
                                smellDef: d24,
                                status: 'Detected',
                                severity: 'MEDIUM',
                                affectedObject: `Index: ${table.name}.${idxA.name}`,
                                whyDetected: `Index '${idxA.name}' on (${colsA.join(', ')}) is completely redundant because compound index '${idxB.name}' on (${colsB.join(', ')}) can satisfy all queries using the leftmost prefix rule in B+ trees.`,
                                example: `'${idxA.name}' (${colsA.join(', ')}) is prefix of '${idxB.name}' (${colsB.join(', ')})`,
                                recommendation: `Drop index '${idxA.name}', as '${idxB.name}' already accelerates queries on (${colsA.join(', ')}).`
                            }));
                        }
                    }
                }
            }

            // 25. Over-Indexing
            if (tableIndexes.length >= 5 || (table.columns.length > 0 && tableIndexes.length > table.columns.length * 0.75)) {
                results.push(new SmellResult({
                    smellDef: d25,
                    status: 'Potential / Needs Review',
                    severity: 'LOW',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' has ${tableIndexes.length} secondary indexes against ${table.columns.length} columns. While indexes speed up SELECTs, each index adds B+ tree page splits and logging cost on every INSERT, UPDATE, and DELETE.`,
                    example: `${tableIndexes.length} indexes defined on table with ${table.columns.length} attributes`,
                    recommendation: `Profile index usage metrics (e.g. pg_stat_user_indexes) and remove unused or rarely hit indexes.`
                }));
            }

            // 26. Low-Selectivity Index
            const lowCardinalityKeywords = ['status', 'gender', 'sex', 'is_active', 'is_deleted', 'flag', 'enabled', 'active', 'boolean'];
            for (const idx of tableIndexes) {
                if (idx.columns.length === 1) {
                    const colName = idx.columns[0];
                    const colObj = table.getColumn(colName);
                    const colLower = colName.toLowerCase();
                    const isLow = lowCardinalityKeywords.some(k => colLower === k || colLower.endsWith('_' + k)) ||
                                  (colObj && ['BOOLEAN', 'BOOL', 'TINYINT(1)', 'BIT'].includes(colObj.dataType));
                    
                    if (isLow) {
                        results.push(new SmellResult({
                            smellDef: d26,
                            status: 'Potential / Needs Review',
                            severity: 'LOW',
                            affectedObject: `Index: ${table.name}.${idx.name}`,
                            whyDetected: `Column '${colName}' has very low cardinality (e.g. 2–3 distinct values). Relational query optimizers almost always ignore B+ tree indexes where selectivity is poor (>15–20% of rows match), falling back to full table scans.`,
                            example: `Index '${idx.name}' on low-cardinality column '${colName}'`,
                            recommendation: `Consider dropping the standalone index or creating a filtered partial index (e.g. WHERE ${colName} = 'PENDING') if only a tiny fraction of rows match.`
                        }));
                    }
                }
            }

            // 27. Wide / Poorly Designed Index
            for (const idx of tableIndexes) {
                if (idx.columns.length >= 4) {
                    results.push(new SmellResult({
                        smellDef: d27,
                        status: 'Potential / Needs Review',
                        severity: 'LOW',
                        affectedObject: `Index: ${table.name}.${idx.name}`,
                        whyDetected: `Index '${idx.name}' spans ${idx.columns.length} columns (${idx.columns.join(', ')}). Exceptionally wide compound indexes reduce B+ tree fanout, bloat the buffer cache, and increase index maintenance overhead on row modifications.`,
                        example: `${idx.name} ON (${idx.columns.join(', ')})`,
                        recommendation: `Trim the index to only the highest selectivity columns or use an INCLUDE clause for covered non-filter attributes.`
                    }));
                }
            }
        }

        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IndexingSmellDetector };
}
