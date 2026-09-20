/**
 * SchemaSense - Academic Report Generator
 * Generates structured downloadable reports in TXT, JSON, and printable PDF formats
 * strictly containing all 21 items specified in project requirement 15.
 */

class SchemaSenseReportGenerator {
    /**
     * Generate structured Text (TXT) report
     * @param {object} analysisResult 
     * @param {string} rawInput 
     * @returns {string} Plain text report
     */
    static generateTextReport(analysisResult, rawInput = '') {
        const { schema, summary, smells, normalization, demonstratedConcepts, timestamp } = analysisResult;
        const dateStr = new Date(timestamp || Date.now()).toLocaleString();

        let report = '';
        report += '========================================================================================\n';
        report += '                      SCHEMASENSE – DATABASE SCHEMA SMELL DETECTOR                     \n';
        report += '                  Academic Analysis Report | B.Tech Database Systems                   \n';
        report += '========================================================================================\n\n';

        // 1. Project Title & 2. Date/Time
        report += `Project Title     : SchemaSense – Database Schema Smell Detector\n`;
        report += `Analysis Date/Time: ${dateStr}\n`;
        report += `Overall Health    : ${summary.healthStatus.toUpperCase()} (${summary.healthDescription})\n`;
        report += `Highest Normal Form: ${summary.overallNormalForm}\n`;
        report += `Smells Summary    : ${summary.criticalCount} Critical | ${summary.warningCount} Warnings | ${summary.suggestionCount} Suggestions\n\n`;

        // 3. User Input
        report += '----------------------------------------------------------------------------------------\n';
        report += '3. ORIGINAL USER INPUT (SQL DDL / SPECIFICATION)\n';
        report += '----------------------------------------------------------------------------------------\n';
        report += (rawInput || 'No raw SQL captured (visual input mode).').trim() + '\n\n';

        // 4. Parsed Schema & 5. Tables & 6. Columns & 7. PK & 8. FK & 9. Constraints & 10. Indexes
        report += '----------------------------------------------------------------------------------------\n';
        report += '4–10. PARSED RELATIONAL SCHEMA STRUCTURE\n';
        report += '----------------------------------------------------------------------------------------\n';
        report += `Total Tables: ${summary.totalTables} | Total Columns: ${summary.totalColumns} | Total PKs: ${summary.totalPrimaryKeys} | Total FKs: ${summary.totalForeignKeys} | Total Indexes: ${summary.totalIndexes}\n\n`;

        schema.tables.forEach((table, idx) => {
            report += `TABLE ${idx + 1}: ${table.name}\n`;
            report += `  • Primary Key       : [${table.primaryKey.join(', ') || 'NONE - Entity Integrity Violation'}]\n`;
            report += `  • Foreign Keys      : ${table.foreignKeys.length > 0 ? table.foreignKeys.map(fk => `(${fk.fromColumns.join(', ')}) -> ${fk.toTable}(${fk.toColumns.join(', ')})`).join('; ') : 'None'}\n`;
            report += `  • Unique Constraints: ${table.uniqueConstraints.length > 0 ? table.uniqueConstraints.map(u => `(${u.join(', ')})`).join('; ') : 'None'}\n`;
            report += `  • Indexes Defined   : ${table.indexes.length > 0 ? table.indexes.map(i => `${i.name} (${i.columns.join(', ')})`).join('; ') : 'None'}\n`;
            report += `  • Columns Detail    :\n`;
            table.columns.forEach(col => {
                const flags = [];
                if (col.isPrimaryKey) flags.push('PRIMARY KEY');
                if (col.isForeignKey) flags.push('FOREIGN KEY');
                if (!col.isNullable) flags.push('NOT NULL');
                if (col.isUnique && !col.isPrimaryKey) flags.push('UNIQUE');
                report += `      - ${col.name.padEnd(24)} ${col.dataType.padEnd(16)} ${flags.join(', ')}\n`;
            });
            report += '\n';
        });

        // 11. Functional Dependencies
        report += '----------------------------------------------------------------------------------------\n';
        report += '11. FUNCTIONAL DEPENDENCIES & WORKLOAD OPTIONS\n';
        report += '----------------------------------------------------------------------------------------\n';
        let fdCount = 0;
        schema.tables.forEach(t => {
            if (t.functionalDependencies && t.functionalDependencies.length > 0) {
                report += `Table '${t.name}':\n`;
                t.functionalDependencies.forEach(fd => {
                    report += `  • ${fd.toString()}\n`;
                    fdCount++;
                });
            }
        });
        if (fdCount === 0) {
            report += 'No explicit functional dependencies were supplied. Normalization evaluated using key inference.\n';
        }
        report += '\n';

        // 12. Processing Pipeline Steps
        report += '----------------------------------------------------------------------------------------\n';
        report += '12. PROCESSING PIPELINE STEPS EXECUTED\n';
        report += '----------------------------------------------------------------------------------------\n';
        report += '  [Step 1] SQL Tokenization & DDL Lexical Parsing (Syntax & Line Error Tracking)\n';
        report += '  [Step 2] Relational Schema Graph Construction (Tables, Columns, Keys, Indexes)\n';
        report += '  [Step 3] Constraint Verification (Entity Integrity, Referential Consistency, Domain)\n';
        report += '  [Step 4] Functional Dependency Closure & Candidate Key Search (Armstrong Axioms)\n';
        report += '  [Step 5] Stepwise Normalization Analysis (1NF -> 2NF -> 3NF -> BCNF -> 4NF -> 5NF)\n';
        report += '  [Step 6] Normalization Consequence Analysis (Update, Insert, and Delete Anomalies)\n';
        report += '  [Step 7] Physical Design & B+ Tree Indexing Assessment (Coverage, Selectivity, Over-indexing)\n';
        report += '  [Step 8] Distributed Architecture & NoSQL Verification (CAP Theorem, Partition Keys)\n';
        report += '  [Step 9] Health Scoring & Recommendation Generation\n\n';

        // 13. Normalization Analysis (Table by Table)
        report += '----------------------------------------------------------------------------------------\n';
        report += '13. STEP-BY-STEP NORMALIZATION ANALYSIS\n';
        report += '----------------------------------------------------------------------------------------\n';
        for (const [tName, norm] of Object.entries(normalization)) {
            report += `Table: ${tName}  ==> Highest Normal Form: ${norm.highestNF}\n`;
            report += `  • 1NF:  ${norm.steps.oneNF.status.padEnd(8)} - ${norm.steps.oneNF.reasons[0] || 'No issues'}\n`;
            report += `  • 2NF:  ${norm.steps.twoNF.status.padEnd(8)} - ${norm.steps.twoNF.reasons[0] || 'No issues'}\n`;
            report += `  • 3NF:  ${norm.steps.threeNF.status.padEnd(8)} - ${norm.steps.threeNF.reasons[0] || 'No issues'}\n`;
            report += `  • BCNF: ${norm.steps.bcnf.status.padEnd(8)} - ${norm.steps.bcnf.reasons[0] || 'No issues'}\n`;
            report += `  • 4NF:  ${norm.steps.fourNF.status.padEnd(8)} - ${norm.steps.fourNF.reasons[0]}\n`;
            report += `  • 5NF:  ${norm.steps.fiveNF.status.padEnd(8)} - ${norm.steps.fiveNF.reasons[0]}\n\n`;
        }

        // 14–18. Detected Smells Breakdown
        report += '----------------------------------------------------------------------------------------\n';
        report += '14–18. DETECTED DATABASE DESIGN SMELLS BREAKDOWN\n';
        report += '----------------------------------------------------------------------------------------\n';
        const detected = smells.filter(s => s.status === 'Detected');
        if (detected.length === 0) {
            report += 'No design smells detected! Schema meets all academic criteria.\n\n';
        } else {
            detected.forEach((s, idx) => {
                report += `[SMELL #${idx + 1}] ${s.name} (${s.id})\n`;
                report += `  • Severity       : ${s.severity}\n`;
                report += `  • Category       : ${s.category}\n`;
                report += `  • Affected Object: ${s.affectedObject}\n`;
                report += `  • Related Concept: ${s.concept}\n`;
                report += `  • Syllabus Module: ${s.syllabus}\n`;
                report += `  • Why Detected   : ${s.whyDetected}\n`;
                report += `  • Schema Example : ${s.example.replace(/\n/g, '\n                     ')}\n`;
                report += `  • Recommendation : ${s.recommendation}\n\n`;
            });
        }

        // 19. Intermediate Results & Potential Warnings
        const potential = smells.filter(s => s.status === 'Potential / Needs Review');
        if (potential.length > 0) {
            report += '----------------------------------------------------------------------------------------\n';
            report += '19. INTERMEDIATE RESULTS & ITEMS REQUIRING USER REVIEW\n';
            report += '----------------------------------------------------------------------------------------\n';
            potential.forEach((p, idx) => {
                report += `[REVIEW #${idx + 1}] ${p.name} - ${p.affectedObject}\n`;
                report += `  • Context: ${p.whyDetected}\n`;
                report += `  • Guidance: ${p.recommendation}\n\n`;
            });
        }

        // 20. Final Summary & 21. Concepts Demonstrated
        report += '----------------------------------------------------------------------------------------\n';
        report += '20–21. FINAL ACADEMIC SUMMARY & CONCEPTS DEMONSTRATED\n';
        report += '----------------------------------------------------------------------------------------\n';
        report += `Total Issues Found: ${summary.totalSmellsDetected} Detected | ${summary.totalPotentialSmells} Needs Review\n`;
        report += `Health Status     : ${summary.healthStatus.toUpperCase()}\n`;
        report += `Course Concepts Demonstrated:\n`;
        demonstratedConcepts.forEach(c => {
            report += `  ✓ ${c}\n`;
        });
        const studentInfo = typeof localStorage !== 'undefined' ? localStorage.getItem('schemasense_student1_name') : null;
        const studentReg = typeof localStorage !== 'undefined' ? localStorage.getItem('schemasense_student1_reg') : null;
        const mentorName = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_faculty_name')) || 'Dr. Swaminathan A';
        const mentorDesig = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_faculty_title')) || 'Assistant Professor';

        if (studentInfo) {
            report += `Submitted By      : ${studentInfo} ${studentReg ? `(${studentReg})` : ''}\n`;
        }
        report += `Guided By         : ${mentorName}, ${mentorDesig}\n`;
        report += '\n========================================================================================\n';
        report += 'Report generated automatically by SchemaSense – Database Schema Smell Detector\n';
        report += `Faculty Guide     : ${mentorName}, ${mentorDesig}\n`;
        report += '========================================================================================\n';

        return report;
    }

    /**
     * Download text report to client
     * @param {object} analysisResult 
     * @param {string} rawInput 
     */
    static downloadTextReport(analysisResult, rawInput = '') {
        const text = this.generateTextReport(analysisResult, rawInput);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        this._triggerDownload(blob, `schemasense_report_${Date.now()}.txt`);
    }

    /**
     * Download structured JSON report to client
     * @param {object} analysisResult 
     */
    static downloadJsonReport(analysisResult) {
        const json = JSON.stringify(analysisResult, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        this._triggerDownload(blob, `schemasense_data_${Date.now()}.json`);
    }

    /**
     * Open printable / PDF-exportable academic report window
     * @param {object} analysisResult 
     * @param {string} rawInput 
     */
    static openPrintablePDFReport(analysisResult, rawInput = '') {
        const { schema, summary, smells, normalization, demonstratedConcepts, timestamp } = analysisResult;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to generate the printable PDF report.');
            return;
        }

        const detected = smells.filter(s => s.status === 'Detected');
        const potential = smells.filter(s => s.status === 'Potential / Needs Review');

                const student1 = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_student1_name')) || '';
                const reg1 = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_student1_reg')) || '';
                const student2 = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_student2_name')) || '';
                const reg2 = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_student2_reg')) || '';
                const mentor = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_faculty_name')) || 'Dr. Swaminathan A';
                const mentorTitle = (typeof localStorage !== 'undefined' && localStorage.getItem('schemasense_faculty_title')) || 'Assistant Professor';

                const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>SchemaSense Academic Report - ${new Date(timestamp).toLocaleDateString()}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; padding: 40px; margin: 0; background: #fff; }
                    .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
                    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
                    .meta-bar { display: flex; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; }
                    h2 { font-size: 16px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; text-transform: uppercase; letter-spacing: 0.5px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                    th { background: #f1f5f9; font-weight: 600; color: #334155; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
                    .badge-high { background: #fee2e2; color: #b91c1c; }
                    .badge-med { background: #fef3c7; color: #b45309; }
                    .badge-low { background: #e0f2fe; color: #0369a1; }
                    .badge-pass { background: #dcfce7; color: #15803d; }
                    .badge-fail { background: #fee2e2; color: #b91c1c; }
                    .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #fafafa; }
                    .card-title { font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #0f172a; }
                    .print-btn { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px;">
                    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <span style="margin-left: 15px; font-size: 13px; color: #64748b;">(Choose "Save as PDF" in your print dialog)</span>
                </div>

                <div class="header">
                    <h1 class="title">SchemaSense – Database Schema Smell Detector</h1>
                    <div class="subtitle">Academic Analysis Report | B.Tech Course: Database Systems</div>
                    ${student1 ? `<div style="font-size: 13px; color: #334155; margin-top: 6px;">Student Author: <strong>${student1}</strong> ${reg1 ? `(${reg1})` : ''} ${student2 ? ` | <strong>${student2}</strong> ${reg2 ? `(${reg2})` : ''}` : ''}</div>` : ''}
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Faculty Guide: <strong>${mentor}</strong>, ${mentorTitle}</div>
                </div>

                <div class="meta-bar">
                    <div><strong>Date/Time:</strong> ${new Date(timestamp).toLocaleString()}</div>
                    <div><strong>Schema Health:</strong> <span class="badge ${summary.healthStatus === 'Good' ? 'badge-pass' : 'badge-high'}">${summary.healthStatus}</span></div>
                    <div><strong>Highest Normal Form:</strong> ${summary.overallNormalForm}</div>
                    <div><strong>Total Smells:</strong> ${summary.totalSmellsDetected} Detected</div>
                </div>

                <h2>1. Schema Metrics</h2>
                <table>
                    <tr><th>Tables</th><th>Columns</th><th>Primary Keys</th><th>Foreign Keys</th><th>Indexes</th><th>Critical Issues</th><th>Warnings</th></tr>
                    <tr>
                        <td>${summary.totalTables}</td>
                        <td>${summary.totalColumns}</td>
                        <td>${summary.totalPrimaryKeys}</td>
                        <td>${summary.totalForeignKeys}</td>
                        <td>${summary.totalIndexes}</td>
                        <td><span class="badge badge-high">${summary.criticalCount}</span></td>
                        <td><span class="badge badge-med">${summary.warningCount}</span></td>
                    </tr>
                </table>

                <h2>2. Stepwise Normalization Analysis (1NF–5NF)</h2>
                <table>
                    <tr><th>Table</th><th>1NF</th><th>2NF</th><th>3NF</th><th>BCNF</th><th>4NF</th><th>5NF</th><th>Highest Form</th></tr>
                    ${Object.entries(normalization).map(([tName, norm]) => `
                        <tr>
                            <td><strong>${tName}</strong></td>
                            <td><span class="badge ${norm.steps.oneNF.status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${norm.steps.oneNF.status}</span></td>
                            <td><span class="badge ${norm.steps.twoNF.status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${norm.steps.twoNF.status}</span></td>
                            <td><span class="badge ${norm.steps.threeNF.status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${norm.steps.threeNF.status}</span></td>
                            <td><span class="badge ${norm.steps.bcnf.status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${norm.steps.bcnf.status}</span></td>
                            <td><span class="badge ${norm.steps.fourNF.status === 'PASS' ? 'badge-pass' : 'badge-med'}">${norm.steps.fourNF.status}</span></td>
                            <td><span class="badge ${norm.steps.fiveNF.status === 'PASS' ? 'badge-pass' : 'badge-med'}">${norm.steps.fiveNF.status}</span></td>
                            <td><strong>${norm.highestNF}</strong></td>
                        </tr>
                    `).join('')}
                </table>

                <h2>3. Detected Design Smells Breakdown (${detected.length})</h2>
                ${detected.map(s => `
                    <div class="card">
                        <div class="card-title">
                            [${s.id}] ${s.name}
                            <span class="badge ${s.severity === 'HIGH' ? 'badge-high' : (s.severity === 'MEDIUM' ? 'badge-med' : 'badge-low')}">${s.severity}</span>
                        </div>
                        <div style="font-size: 12px; margin-bottom: 4px;"><strong>Affected:</strong> <code>${s.affectedObject}</code> | <strong>Module:</strong> ${s.syllabus}</div>
                        <div style="font-size: 12px; margin-bottom: 4px;"><strong>Why:</strong> ${s.whyDetected}</div>
                        <div style="font-size: 12px; margin-bottom: 4px;"><strong>Example:</strong> <pre style="background: #e2e8f0; padding: 6px; border-radius: 4px; font-size: 11px;">${s.example}</pre></div>
                        <div style="font-size: 12px; color: #166534;"><strong>Recommendation:</strong> ${s.recommendation}</div>
                    </div>
                `).join('')}

                <h2>4. Syllabus Concepts Demonstrated</h2>
                <ul>
                    ${demonstratedConcepts.map(c => `<li style="font-size: 12px;">${c}</li>`).join('')}
                </ul>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    }

    static _triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SchemaSenseReportGenerator };
}
