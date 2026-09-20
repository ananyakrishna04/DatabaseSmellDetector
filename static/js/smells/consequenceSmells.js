/**
 * SchemaSense - Normalization Consequence Smells (Smells 20 - 22)
 * Generates concrete schema-grounded examples of Update, Insert, and Delete anomalies.
 */

class ConsequenceSmellDetector {
    /**
     * Detect anomaly risks based on unnormalized tables in the schema
     * @param {Schema} schema 
     * @param {object} context 
     * @returns {SmellResult[]}
     */
    static detectAll(schema, context = {}) {
        const results = [];
        const defs = SMELL_DEFINITIONS.filter(d => d.category === SMELL_CATEGORIES.CONSEQUENCE);

        const dUpdate = defs.find(d => d.id === 'ANOM-020');
        const dInsert = defs.find(d => d.id === 'ANOM-021');
        const dDelete = defs.find(d => d.id === 'ANOM-022');

        for (const table of schema.tables) {
            const cols = table.getColumnNames();
            const lowerCols = cols.map(c => c.toLowerCase());

            // Check if table contains candidate entities combined together
            // e.g. Student with department details, or Order with customer details
            let combinedEntity = null;
            if ((lowerCols.includes('dept_name') || lowerCols.includes('department_name')) && 
                (lowerCols.includes('student_id') || lowerCols.includes('emp_id') || lowerCols.includes('employee_id'))) {
                combinedEntity = {
                    parent: lowerCols.includes('student_id') ? 'Student' : 'Employee',
                    sub: 'Department',
                    key: lowerCols.includes('student_id') ? 'student_id' : 'emp_id',
                    subKey: lowerCols.find(c => c.includes('dept')) || 'dept_id',
                    subDesc: lowerCols.find(c => c.includes('dept_name') || c.includes('department_name')) || 'dept_name'
                };
            } else if (lowerCols.includes('customer_name') && lowerCols.includes('order_id')) {
                combinedEntity = {
                    parent: 'Order',
                    sub: 'Customer',
                    key: 'order_id',
                    subKey: 'customer_id',
                    subDesc: 'customer_name'
                };
            } else if (lowerCols.includes('course_name') && lowerCols.includes('student_id')) {
                combinedEntity = {
                    parent: 'Student',
                    sub: 'Course',
                    key: 'student_id',
                    subKey: 'course_id',
                    subDesc: 'course_name'
                };
            } else if (table.primaryKey.length > 1 && table.columns.length > table.primaryKey.length + 1) {
                // Skip if this is a proper junction/associative table:
                // all PK columns are covered by foreign keys → it is already decomposed correctly
                const isJunctionTable = table.primaryKey.length > 0 &&
                    table.foreignKeys && table.foreignKeys.length > 0 &&
                    table.primaryKey.every(pk =>
                        table.foreignKeys.some(fk =>
                            fk.fromColumns && fk.fromColumns.map(c => c.toLowerCase()).includes(pk.toLowerCase())
                        )
                    );
                if (!isJunctionTable) {
                    // Generic composite key table with descriptive columns
                    combinedEntity = {
                        parent: table.name,
                        sub: 'Related Entity',
                        key: table.primaryKey.join(', '),
                        subKey: table.primaryKey[0],
                        subDesc: cols.find(c => !table.primaryKey.includes(c)) || 'attributes'
                    };
                }
            }

            if (combinedEntity) {
                // 20. Update Anomaly
                results.push(new SmellResult({
                    smellDef: dUpdate,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Because attributes of ${combinedEntity.sub} (${combinedEntity.subDesc}) are duplicated across multiple ${combinedEntity.parent} records in '${table.name}', changing a single fact requires updating dozens of rows. Failure to update every row produces an inconsistent database state.`,
                    example: `UPDATE ${table.name} SET ${combinedEntity.subDesc} = 'New Name' WHERE ${combinedEntity.subKey} = 101;\n-- Requires scanning and updating multiple rows instead of a single tuple!`,
                    recommendation: `Decompose table '${table.name}': Extract ${combinedEntity.sub} into its own table with primary key (${combinedEntity.subKey}).`
                }));

                // 21. Insert Anomaly
                results.push(new SmellResult({
                    smellDef: dInsert,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Cannot insert a new ${combinedEntity.sub} without artificially creating or dummying a ${combinedEntity.parent} record, because '${combinedEntity.key}' is part of the primary key and cannot be NULL.`,
                    example: `INSERT INTO ${table.name} (${combinedEntity.key}, ${combinedEntity.subKey}, ${combinedEntity.subDesc})\nVALUES (NULL, 201, 'Autonomous Robotics'); -- FAILS due to NOT NULL/PK constraint on ${combinedEntity.key}!`,
                    recommendation: `Decouple the entities so a ${combinedEntity.sub} record can be registered independently of any ${combinedEntity.parent}.`
                }));

                // 22. Delete Anomaly
                results.push(new SmellResult({
                    smellDef: dDelete,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Deleting the final ${combinedEntity.parent} associated with a ${combinedEntity.sub} inadvertently erases all record of that ${combinedEntity.sub} from the system.`,
                    example: `DELETE FROM ${table.name} WHERE ${combinedEntity.key} = 99;\n-- If this is the last record, the entire ${combinedEntity.sub} information is permanently lost!`,
                    recommendation: `Normalize into separate entity relations so deleting a child or relationship tuple preserves the parent catalog entity.`
                }));
            } else if (table.primaryKey.length === 0) {
                // Unkeyed table anomaly
                results.push(new SmellResult({
                    smellDef: dUpdate,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Table: ${table.name}`,
                    whyDetected: `Table '${table.name}' lacks a primary key. An UPDATE query cannot uniquely address individual records, risking accidental updates across identical duplicate rows.`,
                    example: `UPDATE ${table.name} SET col = 'val' WHERE ambiguous_filter = 1; -- May modify duplicate rows unintendedly`,
                    recommendation: `Define a primary key on table '${table.name}'.`
                }));
            }
        }

        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConsequenceSmellDetector };
}
