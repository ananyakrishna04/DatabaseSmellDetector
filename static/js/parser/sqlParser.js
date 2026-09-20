/**
 * SchemaSense - Robust SQL DDL Parser
 * Parses CREATE TABLE, constraints (PK, FK, UNIQUE, NOT NULL, CHECK), and CREATE INDEX
 * Tracks line numbers and produces informative syntax error messages.
 */

class SQLParser {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Parse SQL string into a Schema model
     * @param {string} sqlText 
     * @returns {{ success: boolean, schema: Schema, errors: string[], warnings: string[] }}
     */
    parse(sqlText) {
        this.errors = [];
        this.warnings = [];
        const schema = new Schema();

        if (!sqlText || !sqlText.trim()) {
            this.errors.push("Empty input: Please provide SQL DDL statements to analyze.");
            return { success: false, schema, errors: this.errors, warnings: this.warnings };
        }

        // Clean comments while preserving line breaks to keep accurate line numbering
        const lineTrackedSQL = this._stripCommentsPreservingLines(sqlText);

        // Split into statements based on semicolon
        const statements = this._extractStatementsWithLines(lineTrackedSQL);

        if (statements.length === 0) {
            this.errors.push("No valid SQL statements found. Ensure statements end with a semicolon ';'.");
            return { success: false, schema, errors: this.errors, warnings: this.warnings };
        }

        for (const stmt of statements) {
            const trimmed = stmt.text.trim();
            if (!trimmed) continue;

            const upper = trimmed.toUpperCase();
            if (upper.startsWith('CREATE TABLE')) {
                this._parseCreateTable(stmt, schema);
            } else if (upper.startsWith('CREATE INDEX') || upper.startsWith('CREATE UNIQUE INDEX')) {
                this._parseCreateIndex(stmt, schema);
            } else if (upper.startsWith('ALTER TABLE')) {
                this._parseAlterTable(stmt, schema);
            } else {
                // Check if it's an unsupported or unknown statement
                const firstWord = trimmed.split(/\s+/)[0].toUpperCase();
                if (['INSERT', 'UPDATE', 'DELETE', 'SELECT', 'DROP'].includes(firstWord)) {
                    this.warnings.push(`Line ${stmt.lineNumber}: Ignored non-DDL statement '${firstWord}'. SchemaSense focuses on CREATE TABLE and CREATE INDEX.`);
                } else {
                    this.warnings.push(`Line ${stmt.lineNumber}: Skipping unsupported statement starting with '${trimmed.substring(0, 30)}...'`);
                }
            }
        }

        // Check if at least one table was parsed
        if (schema.tables.length === 0 && this.errors.length === 0) {
            this.errors.push("No valid CREATE TABLE statements could be recognized. Please check SQL syntax.");
        }

        return {
            success: this.errors.length === 0,
            schema,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    _stripCommentsPreservingLines(sql) {
        // Replace single line comments --... with spaces up to the newline
        let result = sql.replace(/--.*$/gm, match => ' '.repeat(match.length));
        // Replace block comments /* ... */ with newlines matching the comment's line count
        result = result.replace(/\/\*[\s\S]*?\*\//g, match => {
            const newlines = match.split('\n').length - 1;
            return '\n'.repeat(newlines);
        });
        return result;
    }

    _extractStatementsWithLines(sql) {
        const statements = [];
        let currentStmt = '';
        let startLine = 1;
        let currentLine = 1;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inBacktick = false;

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            if (char === '\n') {
                currentLine++;
            }

            if (char === "'" && !inDoubleQuote && !inBacktick) {
                if (sql[i - 1] !== '\\') inSingleQuote = !inSingleQuote;
            } else if (char === '"' && !inSingleQuote && !inBacktick) {
                if (sql[i - 1] !== '\\') inDoubleQuote = !inDoubleQuote;
            } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
                inBacktick = !inBacktick;
            }

            if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
                if (currentStmt.trim().length > 0) {
                    statements.push({ text: currentStmt.trim(), lineNumber: startLine });
                }
                currentStmt = '';
                startLine = currentLine;
            } else {
                if (currentStmt.length === 0 && char.trim()) {
                    startLine = currentLine;
                }
                currentStmt += char;
            }
        }

        if (currentStmt.trim().length > 0) {
            statements.push({ text: currentStmt.trim(), lineNumber: startLine });
        }

        return statements;
    }

    _cleanIdentifier(name) {
        if (!name) return '';
        return name.replace(/^[`"']|[`"']$/g, '').trim();
    }

    _parseCreateTable(stmtObj, schema) {
        const sql = stmtObj.text;
        const line = stmtObj.lineNumber;

        // Match CREATE TABLE [IF NOT EXISTS] tableName ( ... )
        const match = sql.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\s(]+)\s*\(([\s\S]*)\)(?:\s*[^;]*)?$/i);
        if (!match) {
            this.errors.push(`Unable to parse SQL near line ${line}: Malformed CREATE TABLE statement.`);
            return;
        }

        const rawTableName = this._cleanIdentifier(match[1]);
        const body = match[2].trim();

        if (schema.getTable(rawTableName)) {
            this.warnings.push(`Line ${line}: Duplicate table '${rawTableName}' encountered. Overwriting prior definition.`);
        }

        const table = new Table(rawTableName);

        // Split body items by commas that are NOT inside parentheses
        const items = this._splitByCommaOutsideParens(body);

        for (const item of items) {
            const trimmedItem = item.trim();
            if (!trimmedItem) continue;

            const upperItem = trimmedItem.toUpperCase();

            // 1. Table-level PRIMARY KEY constraint
            if (upperItem.startsWith('PRIMARY KEY') || upperItem.includes('PRIMARY KEY(') || upperItem.includes('PRIMARY KEY (')) {
                this._parseTablePrimaryKey(trimmedItem, table, line);
            }
            // 2. Table-level FOREIGN KEY constraint
            else if (upperItem.includes('FOREIGN KEY') && upperItem.includes('REFERENCES')) {
                this._parseTableForeignKey(trimmedItem, table, line);
            }
            // 3. Table-level UNIQUE constraint
            else if (upperItem.startsWith('UNIQUE') || upperItem.startsWith('CONSTRAINT') && upperItem.includes('UNIQUE')) {
                this._parseTableUnique(trimmedItem, table, line);
            }
            // 4. Table-level CHECK constraint or named constraint that isn't PK/FK/UNIQUE
            else if (upperItem.startsWith('CHECK') || (upperItem.startsWith('CONSTRAINT') && upperItem.includes('CHECK'))) {
                // Table-level check constraint recorded as comment or warning
            }
            // 5. Regular column definition
            else {
                this._parseColumnDefinition(trimmedItem, table, line);
            }
        }

        schema.addTable(table);
    }

    _splitByCommaOutsideParens(str) {
        const parts = [];
        let cur = '';
        let depth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (ch === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
            else if (ch === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
            else if (!inSingleQuote && !inDoubleQuote) {
                if (ch === '(') depth++;
                else if (ch === ')') depth--;
                else if (ch === ',' && depth === 0) {
                    parts.push(cur.trim());
                    cur = '';
                    continue;
                }
            }
            cur += ch;
        }
        if (cur.trim()) parts.push(cur.trim());
        return parts;
    }

    _parseColumnDefinition(colDef, table, baseLine) {
        // Examples:
        // id INT PRIMARY KEY AUTO_INCREMENT
        // email VARCHAR(100) NOT NULL UNIQUE
        // dept_id INT REFERENCES Department(dept_id) ON DELETE CASCADE
        // balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0)
        
        // Remove CONSTRAINT name prefix if attached to inline column
        let cleaned = colDef.replace(/^CONSTRAINT\s+[\w`"']+\s+/i, '');

        const tokens = cleaned.split(/\s+/);
        if (tokens.length < 2) {
            this.warnings.push(`Line ${baseLine}: Could not parse column definition '${colDef}'.`);
            return;
        }

        const colName = this._cleanIdentifier(tokens[0]);

        // Next token is datatype (which may have parentheses e.g. VARCHAR(255) or DECIMAL(10,2))
        // We need to capture the full datatype string
        let remaining = cleaned.substring(tokens[0].length).trim();
        let dataTypeMatch = remaining.match(/^([A-Za-z0-9_]+(?:\s*\([^)]+\))?)/);
        if (!dataTypeMatch) {
            this.warnings.push(`Line ${baseLine}: Unknown data type for column '${colName}'.`);
            return;
        }

        const dataType = dataTypeMatch[1].replace(/\s+/g, '');
        let constraintsStr = remaining.substring(dataTypeMatch[0].length).trim();
        const upperConstraints = constraintsStr.toUpperCase();

        const isPrimaryKey = upperConstraints.includes('PRIMARY KEY');
        const isNotNull = isPrimaryKey || upperConstraints.includes('NOT NULL');
        const isUnique = isPrimaryKey || upperConstraints.includes('UNIQUE');
        const isNullable = !isNotNull;

        let references = null;
        let isForeignKey = false;
        const refMatch = constraintsStr.match(/REFERENCES\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i);
        if (refMatch) {
            isForeignKey = true;
            const refTable = this._cleanIdentifier(refMatch[1]);
            const refCol = refMatch[2] ? this._cleanIdentifier(refMatch[2]) : colName;
            references = { table: refTable, column: refCol };

            // Register corresponding foreign key constraint on the table
            table.addForeignKey(new ForeignKey({
                fromTable: table.name,
                fromColumns: [colName],
                toTable: refTable,
                toColumns: [refCol]
            }));
        }

        const col = new Column({
            name: colName,
            dataType: dataType,
            isPrimaryKey: isPrimaryKey,
            isForeignKey: isForeignKey,
            isNullable: isNullable,
            isUnique: isUnique,
            references: references
        });

        table.addColumn(col);

        if (isPrimaryKey && !table.primaryKey.includes(colName)) {
            table.primaryKey.push(colName);
        }
    }

    _parseTablePrimaryKey(clause, table, line) {
        // PRIMARY KEY (col1, col2) or CONSTRAINT name PRIMARY KEY (col1, col2)
        const match = clause.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => this._cleanIdentifier(c));
            cols.forEach(c => {
                if (!table.primaryKey.includes(c)) {
                    table.primaryKey.push(c);
                }
                const col = table.getColumn(c);
                if (col) {
                    col.isPrimaryKey = true;
                    col.isNullable = false;
                    col.isUnique = true;
                }
            });
        } else {
            this.warnings.push(`Line ${line}: Unable to parse table-level PRIMARY KEY: '${clause}'`);
        }
    }

    _parseTableForeignKey(clause, table, line) {
        // [CONSTRAINT name] FOREIGN KEY (col1) REFERENCES targetTable (refCol1) [ON DELETE ...]
        const match = clause.match(/(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*(?:\(([^)]+)\))?(?:\s+ON\s+DELETE\s+([A-Za-z\s]+))?(?:\s+ON\s+UPDATE\s+([A-Za-z\s]+))?/i);
        if (match) {
            const fkName = match[1] ? this._cleanIdentifier(match[1]) : null;
            const fromCols = match[2].split(',').map(c => this._cleanIdentifier(c));
            const toTable = this._cleanIdentifier(match[3]);
            const toCols = match[4] ? match[4].split(',').map(c => this._cleanIdentifier(c)) : [...fromCols];
            const onDelete = match[5] ? match[5].trim().toUpperCase() : 'NO ACTION';
            const onUpdate = match[6] ? match[6].trim().toUpperCase() : 'NO ACTION';

            table.addForeignKey(new ForeignKey({
                name: fkName,
                fromTable: table.name,
                fromColumns: fromCols,
                toTable: toTable,
                toColumns: toCols,
                onDelete,
                onUpdate
            }));
        } else {
            this.warnings.push(`Line ${line}: Unable to parse table-level FOREIGN KEY: '${clause}'`);
        }
    }

    _parseTableUnique(clause, table, line) {
        // [CONSTRAINT name] UNIQUE (col1, col2)
        const match = clause.match(/(?:CONSTRAINT\s+[^\s]+\s+)?UNIQUE\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => this._cleanIdentifier(c));
            table.uniqueConstraints.push(cols);
            if (cols.length === 1) {
                const col = table.getColumn(cols[0]);
                if (col) col.isUnique = true;
            }
        }
    }

    _parseCreateIndex(stmtObj, schema) {
        // CREATE [UNIQUE] INDEX [IF NOT EXISTS] index_name ON table_name (col1, col2)
        const sql = stmtObj.text;
        const line = stmtObj.lineNumber;
        const match = sql.match(/CREATE\s+(UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\s]+)\s+ON\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (match) {
            const isUnique = Boolean(match[1]);
            const indexName = this._cleanIdentifier(match[2]);
            const tableName = this._cleanIdentifier(match[3]);
            const cols = match[4].split(',').map(c => this._cleanIdentifier(c.split(/\s+/)[0]));

            const table = schema.getTable(tableName);
            if (table) {
                table.addIndex(new Index({
                    name: indexName,
                    tableName: table.name,
                    columns: cols,
                    isUnique: isUnique
                }));
            } else {
                this.warnings.push(`Line ${line}: Index '${indexName}' targets unknown table '${tableName}'. Ensure table is created before its index.`);
            }
        } else {
            this.warnings.push(`Line ${line}: Unable to parse CREATE INDEX statement.`);
        }
    }

    _parseAlterTable(stmtObj, schema) {
        // Support common ALTER TABLE tableName ADD CONSTRAINT ...
        const sql = stmtObj.text;
        const line = stmtObj.lineNumber;
        const match = sql.match(/ALTER\s+TABLE\s+([^\s]+)\s+ADD\s+([\s\S]+)/i);
        if (!match) return;

        const tableName = this._cleanIdentifier(match[1]);
        const table = schema.getTable(tableName);
        if (!table) {
            this.warnings.push(`Line ${line}: ALTER TABLE targets non-existent table '${tableName}'.`);
            return;
        }

        const clause = match[2].trim();
        const upperClause = clause.toUpperCase();
        if (upperClause.includes('FOREIGN KEY') && upperClause.includes('REFERENCES')) {
            this._parseTableForeignKey(clause, table, line);
        } else if (upperClause.includes('PRIMARY KEY')) {
            this._parseTablePrimaryKey(clause, table, line);
        } else if (upperClause.includes('UNIQUE')) {
            this._parseTableUnique(clause, table, line);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SQLParser };
}
