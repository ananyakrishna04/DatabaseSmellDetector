/**
 * SchemaSense - Relational Schema Smells (Smells 1 - 13)
 * Implements rigorous detection algorithms for relational design integrity
 */

class RelationalSmellDetector {
    /**
     * Run all Relational Schema smell detectors on the provided Schema
     * @param {Schema} schema 
     * @param {object} context 
     * @returns {SmellResult[]}
     */
    static detectAll(schema, context = {}) {
        const results = [];
        const defs = SMELL_DEFINITIONS.filter(d => d.category === SMELL_CATEGORIES.RELATIONAL);

        results.push(...this.detectMissingPrimaryKey(schema, defs.find(d => d.id === 'REL-001')));
        results.push(...this.detectMissingForeignKey(schema, defs.find(d => d.id === 'REL-002')));
        results.push(...this.detectMissingNotNull(schema, defs.find(d => d.id === 'REL-003')));
        results.push(...this.detectMissingUnique(schema, defs.find(d => d.id === 'REL-004')));
        results.push(...this.detectInvalidForeignKey(schema, defs.find(d => d.id === 'REL-005')));
        results.push(...this.detectRedundantColumn(schema, defs.find(d => d.id === 'REL-006')));
        results.push(...this.detectRedundantData(schema, defs.find(d => d.id === 'REL-007')));
        results.push(...this.detectMultivaluedColumn(schema, defs.find(d => d.id === 'REL-008')));
        results.push(...this.detectRepeatingGroups(schema, defs.find(d => d.id === 'REL-009')));
        results.push(...this.detectDerivedAttributes(schema, defs.find(d => d.id === 'REL-010')));
        results.push(...this.detectPoorNaming(schema, defs.find(d => d.id === 'REL-011')));
        results.push(...this.detectInconsistentDataTypes(schema, defs.find(d => d.id === 'REL-012')));
        results.push(...this.detectExcessiveNullable(schema, defs.find(d => d.id === 'REL-013')));

        return results;
    }

    // 1. Missing Primary Key
    static detectMissingPrimaryKey(schema, def) {
        const results = [];
        for (const table of schema.tables) {
            if (table.primaryKey.length === 0) {
                results.push(new SmellResult({
                    smellDef: def,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' does not declare a PRIMARY KEY. Without a primary key, tuples cannot be guaranteed unique in relational theory, violating entity integrity and disabling efficient row addressing.`,
                    example: `CREATE TABLE ${table.name} (\n  ${table.columns.map(c => `${c.name} ${c.dataType}`).slice(0, 3).join(',\n  ')} ...\n); -- No PRIMARY KEY clause`,
                    recommendation: `Designate a natural candidate key or add a surrogate primary key (e.g. '${table.name.toLowerCase()}_id INT PRIMARY KEY AUTO_INCREMENT').`
                }));
            }
        }
        return results;
    }

    // 2. Missing Foreign Key
    static detectMissingForeignKey(schema, def) {
        const results = [];
        const tableNames = schema.getAllTableNames().map(t => t.toLowerCase());

        for (const table of schema.tables) {
            for (const col of table.columns) {
                if (col.isPrimaryKey || col.isForeignKey) continue;

                // Check naming patterns like customer_id, dept_id, user_id
                const colName = col.name.toLowerCase();
                if (colName.endsWith('_id') || colName.endsWith('id') || colName.endsWith('_no')) {
                    // Try to infer potential target table
                    let inferredTable = null;
                    const potentialPrefix = colName.replace(/(_id|id|_no)$/, '');

                    for (const t of schema.tables) {
                        if (t.name.toLowerCase() === table.name.toLowerCase()) continue;
                        const tLower = t.name.toLowerCase();
                        if (tLower === potentialPrefix || tLower.startsWith(potentialPrefix) || potentialPrefix.startsWith(tLower)) {
                            // Check if target table has a PK or column matching this name
                            const matchingPk = t.primaryKey.find(pk => pk.toLowerCase() === colName || pk.toLowerCase().includes('id'));
                            if (matchingPk) {
                                inferredTable = { table: t.name, column: matchingPk };
                                break;
                            }
                        }
                    }

                    if (inferredTable) {
                        results.push(new SmellResult({
                            smellDef: def,
                            status: 'Detected',
                            severity: 'HIGH',
                            affectedObject: `Column: ${table.name}.${col.name}`,
                            whyDetected: `Column '${col.name}' in table '${table.name}' appears to logically reference entity '${inferredTable.table}', but no FOREIGN KEY constraint is declared. This allows orphaned records and breaks referential integrity.`,
                            example: `${table.name}.${col.name} matches primary key in table ${inferredTable.table}.${inferredTable.column}`,
                            recommendation: `Add explicit constraint: FOREIGN KEY (${col.name}) REFERENCES ${inferredTable.table}(${inferredTable.column}).`
                        }));
                    }
                }
            }
        }
        return results;
    }

    // 3. Missing NOT NULL Constraint
    static detectMissingNotNull(schema, def) {
        const results = [];
        const mandatoryNamePatterns = ['name', 'first_name', 'last_name', 'title', 'code', 'created_at', 'registered_date'];

        for (const table of schema.tables) {
            for (const col of table.columns) {
                if (col.isPrimaryKey) continue;

                const colLower = col.name.toLowerCase();
                const isLikelyMandatory = col.isForeignKey || mandatoryNamePatterns.some(p => colLower === p || colLower.endsWith('_' + p));

                if (isLikelyMandatory && col.isNullable) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'MEDIUM',
                        affectedObject: `Column: ${table.name}.${col.name}`,
                        whyDetected: `Column '${col.name}' in table '${table.name}' represents essential descriptive identity or relational linkage, but allows NULL values. This introduces Three-Valued Logic (3VL) edge cases in SQL queries.`,
                        example: `${col.name} ${col.dataType} -- Missing NOT NULL`,
                        recommendation: `Alter column '${col.name}' to enforce NOT NULL constraint.`
                    }));
                }
            }
        }
        return results;
    }

    // 4. Missing UNIQUE Constraint
    static detectMissingUnique(schema, def) {
        const results = [];
        const uniqueCandidatePatterns = ['email', 'ssn', 'roll_no', 'roll_number', 'registration_no', 'reg_no', 'isbn', 'barcode', 'username', 'passport_no', 'vin'];

        for (const table of schema.tables) {
            for (const col of table.columns) {
                if (col.isPrimaryKey || col.isUnique) continue;

                const colLower = col.name.toLowerCase();
                const isCandidate = uniqueCandidatePatterns.some(p => colLower === p || colLower.includes(p));

                if (isCandidate) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'MEDIUM',
                        affectedObject: `Column: ${table.name}.${col.name}`,
                        whyDetected: `Column '${col.name}' typically represents a natural candidate key uniquely identifying a real-world entity, but lacks a UNIQUE constraint. Duplicate values may be inadvertently inserted.`,
                        example: `${col.name} ${col.dataType} -- Should enforce uniqueness`,
                        recommendation: `Add UNIQUE constraint: ALTER TABLE ${table.name} ADD CONSTRAINT uq_${table.name}_${col.name} UNIQUE (${col.name});`
                    }));
                }
            }
        }
        return results;
    }

    // 5. Invalid / Inconsistent Foreign Key
    static detectInvalidForeignKey(schema, def) {
        const results = [];
        for (const table of schema.tables) {
            for (const fk of table.foreignKeys) {
                const targetTable = schema.getTable(fk.toTable);
                if (!targetTable) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'HIGH',
                        affectedObject: `Foreign Key: ${table.name}(${fk.fromColumns.join(', ')})`,
                        whyDetected: `Foreign key references table '${fk.toTable}', which does not exist in the schema. Referential integrity cannot be established.`,
                        example: `FOREIGN KEY (${fk.fromColumns.join(', ')}) REFERENCES ${fk.toTable}(${fk.toColumns.join(', ')})`,
                        recommendation: `Create target table '${fk.toTable}' before creating foreign key reference, or correct table name spelling.`
                    }));
                    continue;
                }

                // Check target columns exist and are primary/unique keys
                for (let i = 0; i < fk.fromColumns.length; i++) {
                    const fromColName = fk.fromColumns[i];
                    const toColName = fk.toColumns[i] || fromColName;
                    const fromCol = table.getColumn(fromColName);
                    const toCol = targetTable.getColumn(toColName);

                    if (!toCol) {
                        results.push(new SmellResult({
                            smellDef: def,
                            status: 'Detected',
                            severity: 'HIGH',
                            affectedObject: `Foreign Key: ${table.name}.${fromColName}`,
                            whyDetected: `Foreign key references non-existent column '${toColName}' in table '${targetTable.name}'.`,
                            example: `REFERENCES ${targetTable.name}(${toColName})`,
                            recommendation: `Ensure referenced column exists in target table.`
                        }));
                    } else if (fromCol) {
                        // Check datatype compatibility
                        const fromBase = fromCol.getBaseType();
                        const toBase = toCol.getBaseType();
                        if (fromBase !== toBase) {
                            results.push(new SmellResult({
                                smellDef: def,
                                status: 'Detected',
                                severity: 'HIGH',
                                affectedObject: `Foreign Key: ${table.name}.${fromColName} -> ${targetTable.name}.${toColName}`,
                                whyDetected: `Data type mismatch between foreign key column '${fromCol.name}' (${fromCol.dataType}) and referenced column '${toCol.name}' (${toCol.dataType}).`,
                                example: `${table.name}.${fromCol.name} [${fromCol.dataType}] vs ${targetTable.name}.${toCol.name} [${toCol.dataType}]`,
                                recommendation: `Align datatypes to match exactly: change '${fromCol.name}' to ${toCol.dataType}.`
                            }));
                        }
                    }
                }
            }
        }
        return results;
    }

    // 6. Redundant Column
    static detectRedundantColumn(schema, def) {
        const results = [];
        for (const table of schema.tables) {
            for (const col of table.columns) {
                const lower = col.name.toLowerCase();
                if (lower.includes('count') || lower.includes('total_students') || lower.includes('num_items') || lower.includes('balance_cached')) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Potential / Needs Review',
                        severity: 'MEDIUM',
                        affectedObject: `Column: ${table.name}.${col.name}`,
                        whyDetected: `Column '${col.name}' appears to store an aggregate or computable metric that can be calculated via SQL COUNT/SUM queries, risking out-of-sync data if not maintained by triggers.`,
                        example: `${table.name}.${col.name} (${col.dataType})`,
                        recommendation: `Remove the persisted aggregate column and calculate via SQL query or database view unless strictly required for high-throughput caching.`
                    }));
                }
            }
        }
        return results;
    }

    // 7. Redundant Data / Data Duplication across tables
    static detectRedundantData(schema, def) {
        const results = [];
        // Map non-key column names to the tables they appear in
        const colMap = {};
        for (const table of schema.tables) {
            for (const col of table.columns) {
                if (col.isPrimaryKey || col.isForeignKey) continue;
                const colLower = col.name.toLowerCase();
                // Exclude universal auditing columns
                if (['created_at', 'updated_at', 'status', 'description', 'notes'].includes(colLower)) continue;

                if (!colMap[colLower]) colMap[colLower] = [];
                colMap[colLower].push({ table: table.name, colName: col.name });
            }
        }

        for (const [colLower, occurrences] of Object.entries(colMap)) {
            if (occurrences.length > 1) {
                const tablesList = occurrences.map(o => o.table).join(', ');
                results.push(new SmellResult({
                    smellDef: def,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Columns: ${occurrences.map(o => `${o.table}.${o.colName}`).join(', ')}`,
                    whyDetected: `Attribute '${colLower}' is replicated across multiple independent tables (${tablesList}) without being a foreign key. This leads to duplicate storage and update anomalies.`,
                    example: `Duplicated attribute found in: ${tablesList}`,
                    recommendation: `Consolidate '${colLower}' in its parent entity table and establish foreign key relationships.`
                }));
            }
        }
        return results;
    }

    // 8. Multivalued / Non-Atomic Column (1NF)
    static detectMultivaluedColumn(schema, def) {
        const results = [];
        const multiValuedNames = ['phone_numbers', 'phones', 'skills', 'tags', 'hobbies', 'courses', 'items', 'subjects', 'addresses', 'emails', 'categories'];

        for (const table of schema.tables) {
            for (const col of table.columns) {
                const lower = col.name.toLowerCase();
                if (multiValuedNames.includes(lower) || lower.endsWith('_list') || lower.endsWith('_csv') || lower.endsWith('_array')) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'HIGH',
                        affectedObject: `Column: ${table.name}.${col.name}`,
                        whyDetected: `Column '${col.name}' stores multivalued, non-atomic information (such as delimited phone numbers or tags), violating First Normal Form (1NF). Querying, sorting, and indexing individual items requires inefficient regex/string operations.`,
                        example: `${table.name}.${col.name} ${col.dataType} (stores values like "9876543210,9123456789" or "CSE,ECE")`,
                        recommendation: `Create a separate child table '${table.name}_${col.name}' with foreign key to '${table.name}' and one row per value.`
                    }));
                }
            }
        }
        return results;
    }

    // 9. Repeating Groups
    static detectRepeatingGroups(schema, def) {
        const results = [];
        const regex = /^(.*?)(\d+)$/i;

        for (const table of schema.tables) {
            const prefixGroups = {};
            for (const col of table.columns) {
                const m = col.name.match(regex);
                if (m) {
                    const prefix = m[1].toLowerCase();
                    if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
                    prefixGroups[prefix].push(col.name);
                }
            }

            for (const [prefix, cols] of Object.entries(prefixGroups)) {
                if (cols.length >= 2) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'HIGH',
                        affectedObject: `Columns: ${table.name}.(${cols.join(', ')})`,
                        whyDetected: `Numbered repeating columns (${cols.join(', ')}) in table '${table.name}' violate First Normal Form (1NF). This design limits scalability, wastes storage with NULLs for unused slots, and complicates querying.`,
                        example: `${cols.join(', ')} in table ${table.name}`,
                        recommendation: `Normalize into a child table '${table.name}_${prefix}' linked via foreign key, storing one tuple per item.`
                    }));
                }
            }
        }
        return results;
    }

    // 10. Derived Attribute Stored Unnecessarily
    static detectDerivedAttributes(schema, def) {
        const results = [];
        for (const table of schema.tables) {
            const colNames = table.getColumnNames().map(c => c.toLowerCase());

            // Case 1: age AND (dob OR date_of_birth)
            const hasAge = colNames.includes('age');
            const hasDob = colNames.includes('dob') || colNames.includes('date_of_birth') || colNames.includes('birth_date');
            if (hasAge && hasDob) {
                results.push(new SmellResult({
                    smellDef: def,
                    status: 'Detected',
                    severity: 'LOW',
                    affectedObject: `Column: ${table.name}.age`,
                    whyDetected: `'age' is a derived attribute that changes continuously over time and can be calculated deterministically from 'date_of_birth'. Storing both creates inconsistency over time.`,
                    example: `Table ${table.name} stores both 'age' and 'date_of_birth'`,
                    recommendation: `Drop column 'age' and compute dynamically using (CURRENT_DATE - date_of_birth).`
                }));
            }

            // Case 2: total_amount AND (quantity AND price)
            const hasTotal = colNames.includes('total_amount') || colNames.includes('total_price') || colNames.includes('total');
            const hasQty = colNames.includes('quantity') || colNames.includes('qty');
            const hasPrice = colNames.includes('price') || colNames.includes('unit_price');
            if (hasTotal && hasQty && hasPrice) {
                results.push(new SmellResult({
                    smellDef: def,
                    status: 'Detected',
                    severity: 'LOW',
                    affectedObject: `Column: ${table.name}.total_amount`,
                    whyDetected: `'total_amount' is redundant with 'quantity * unit_price'. Storing both risks discrepancy if quantity or price is updated without recomputing total.`,
                    example: `Table ${table.name} stores 'quantity', 'price', and 'total'`,
                    recommendation: `Compute total dynamically using a generated column or query expression (quantity * unit_price).`
                }));
            }
        }
        return results;
    }

    // 11. Poor / Ambiguous Naming
    static detectPoorNaming(schema, def) {
        const results = [];
        const vagueNames = ['data', 'value', 'val', 'info', 'temp', 'type', 'status', 'date', 'num', 'field'];

        for (const table of schema.tables) {
            for (const col of table.columns) {
                const lower = col.name.toLowerCase();
                if (vagueNames.includes(lower)) {
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'LOW',
                        affectedObject: `Column: ${table.name}.${col.name}`,
                        whyDetected: `Identifier '${col.name}' in table '${table.name}' is ambiguous, overly generic, or conflicts with standard SQL reserved keywords.`,
                        example: `${table.name}.${col.name} ${col.dataType}`,
                        recommendation: `Rename to a descriptive identifier indicating purpose (e.g. '${table.name.toLowerCase()}_status' or 'enrollment_date').`
                    }));
                }
            }
        }
        return results;
    }

    // 12. Inconsistent Data Types
    static detectInconsistentDataTypes(schema, def) {
        const results = [];
        const typeMap = {};

        for (const table of schema.tables) {
            for (const col of table.columns) {
                const lower = col.name.toLowerCase();
                if (!typeMap[lower]) typeMap[lower] = [];
                typeMap[lower].push({ table: table.name, col: col.name, type: col.dataType, base: col.getBaseType() });
            }
        }

        for (const [colName, instances] of Object.entries(typeMap)) {
            if (instances.length > 1) {
                const uniqueBases = Array.from(new Set(instances.map(i => i.base)));
                if (uniqueBases.length > 1) {
                    const breakdown = instances.map(i => `${i.table}.${i.col} (${i.type})`).join(' vs ');
                    results.push(new SmellResult({
                        smellDef: def,
                        status: 'Detected',
                        severity: 'MEDIUM',
                        affectedObject: `Columns: ${instances.map(i => `${i.table}.${i.col}`).join(', ')}`,
                        whyDetected: `Identically named attribute '${colName}' is declared with conflicting data types across tables (${breakdown}). This hinders JOIN performance and type safety.`,
                        example: breakdown,
                        recommendation: `Standardize '${colName}' to the same data type across all relations in the schema.`
                    }));
                }
            }
        }
        return results;
    }

    // 13. Excessive NULLable Columns
    static detectExcessiveNullable(schema, def) {
        const results = [];
        for (const table of schema.tables) {
            if (table.columns.length < 4) continue; // Only flag meaningful tables

            const nullableCount = table.columns.filter(c => c.isNullable).length;
            const ratio = nullableCount / table.columns.length;

            if (ratio >= 0.6) {
                results.push(new SmellResult({
                    smellDef: def,
                    status: 'Potential / Needs Review',
                    severity: 'MEDIUM',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' has ${nullableCount} out of ${table.columns.length} columns (${Math.round(ratio * 100)}%) permitting NULL values. High nullability often indicates collapsed entity subtypes or sparse polymorphic modeling.`,
                    example: `${nullableCount} nullable columns in table '${table.name}'`,
                    recommendation: `Consider entity subtyping (Inheritance / Table-per-Type) or moving optional attributes into secondary extension tables.`
                }));
            }
        }
        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RelationalSmellDetector };
}
