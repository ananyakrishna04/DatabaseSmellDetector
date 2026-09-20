/**
 * SchemaSense - Database Schema Model
 * Encapsulates relational schema objects: Tables, Columns, Constraints, Indexes, and Dependencies
 */

class Column {
    constructor({ name, dataType = 'VARCHAR(255)', isPrimaryKey = false, isForeignKey = false, 
                  isNullable = true, isUnique = false, defaultValue = null, checkConstraint = null,
                  references = null, comment = '' }) {
        this.name = name.trim();
        this.dataType = dataType.trim().toUpperCase();
        this.isPrimaryKey = Boolean(isPrimaryKey);
        this.isForeignKey = Boolean(isForeignKey);
        this.isNullable = this.isPrimaryKey ? false : Boolean(isNullable);
        this.isUnique = this.isPrimaryKey ? true : Boolean(isUnique);
        this.defaultValue = defaultValue;
        this.checkConstraint = checkConstraint;
        // references format: { table: 'Department', column: 'dept_id' }
        this.references = references;
        this.comment = comment;
    }

    getBaseType() {
        const match = this.dataType.match(/^([A-Z_]+)/);
        return match ? match[1] : this.dataType;
    }

    getTypeLength() {
        const match = this.dataType.match(/\((\d+)(?:,\s*(\d+))?\)/);
        if (!match) return null;
        return match[2] ? [parseInt(match[1]), parseInt(match[2])] : parseInt(match[1]);
    }
}

class Index {
    constructor({ name, tableName, columns = [], isUnique = false, indexType = 'BTREE' }) {
        this.name = name || `idx_${tableName}_${columns.join('_')}`;
        this.tableName = tableName;
        this.columns = columns.map(c => c.trim());
        this.isUnique = Boolean(isUnique);
        this.indexType = indexType.toUpperCase();
    }
}

class ForeignKey {
    constructor({ name = null, fromTable, fromColumns = [], toTable, toColumns = [], 
                  onDelete = 'NO ACTION', onUpdate = 'NO ACTION' }) {
        this.name = name || `fk_${fromTable}_${toTable}_${fromColumns.join('_')}`;
        this.fromTable = fromTable;
        this.fromColumns = Array.isArray(fromColumns) ? fromColumns : [fromColumns];
        this.toTable = toTable;
        this.toColumns = Array.isArray(toColumns) ? toColumns : [toColumns];
        this.onDelete = onDelete;
        this.onUpdate = onUpdate;
    }
}

class FunctionalDependency {
    constructor(determinant = [], dependent = []) {
        // determinant -> dependent
        this.determinant = Array.isArray(determinant) ? determinant.map(s => s.trim()) : [determinant.trim()];
        this.dependent = Array.isArray(dependent) ? dependent.map(s => s.trim()) : [dependent.trim()];
        // Sort for consistent canonical comparisons
        this.determinant.sort();
        this.dependent.sort();
    }

    toString() {
        return `${this.determinant.join(', ')} -> ${this.dependent.join(', ')}`;
    }
}

class Table {
    constructor(name) {
        this.name = name.trim();
        this.columns = []; // Array of Column
        this.primaryKey = []; // Array of column names (composite supported)
        this.foreignKeys = []; // Array of ForeignKey
        this.uniqueConstraints = []; // Array of arrays of column names
        this.indexes = []; // Array of Index
        this.functionalDependencies = []; // Array of FunctionalDependency
        this.candidateKeys = []; // Discovered or user-provided candidate keys
        this.comment = '';
    }

    addColumn(column) {
        if (!(column instanceof Column)) {
            column = new Column(column);
        }
        // Avoid duplicate columns
        const existingIdx = this.columns.findIndex(c => c.name.toLowerCase() === column.name.toLowerCase());
        if (existingIdx >= 0) {
            this.columns[existingIdx] = column;
        } else {
            this.columns.push(column);
        }
        if (column.isPrimaryKey && !this.primaryKey.includes(column.name)) {
            this.primaryKey.push(column.name);
        }
    }

    getColumn(name) {
        return this.columns.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
    }

    hasColumn(name) {
        return this.getColumn(name) !== null;
    }

    getColumnNames() {
        return this.columns.map(c => c.name);
    }

    addForeignKey(fk) {
        if (!(fk instanceof ForeignKey)) {
            fk = new ForeignKey(fk);
        }
        this.foreignKeys.push(fk);
        // Also mark corresponding columns
        fk.fromColumns.forEach(colName => {
            const col = this.getColumn(colName);
            if (col) {
                col.isForeignKey = true;
                col.references = { table: fk.toTable, column: fk.toColumns[0] || null };
            }
        });
    }

    addIndex(idx) {
        if (!(idx instanceof Index)) {
            idx = new Index(idx);
        }
        this.indexes.push(idx);
    }
}

class Schema {
    constructor(name = 'SchemaSenseDB') {
        this.name = name;
        this.tables = []; // Array of Table
        this.advancedOptions = {
            workloadSearchColumns: [],
            noSqlModel: 'none', // 'none', 'document', 'key-value', 'columnar', 'graph'
            partitionKey: '',
            replicationFactor: 1,
            fragmentationType: 'none', // 'none', 'horizontal', 'vertical', 'hybrid'
            capPriorities: { c: true, a: true, p: false } // User stated priorities
        };
    }

    addTable(table) {
        if (!(table instanceof Table)) {
            table = new Table(table.name);
        }
        const existingIdx = this.tables.findIndex(t => t.name.toLowerCase() === table.name.toLowerCase());
        if (existingIdx >= 0) {
            this.tables[existingIdx] = table;
        } else {
            this.tables.push(table);
        }
    }

    getTable(name) {
        return this.tables.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
    }

    getAllTableNames() {
        return this.tables.map(t => t.name);
    }

    getTotalColumnsCount() {
        return this.tables.reduce((acc, t) => acc + t.columns.length, 0);
    }

    getTotalPrimaryKeysCount() {
        return this.tables.reduce((acc, t) => acc + (t.primaryKey.length > 0 ? 1 : 0), 0);
    }

    getTotalForeignKeysCount() {
        return this.tables.reduce((acc, t) => acc + t.foreignKeys.length, 0);
    }

    getTotalIndexesCount() {
        return this.tables.reduce((acc, t) => acc + t.indexes.length, 0);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Column, Index, ForeignKey, FunctionalDependency, Table, Schema };
}
