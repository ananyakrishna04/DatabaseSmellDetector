/**
 * SchemaSense - Automated Verification Test Suite
 * Executes 12 comprehensive unit and integration tests covering all requirements.
 */

class SchemaSenseTestSuite {
    constructor() {
        this.analyzer = new SchemaAnalyzer();
    }

    /**
     * Run all 12 test cases and return structured results
     * @returns {Promise<Array<{ id: number, name: string, description: string, passed: boolean, details: string, durationMs: number }>>}
     */
    async runAllTests() {
        const testDefinitions = [
            { id: 1, name: 'Perfect Relational Schema', fn: () => this.test1_PerfectSchema() },
            { id: 2, name: 'Schema Without Primary Keys', fn: () => this.test2_MissingPK() },
            { id: 3, name: 'Schema With Inferred Missing Foreign Keys', fn: () => this.test3_MissingFK() },
            { id: 4, name: 'Schema With Multivalued / Non-Atomic Attributes', fn: () => this.test4_Multivalued() },
            { id: 5, name: 'Schema With Repeating Groups', fn: () => this.test5_RepeatingGroups() },
            { id: 6, name: 'Schema With 2NF Violation (Partial Dependency)', fn: () => this.test6_2NFViolation() },
            { id: 7, name: 'Schema With 3NF Violation (Transitive Dependency)', fn: () => this.test7_3NFViolation() },
            { id: 8, name: 'Schema With Physical Indexing Problems (Missing FK Index)', fn: () => this.test8_IndexingProblems() },
            { id: 9, name: 'Schema With Duplicate / Redundant Indexes', fn: () => this.test9_DuplicateIndexes() },
            { id: 10, name: 'Invalid SQL Input Handling (Line-tracked Syntax Error)', fn: () => this.test10_InvalidSQL() },
            { id: 11, name: 'Empty Input Validation Handling', fn: () => this.test11_EmptyInput() },
            { id: 12, name: 'Partially Specified Dependency Information', fn: () => this.test12_PartialDependencyInfo() }
        ];

        const results = [];
        for (const t of testDefinitions) {
            const start = performance.now();
            try {
                const res = await t.fn();
                const duration = Math.round(performance.now() - start);
                results.push({
                    id: t.id,
                    name: t.name,
                    passed: res.passed,
                    details: res.details,
                    durationMs: duration
                });
            } catch (err) {
                results.push({
                    id: t.id,
                    name: t.name,
                    passed: false,
                    details: `Unexpected Exception: ${err.message}`,
                    durationMs: 0
                });
            }
        }

        return results;
    }

    // 1. Perfectly designed schema
    test1_PerfectSchema() {
        const sql = `
            CREATE TABLE Department (
                dept_id INT PRIMARY KEY,
                dept_name VARCHAR(100) NOT NULL UNIQUE
            );
            CREATE TABLE Employee (
                emp_id INT PRIMARY KEY,
                emp_name VARCHAR(100) NOT NULL,
                dept_id INT NOT NULL,
                FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
            );
            CREATE INDEX idx_emp_dept ON Employee (dept_id);
        `;
        const res = this.analyzer.analyze(sql);
        const criticals = res.smells.filter(s => s.severity === 'HIGH' && s.status === 'Detected');
        const passed = res.success && criticals.length === 0 && res.summary.healthStatus === 'Good';
        return {
            passed,
            details: passed 
                ? `Passed: 0 critical smells detected, Schema Health evaluated as '${res.summary.healthStatus}'.` 
                : `Failed: Found ${criticals.length} unexpected critical issues.`
        };
    }

    // 2. Schema without primary keys
    test2_MissingPK() {
        const sql = `
            CREATE TABLE LogRecords (
                log_time TIMESTAMP,
                message VARCHAR(255)
            );
        `;
        const res = this.analyzer.analyze(sql);
        const pkSmell = res.smells.find(s => s.id === 'REL-001' && s.status === 'Detected');
        const passed = Boolean(pkSmell) && pkSmell.affectedObject.includes('LogRecords');
        return {
            passed,
            details: passed 
                ? `Passed: Correctly detected Missing Primary Key (REL-001) on table 'LogRecords'.`
                : `Failed: Missing Primary Key smell not detected.`
        };
    }

    // 3. Schema with missing foreign keys
    test3_MissingFK() {
        const sql = `
            CREATE TABLE Department (
                department_id INT PRIMARY KEY,
                dept_name VARCHAR(100)
            );
            CREATE TABLE Student (
                student_id INT PRIMARY KEY,
                student_name VARCHAR(100),
                department_id INT
            );
        `;
        const res = this.analyzer.analyze(sql);
        const fkSmell = res.smells.find(s => s.id === 'REL-002' && s.status === 'Detected');
        const passed = Boolean(fkSmell) && fkSmell.affectedObject.includes('Student.department_id');
        return {
            passed,
            details: passed 
                ? `Passed: Successfully inferred logical relationship and flagged Missing Foreign Key (REL-002).`
                : `Failed: Inferred Foreign Key relationship not detected.`
        };
    }

    // 4. Schema with multivalued attributes
    test4_Multivalued() {
        const sql = `
            CREATE TABLE Developer (
                dev_id INT PRIMARY KEY,
                skills VARCHAR(255),
                phone_numbers VARCHAR(100)
            );
        `;
        const res = this.analyzer.analyze(sql);
        const multiSmell = res.smells.find(s => s.id === 'REL-008' && s.status === 'Detected');
        const passed = Boolean(multiSmell);
        return {
            passed,
            details: passed 
                ? `Passed: Correctly identified multivalued non-atomic column (REL-008) and 1NF violation.`
                : `Failed: Multivalued column not detected.`
        };
    }

    // 5. Schema with repeating groups
    test5_RepeatingGroups() {
        const sql = `
            CREATE TABLE Contact (
                contact_id INT PRIMARY KEY,
                phone1 VARCHAR(15),
                phone2 VARCHAR(15),
                phone3 VARCHAR(15)
            );
        `;
        const res = this.analyzer.analyze(sql);
        const repeatSmell = res.smells.find(s => s.id === 'REL-009' && s.status === 'Detected');
        const passed = Boolean(repeatSmell) && repeatSmell.affectedObject.includes('phone1, phone2, phone3');
        return {
            passed,
            details: passed 
                ? `Passed: Detected numbered repeating group pattern 'phone1, phone2, phone3' (REL-009).`
                : `Failed: Repeating groups not flagged.`
        };
    }

    // 6. Schema with 2NF violation
    test6_2NFViolation() {
        const sql = `
            CREATE TABLE StudentCourse (
                student_id INT,
                course_id INT,
                student_name VARCHAR(100),
                course_name VARCHAR(100),
                grade VARCHAR(2),
                PRIMARY KEY (student_id, course_id)
            );
        `;
        const fds = `
            student_id -> student_name
            course_id -> course_name
            student_id, course_id -> grade
        `;
        const res = this.analyzer.analyze(sql, { functionalDependenciesText: fds });
        const norm = res.normalization['StudentCourse'];
        const twoNFSmell = res.smells.find(s => s.id === 'NORM-015' && s.status === 'Detected');
        const passed = Boolean(twoNFSmell) && norm && norm.steps.twoNF.status === 'FAIL';
        return {
            passed,
            details: passed 
                ? `Passed: Partial dependencies verified; 2NF Violation (NORM-015) successfully reported as FAIL.`
                : `Failed: 2NF violation not detected.`
        };
    }

    // 7. Schema with 3NF violation
    test7_3NFViolation() {
        const sql = `
            CREATE TABLE Student (
                student_id INT PRIMARY KEY,
                student_name VARCHAR(100),
                department_id INT,
                department_name VARCHAR(100)
            );
        `;
        const fds = `
            student_id -> student_name, department_id
            department_id -> department_name
        `;
        const res = this.analyzer.analyze(sql, { functionalDependenciesText: fds });
        const norm = res.normalization['Student'];
        const threeNFSmell = res.smells.find(s => s.id === 'NORM-016' && s.status === 'Detected');
        const passed = Boolean(threeNFSmell) && norm && norm.steps.threeNF.status === 'FAIL';
        return {
            passed,
            details: passed 
                ? `Passed: Transitive dependency {department_id} -> {department_name} flagged 3NF Violation (NORM-016).`
                : `Failed: 3NF transitive dependency violation not detected.`
        };
    }

    // 8. Schema with indexing problems
    test8_IndexingProblems() {
        const sql = `
            CREATE TABLE Orders (
                order_id INT PRIMARY KEY,
                customer_id INT NOT NULL,
                order_date DATE
            );
            CREATE TABLE Customer (
                customer_id INT PRIMARY KEY
            );
            ALTER TABLE Orders ADD FOREIGN KEY (customer_id) REFERENCES Customer(customer_id);
        `;
        const res = this.analyzer.analyze(sql);
        const idxSmell = res.smells.find(s => s.id === 'IDX-023' && s.status === 'Detected');
        const passed = Boolean(idxSmell) && idxSmell.affectedObject.includes('Orders.customer_id');
        return {
            passed,
            details: passed 
                ? `Passed: Correctly flagged Missing Index on Foreign Key column Orders.customer_id (IDX-023).`
                : `Failed: Missing index on foreign key not flagged.`
        };
    }

    // 9. Schema with duplicate indexes
    test9_DuplicateIndexes() {
        const sql = `
            CREATE TABLE Product (
                product_id INT PRIMARY KEY,
                sku VARCHAR(50),
                category_id INT
            );
            CREATE INDEX idx_sku_cat1 ON Product (sku, category_id);
            CREATE INDEX idx_sku_cat2 ON Product (sku, category_id);
        `;
        const res = this.analyzer.analyze(sql);
        const dupSmell = res.smells.find(s => s.id === 'IDX-024' && s.status === 'Detected');
        const passed = Boolean(dupSmell);
        return {
            passed,
            details: passed 
                ? `Passed: Successfully identified duplicate/redundant index definition (IDX-024).`
                : `Failed: Redundant index not flagged.`
        };
    }

    // 10. Invalid SQL input
    test10_InvalidSQL() {
        const invalidSql = `
            CREATE TABLE Valid (id INT PRIMARY KEY);
            CREATE TABLE Incomplete (
                id INT
            -- Missing closing parenthesis and semicolon
        `;
        const res = this.analyzer.analyze(invalidSql);
        const passed = !res.success && res.errors.length > 0 && res.errors[0].includes('Unable to parse SQL near line');
        return {
            passed,
            details: passed 
                ? `Passed: Gracefully caught syntax error with line location: "${res.errors[0]}". Application did not crash.`
                : `Failed: Syntax error was not properly trapped or reported.`
        };
    }

    // 11. Empty input
    test11_EmptyInput() {
        const res = this.analyzer.analyze('   ');
        const passed = !res.success && res.errors.length > 0 && res.errors[0].includes('Empty input');
        return {
            passed,
            details: passed 
                ? `Passed: Safely rejected empty string with friendly validation message: "${res.errors[0]}".`
                : `Failed: Empty input was not rejected properly.`
        };
    }

    // 12. Partially specified dependency information
    test12_PartialDependencyInfo() {
        const sql = `
            CREATE TABLE ProjectAssignment (
                emp_id INT,
                project_id INT,
                role_name VARCHAR(50),
                PRIMARY KEY (emp_id, project_id)
            );
        `;
        // No FDs supplied for composite key
        const res = this.analyzer.analyze(sql);
        const norm = res.normalization['ProjectAssignment'];
        const status2NF = norm.steps.twoNF.status;
        const status4NF = norm.steps.fourNF.status;
        const passed = status2NF === 'NEEDS DEPENDENCY INFORMATION' && status4NF === 'NEEDS MVD INFORMATION';
        return {
            passed,
            details: passed 
                ? `Passed: Correctly labeled normalization status as 'NEEDS DEPENDENCY INFORMATION' rather than making false claims without FDs.`
                : `Failed: Engine did not request missing dependency/MVD information.`
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SchemaSenseTestSuite };
}
