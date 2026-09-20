/**
 * SchemaSense - Main Application Controller
 * Handles Navigation, Day/Night Mode, Analysis Pipeline, Visual Schema Builder,
 * Smell Filtering, Before/After Redesign, and Report Exports.
 */

class SchemaSenseApp {
    constructor() {
        this.analyzer = new SchemaAnalyzer();
        this.currentAnalysis = null;
        this.currentRawInput = '';
        this.visualTables = [];
        this.initTheme();
        this.initEvents();
        this.initVisualBuilder();
        this.initStudentDetails();
        this.loadSample('student-mgmt');
    }

    /* ==========================================================================
       THEME (DAY / NIGHT MODE)
       ========================================================================== */
    initTheme() {
        const savedTheme = localStorage.getItem('schemasense_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);

        const themeToggle = document.getElementById('theme-toggle-btn');
        if (themeToggle) {
            themeToggle.onclick = () => {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('schemasense_theme', next);
                this.updateThemeButton(next);
                if (this.currentAnalysis) {
                    this.renderResults(this.currentAnalysis);
                }
            };
        }
    }

    updateThemeButton(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        if (theme === 'dark') {
            btn.innerHTML = '☀️ Day Mode';
            btn.setAttribute('title', 'Switch to Day Mode');
        } else {
            btn.innerHTML = '🌙 Night Mode';
            btn.setAttribute('title', 'Switch to Night Mode');
        }
    }

    /* ==========================================================================
       NAVIGATION & EVENT BINDINGS
       ========================================================================== */
    initEvents() {
        // Main Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const targetView = link.getAttribute('data-view');
                this.switchView(targetView);
            });
        });

        // CTA buttons on Home page
        const ctaStart = document.getElementById('cta-start-analysis');
        if (ctaStart) {
            ctaStart.onclick = () => {
                this.switchView('analyze');
                document.getElementById('sql-input').focus();
            };
        }

        const ctaSample = document.getElementById('cta-try-sample');
        if (ctaSample) {
            ctaSample.onclick = () => {
                this.switchView('analyze');
                this.loadSample('student-mgmt');
                this.runAnalysis();
            };
        }

        // Input Mode Tabs (SQL DDL vs Visual vs Advanced)
        document.querySelectorAll('.input-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.input-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.input-tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const paneId = btn.getAttribute('data-pane');
                const pane = document.getElementById(paneId);
                if (pane) pane.classList.add('active');
            });
        });

        // Sample Selector Dropdown
        const sampleSelect = document.getElementById('sample-schema-select');
        const loadSampleBtn = document.getElementById('btn-load-sample');
        if (loadSampleBtn && sampleSelect) {
            loadSampleBtn.onclick = () => {
                this.loadSample(sampleSelect.value);
            };
        }

        // Analyze Schema Primary Button
        const analyzeBtn = document.getElementById('btn-run-analysis');
        if (analyzeBtn) {
            analyzeBtn.onclick = () => this.runAnalysis();
        }

        // Quick Clear Button
        const clearBtn = document.getElementById('btn-clear-input');
        if (clearBtn) {
            clearBtn.onclick = () => {
                document.getElementById('sql-input').value = '';
                document.getElementById('fd-input').value = '';
                document.getElementById('results-section').style.display = 'none';
            };
        }

        // Smell Filter Buttons (Severity & Category)
        const severityFilter = document.getElementById('filter-severity');
        const categoryFilter = document.getElementById('filter-category');
        const statusFilter = document.getElementById('filter-status');

        [severityFilter, categoryFilter, statusFilter].forEach(el => {
            if (el) el.addEventListener('change', () => this.filterSmellCards());
        });

        // Expand / Collapse All Smell Cards
        const btnExpandAll = document.getElementById('btn-expand-all');
        const btnCollapseAll = document.getElementById('btn-collapse-all');
        if (btnExpandAll) {
            btnExpandAll.onclick = () => {
                document.querySelectorAll('.smell-card').forEach(c => c.classList.add('expanded'));
            };
        }
        if (btnCollapseAll) {
            btnCollapseAll.onclick = () => {
                document.querySelectorAll('.smell-card').forEach(c => c.classList.remove('expanded'));
            };
        }

        // Download Report Buttons
        const btnTxt = document.getElementById('btn-download-txt');
        const btnPdf = document.getElementById('btn-download-pdf');
        const btnJson = document.getElementById('btn-download-json');

        if (btnTxt) {
            btnTxt.onclick = () => {
                if (this.currentAnalysis) {
                    SchemaSenseReportGenerator.downloadTextReport(this.currentAnalysis, this.currentRawInput);
                }
            };
        }
        if (btnPdf) {
            btnPdf.onclick = () => {
                if (this.currentAnalysis) {
                    SchemaSenseReportGenerator.openPrintablePDFReport(this.currentAnalysis, this.currentRawInput);
                }
            };
        }
        if (btnJson) {
            btnJson.onclick = () => {
                if (this.currentAnalysis) {
                    SchemaSenseReportGenerator.downloadJsonReport(this.currentAnalysis);
                }
            };
        }

        // Test Suite Run Button
        const runTestsBtn = document.getElementById('btn-run-tests');
        if (runTestsBtn) {
            runTestsBtn.onclick = () => this.runTestSuite();
        }
    }

    switchView(viewId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-view') === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        document.querySelectorAll('.page-view').forEach(view => {
            if (view.id === `view-${viewId}`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ==========================================================================
       SAMPLE LOADING
       ========================================================================== */
    loadSample(sampleId) {
        const sample = SAMPLE_SCHEMAS.find(s => s.id === sampleId) || SAMPLE_SCHEMAS[0];
        const sqlInput = document.getElementById('sql-input');
        const fdInput = document.getElementById('fd-input');
        const descBox = document.getElementById('sample-description-box');

        if (sqlInput) sqlInput.value = sample.sql.trim();
        if (fdInput) fdInput.value = (sample.functionalDependencies || '').trim();

        if (descBox) {
            descBox.innerHTML = `
                <div class="sample-info-banner">
                    <strong>${sample.title}</strong>: ${sample.description}
                    <div class="syllabus-tag">📚 ${sample.syllabusFocus}</div>
                </div>
            `;
        }

        // Populate Before/After Redesign pane
        this.updateRedesignPane(sample.suggestedRedesign);
    }

    updateRedesignPane(redesign) {
        const pane = document.getElementById('redesign-content');
        if (!pane) return;
        if (!redesign) {
            pane.innerHTML = `<div class="empty-msg">No suggested redesign available for current schema.</div>`;
            return;
        }

        pane.innerHTML = `
            <div class="redesign-box">
                <p class="redesign-desc">💡 <strong>Suggested Normalization Strategy:</strong> ${redesign.description}</p>
                <div class="redesign-comparison-grid">
                    <div class="redesign-col before-col">
                        <h5>❌ Original Schema (With Smells)</h5>
                        <pre><code>${redesign.before}</code></pre>
                    </div>
                    <div class="redesign-col after-col">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <h5 style="margin: 0;">✓ Normalized Design (3NF / BCNF)</h5>
                            <span class="badge badge-pass">Executable DDL</span>
                        </div>
                        <pre><code id="redesign-sql-display">${redesign.after}</code></pre>
                        <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-primary btn-sm" id="btn-load-redesign-direct">
                                🚀 Load Redesign into Analyzer & Run
                            </button>
                            <button class="btn btn-outline btn-sm" id="btn-copy-redesign-sql">
                                📋 Copy Clean SQL
                            </button>
                            <span id="copy-redesign-status" style="font-size: 12px; color: #10b981; display: none; align-items: center; font-weight: bold;">✓ Copied to clipboard!</span>
                        </div>
                    </div>
                </div>
                <p class="redesign-note"><em>Note: Redesign eliminates transitive and partial dependencies, adds required B+ tree foreign key indexes, and enforces candidate key constraints.</em></p>
            </div>
        `;

        // Bind Load Redesign button (automatically tests the redesign with zero effort!)
        const loadBtn = document.getElementById('btn-load-redesign-direct');
        if (loadBtn) {
            loadBtn.onclick = () => {
                const sqlInput = document.getElementById('sql-input');
                const fdInput = document.getElementById('fd-input');
                if (sqlInput) sqlInput.value = redesign.after;
                if (fdInput) fdInput.value = redesign.redesignFDs || '';

                // Switch to SQL tab
                const sqlTabBtn = document.querySelector('.input-tab-btn[data-pane="pane-sql"]');
                if (sqlTabBtn) sqlTabBtn.click();

                // Run analysis
                this.runAnalysis();

                // Scroll smoothly to results
                const resSec = document.getElementById('results-section');
                if (resSec) resSec.scrollIntoView({ behavior: 'smooth' });
            };
        }

        // Bind Copy button
        const copyBtn = document.getElementById('btn-copy-redesign-sql');
        const statusSpan = document.getElementById('copy-redesign-status');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(redesign.after).then(() => {
                    if (statusSpan) {
                        statusSpan.style.display = 'inline-flex';
                        setTimeout(() => { statusSpan.style.display = 'none'; }, 2500);
                    }
                }).catch(() => {
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = redesign.after;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (statusSpan) {
                        statusSpan.style.display = 'inline-flex';
                        setTimeout(() => { statusSpan.style.display = 'none'; }, 2500);
                    }
                });
            };
        }
    }

    /* ==========================================================================
       STUDENT & FACULTY DETAILS MANAGEMENT
       ========================================================================== */
    initStudentDetails() {
        const s1NameInput = document.getElementById('input-student1-name');
        const s1RegInput = document.getElementById('input-student1-reg');
        const s2NameInput = document.getElementById('input-student2-name');
        const s2RegInput = document.getElementById('input-student2-reg');
        const facNameInput = document.getElementById('input-faculty-name');
        const facTitleInput = document.getElementById('input-faculty-title');

        // Load saved values from localStorage
        const s1Name = localStorage.getItem('schemasense_student1_name') || '';
        const s1Reg = localStorage.getItem('schemasense_student1_reg') || '';
        const s2Name = localStorage.getItem('schemasense_student2_name') || '';
        const s2Reg = localStorage.getItem('schemasense_student2_reg') || '';
        const facName = localStorage.getItem('schemasense_faculty_name') || 'Dr. Swaminathan A';
        const facTitle = localStorage.getItem('schemasense_faculty_title') || 'Assistant Professor';

        if (s1NameInput) s1NameInput.value = s1Name;
        if (s1RegInput) s1RegInput.value = s1Reg;
        if (s2NameInput) s2NameInput.value = s2Name;
        if (s2RegInput) s2RegInput.value = s2Reg;
        if (facNameInput) facNameInput.value = facName;
        if (facTitleInput) facTitleInput.value = facTitle;

        this.updateTeamDisplay({ s1Name, s1Reg, s2Name, s2Reg, facName, facTitle });

        const saveBtn = document.getElementById('btn-save-student-details');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const newS1Name = s1NameInput ? s1NameInput.value.trim() : '';
                const newS1Reg = s1RegInput ? s1RegInput.value.trim() : '';
                const newS2Name = s2NameInput ? s2NameInput.value.trim() : '';
                const newS2Reg = s2RegInput ? s2RegInput.value.trim() : '';
                const newFacName = facNameInput ? facNameInput.value.trim() : 'Dr. Swaminathan A';
                const newFacTitle = facTitleInput ? facTitleInput.value.trim() : 'Assistant Professor';

                localStorage.setItem('schemasense_student1_name', newS1Name);
                localStorage.setItem('schemasense_student1_reg', newS1Reg);
                localStorage.setItem('schemasense_student2_name', newS2Name);
                localStorage.setItem('schemasense_student2_reg', newS2Reg);
                localStorage.setItem('schemasense_faculty_name', newFacName);
                localStorage.setItem('schemasense_faculty_title', newFacTitle);

                this.updateTeamDisplay({
                    s1Name: newS1Name,
                    s1Reg: newS1Reg,
                    s2Name: newS2Name,
                    s2Reg: newS2Reg,
                    facName: newFacName,
                    facTitle: newFacTitle
                });

                alert('✓ Student and Faculty details saved! These details are now visible on the cards and will appear in all downloaded reports.');
            };
        }
    }

    updateTeamDisplay({ s1Name, s1Reg, s2Name, s2Reg, facName, facTitle }) {
        const dS1Name = document.getElementById('display-student1-name');
        const dS1Reg = document.getElementById('display-student1-reg');
        const dS2Name = document.getElementById('display-student2-name');
        const dS2Reg = document.getElementById('display-student2-reg');
        const dFacName = document.getElementById('display-faculty-name');
        const dFacTitle = document.getElementById('display-faculty-title');
        const cardS2 = document.getElementById('card-student-2');

        if (dS1Name) dS1Name.textContent = s1Name || '[ENTER NAME]';
        if (dS1Reg) dS1Reg.textContent = s1Reg ? `Register No: ${s1Reg}` : 'Register No: [ENTER REGISTER NUMBER]';

        if (s2Name) {
            if (cardS2) cardS2.style.display = 'block';
            if (dS2Name) dS2Name.textContent = s2Name;
            if (dS2Reg) dS2Reg.textContent = s2Reg ? `Register No: ${s2Reg}` : '';
        } else {
            if (dS2Name) dS2Name.textContent = '[ENTER NAME]';
            if (dS2Reg) dS2Reg.textContent = 'Register No: [ENTER REGISTER NUMBER]';
        }

        if (dFacName) dFacName.textContent = facName || 'Dr. Swaminathan A';
        if (dFacTitle) dFacTitle.textContent = facTitle || 'Assistant Professor';
    }

    /* ==========================================================================
       ANALYSIS EXECUTION & PIPELINE STEPPER
       ========================================================================== */
    async runAnalysis() {
        const activeTab = document.querySelector('.input-tab-btn.active');
        const mode = activeTab ? activeTab.getAttribute('data-pane') : 'pane-sql';

        let sqlToAnalyze = '';
        if (mode === 'pane-visual') {
            sqlToAnalyze = this.generateSQLFromVisual();
            document.getElementById('sql-input').value = sqlToAnalyze;
        } else {
            sqlToAnalyze = document.getElementById('sql-input').value;
        }

        const fdText = document.getElementById('fd-input') ? document.getElementById('fd-input').value : '';

        // Capture advanced options
        const noSqlModel = document.getElementById('adv-nosql-model') ? document.getElementById('adv-nosql-model').value : 'none';
        const partitionKey = document.getElementById('adv-partition-key') ? document.getElementById('adv-partition-key').value : '';
        const replicationFactor = document.getElementById('adv-repl-factor') ? document.getElementById('adv-repl-factor').value : 1;
        const fragmentationType = document.getElementById('adv-fragmentation') ? document.getElementById('adv-fragmentation').value : 'none';
        const capC = document.getElementById('cap-c') ? document.getElementById('cap-c').checked : false;
        const capA = document.getElementById('cap-a') ? document.getElementById('cap-a').checked : false;
        const capP = document.getElementById('cap-p') ? document.getElementById('cap-p').checked : false;
        const searchColsText = document.getElementById('adv-search-cols') ? document.getElementById('adv-search-cols').value : '';

        const workloadSearchColumns = searchColsText.split(',').map(s => s.trim()).filter(Boolean);

        const context = {
            functionalDependenciesText: fdText,
            advancedOptions: {
                noSqlModel,
                partitionKey,
                replicationFactor,
                fragmentationType,
                capPriorities: { c: capC, a: capA, p: capP },
                workloadSearchColumns
            }
        };

        // Animate Pipeline Stepper
        await this.animatePipeline();

        this.currentRawInput = sqlToAnalyze;
        const result = this.analyzer.analyze(sqlToAnalyze, context);

        const errorBox = document.getElementById('analysis-error-box');
        const resultsSec = document.getElementById('results-section');

        if (!result.success) {
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML = `
                    <div class="alert alert-danger">
                        <h4>⚠️ Parsing Failed</h4>
                        <ul>
                            ${result.errors.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            if (resultsSec) resultsSec.style.display = 'none';
            return;
        }

        if (errorBox) errorBox.style.display = 'none';
        this.currentAnalysis = result;

        // Render all results
        this.renderResults(result);

        if (resultsSec) {
            resultsSec.style.display = 'block';
            resultsSec.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async animatePipeline() {
        const steps = document.querySelectorAll('.pipeline-step');
        if (!steps || steps.length === 0) return;

        steps.forEach(s => s.classList.remove('active', 'completed'));

        for (let i = 0; i < steps.length; i++) {
            steps[i].classList.add('active');
            await new Promise(r => setTimeout(r, 45));
            steps[i].classList.remove('active');
            steps[i].classList.add('completed');
        }
    }

    /* ==========================================================================
       RENDER RESULTS DASHBOARD & SMELL CARDS
       ========================================================================== */
    renderResults(result) {
        const { summary, smells, normalization, schema, demonstratedConcepts } = result;

        // 1. Health Badge & Summary
        const healthBadge = document.getElementById('res-health-badge');
        const healthDesc = document.getElementById('res-health-desc');
        if (healthBadge) {
            healthBadge.className = `health-badge health-${summary.healthStatus.toLowerCase().replace(/\s+/g, '-')}`;
            healthBadge.textContent = summary.healthStatus;
        }
        if (healthDesc) {
            healthDesc.textContent = summary.healthDescription;
        }

        // 2. Metrics Counters
        this._setText('metric-tables', summary.totalTables);
        this._setText('metric-columns', summary.totalColumns);
        this._setText('metric-pks', summary.totalPrimaryKeys);
        this._setText('metric-fks', summary.totalForeignKeys);
        this._setText('metric-indexes', summary.totalIndexes);
        this._setText('metric-highest-nf', summary.overallNormalForm);

        this._setText('count-critical', summary.criticalCount);
        this._setText('count-warning', summary.warningCount);
        this._setText('count-suggestion', summary.suggestionCount);

        // 3. Visual Charts
        SchemaSenseCharts.renderCategoryChart('chart-categories', summary.categoryCounts);
        SchemaSenseCharts.renderSeverityDonut('chart-severity', {
            critical: summary.criticalCount,
            warning: summary.warningCount,
            suggestion: summary.suggestionCount
        });
        SchemaSenseCharts.renderTableSmellChart('chart-tables', summary.tableSmellCounts);
        SchemaSenseCharts.renderNormalizationLadder('norm-ladder-container', normalization);

        // 4. ER Diagram
        const erRenderer = new ERDiagramRenderer('er-diagram-container');
        erRenderer.render(schema, smells);

        // 5. Smell Cards List
        this.renderSmellCards(smells);

        // 6. Demonstrated Syllabus Concepts
        const conceptsContainer = document.getElementById('concepts-list');
        if (conceptsContainer) {
            conceptsContainer.innerHTML = demonstratedConcepts.map(c => `
                <li class="concept-item">
                    <span class="icon-check">✓</span>
                    <span>${c}</span>
                </li>
            `).join('');
        }
    }

    renderSmellCards(smells) {
        const container = document.getElementById('smells-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (smells.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <span class="empty-state-icon">🌟</span>
                    <h4>No Database Smells Detected</h4>
                    <p>Your schema adheres to all core relational integrity and normalization guidelines.</p>
                </div>
            `;
            return;
        }

        smells.forEach(smell => {
            const card = document.createElement('div');
            card.className = `smell-card severity-${smell.severity.toLowerCase()} status-${smell.status.toLowerCase().replace(/\s+/g, '-')}`;
            card.setAttribute('data-severity', smell.severity);
            card.setAttribute('data-category', smell.category);
            card.setAttribute('data-status', smell.status);

            card.innerHTML = `
                <div class="smell-card-header">
                    <div class="smell-title-left">
                        <span class="smell-badge-num">#${smell.smellDef.number}</span>
                        <h4 class="smell-name">${smell.name}</h4>
                        <span class="badge badge-${smell.severity.toLowerCase()}">${smell.severity}</span>
                        <span class="badge badge-status-${smell.status.toLowerCase().replace(/\s+/g, '-')}">${smell.status}</span>
                    </div>
                    <div class="smell-title-right">
                        <span class="smell-affected-obj"><code>${smell.affectedObject}</code></span>
                        <button class="btn-toggle-card" title="Expand/Collapse">▼</button>
                    </div>
                </div>

                <div class="smell-card-body">
                    <div class="smell-info-grid">
                        <div class="smell-info-row">
                            <span class="info-label">Why Detected:</span>
                            <span class="info-val">${smell.whyDetected}</span>
                        </div>
                        <div class="smell-info-row">
                            <span class="info-label">Schema Example:</span>
                            <pre class="schema-snippet"><code>${smell.example}</code></pre>
                        </div>
                        <div class="smell-info-row">
                            <span class="info-label">Related Concept:</span>
                            <span class="info-val font-bold">${smell.concept}</span>
                        </div>
                        <div class="smell-info-row">
                            <span class="info-label">Suggested Improvement:</span>
                            <span class="info-val text-recommendation">${smell.recommendation}</span>
                        </div>
                        <div class="smell-info-row">
                            <span class="info-label">Syllabus Connection:</span>
                            <span class="badge badge-syllabus">${smell.syllabus}</span>
                        </div>
                    </div>
                </div>
            `;

            // Toggle Expand / Collapse
            const header = card.querySelector('.smell-card-header');
            header.onclick = () => card.classList.toggle('expanded');

            container.appendChild(card);
        });

        // Expand first 3 by default
        const cards = container.querySelectorAll('.smell-card');
        cards.forEach((c, idx) => {
            if (idx < 3) c.classList.add('expanded');
        });
    }

    filterSmellCards() {
        const severity = document.getElementById('filter-severity').value;
        const category = document.getElementById('filter-category').value;
        const status = document.getElementById('filter-status').value;

        document.querySelectorAll('.smell-card').forEach(card => {
            const cardSev = card.getAttribute('data-severity');
            const cardCat = card.getAttribute('data-category');
            const cardStat = card.getAttribute('data-status');

            const matchSev = severity === 'all' || cardSev === severity;
            const matchCat = category === 'all' || cardCat === category;
            const matchStat = status === 'all' || cardStat === status;

            if (matchSev && matchCat && matchStat) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /* ==========================================================================
       VISUAL SCHEMA BUILDER
       ========================================================================== */
    initVisualBuilder() {
        const addTableBtn = document.getElementById('btn-visual-add-table');
        if (addTableBtn) {
            addTableBtn.onclick = () => {
                const name = prompt('Enter Table Name:', `Table_${this.visualTables.length + 1}`);
                if (name && name.trim()) {
                    this.addVisualTable(name.trim());
                }
            };
        }

        // Add a starter table
        this.addVisualTable('Student');
        this.addVisualColumn('Student', { name: 'student_id', dataType: 'INT', isPK: true, isNullable: false });
        this.addVisualColumn('Student', { name: 'student_name', dataType: 'VARCHAR(100)', isPK: false, isNullable: false });
        this.addVisualColumn('Student', { name: 'department_id', dataType: 'INT', isPK: false, isNullable: true });
    }

    addVisualTable(tableName) {
        if (this.visualTables.some(t => t.name.toLowerCase() === tableName.toLowerCase())) {
            alert('Table already exists!');
            return;
        }
        this.visualTables.push({ name: tableName, columns: [] });
        this.renderVisualBuilder();
    }

    addVisualColumn(tableName, colData) {
        const table = this.visualTables.find(t => t.name === tableName);
        if (!table) return;
        table.columns.push(colData);
        this.renderVisualBuilder();
    }

    renderVisualBuilder() {
        const container = document.getElementById('visual-tables-list');
        if (!container) return;
        container.innerHTML = '';

        this.visualTables.forEach((table, tIdx) => {
            const tDiv = document.createElement('div');
            tDiv.className = 'visual-table-item';

            let colsHtml = '';
            table.columns.forEach((col, cIdx) => {
                colsHtml += `
                    <div class="visual-col-row">
                        <input type="text" class="form-input col-name-input" value="${col.name}" placeholder="Column Name" onchange="window.app.updateCol('${table.name}', ${cIdx}, 'name', this.value)">
                        <select class="form-select col-type-select" onchange="window.app.updateCol('${table.name}', ${cIdx}, 'dataType', this.value)">
                            <option value="INT" ${col.dataType === 'INT' ? 'selected' : ''}>INT</option>
                            <option value="VARCHAR(100)" ${col.dataType === 'VARCHAR(100)' ? 'selected' : ''}>VARCHAR(100)</option>
                            <option value="VARCHAR(255)" ${col.dataType === 'VARCHAR(255)' ? 'selected' : ''}>VARCHAR(255)</option>
                            <option value="TEXT" ${col.dataType === 'TEXT' ? 'selected' : ''}>TEXT</option>
                            <option value="DATE" ${col.dataType === 'DATE' ? 'selected' : ''}>DATE</option>
                            <option value="DECIMAL(10,2)" ${col.dataType === 'DECIMAL(10,2)' ? 'selected' : ''}>DECIMAL(10,2)</option>
                            <option value="BOOLEAN" ${col.dataType === 'BOOLEAN' ? 'selected' : ''}>BOOLEAN</option>
                        </select>
                        <label class="checkbox-label"><input type="checkbox" ${col.isPK ? 'checked' : ''} onchange="window.app.updateCol('${table.name}', ${cIdx}, 'isPK', this.checked)"> PK</label>
                        <label class="checkbox-label"><input type="checkbox" ${col.isUnique ? 'checked' : ''} onchange="window.app.updateCol('${table.name}', ${cIdx}, 'isUnique', this.checked)"> UQ</label>
                        <label class="checkbox-label"><input type="checkbox" ${!col.isNullable ? 'checked' : ''} onchange="window.app.updateCol('${table.name}', ${cIdx}, 'isNullable', !this.checked)"> NN</label>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteCol('${table.name}', ${cIdx})">×</button>
                    </div>
                `;
            });

            tDiv.innerHTML = `
                <div class="visual-table-header">
                    <h4>📋 ${table.name}</h4>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="window.app.promptAddCol('${table.name}')">+ Add Column</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteTable(${tIdx})">Delete Table</button>
                    </div>
                </div>
                <div class="visual-cols-container">
                    ${colsHtml || '<p class="text-muted" style="padding: 8px;">No columns yet. Click "+ Add Column".</p>'}
                </div>
            `;
            container.appendChild(tDiv);
        });
    }

    promptAddCol(tableName) {
        const colName = prompt('Enter Column Name:');
        if (colName && colName.trim()) {
            this.addVisualColumn(tableName, { name: colName.trim(), dataType: 'VARCHAR(100)', isPK: false, isNullable: true, isUnique: false });
        }
    }

    updateCol(tableName, cIdx, field, value) {
        const table = this.visualTables.find(t => t.name === tableName);
        if (table && table.columns[cIdx]) {
            table.columns[cIdx][field] = value;
            if (field === 'isPK' && value === true) {
                table.columns[cIdx].isNullable = false;
                table.columns[cIdx].isUnique = true;
            }
        }
    }

    deleteCol(tableName, cIdx) {
        const table = this.visualTables.find(t => t.name === tableName);
        if (table) {
            table.columns.splice(cIdx, 1);
            this.renderVisualBuilder();
        }
    }

    deleteTable(tIdx) {
        this.visualTables.splice(tIdx, 1);
        this.renderVisualBuilder();
    }

    generateSQLFromVisual() {
        let sql = '';
        this.visualTables.forEach(t => {
            sql += `CREATE TABLE ${t.name} (\n`;
            const lines = [];
            const pks = [];

            t.columns.forEach(col => {
                let line = `  ${col.name} ${col.dataType}`;
                if (col.isPK) pks.push(col.name);
                if (!col.isNullable && !col.isPK) line += ' NOT NULL';
                if (col.isUnique && !col.isPK) line += ' UNIQUE';
                lines.push(line);
            });

            if (pks.length > 0) {
                lines.push(`  PRIMARY KEY (${pks.join(', ')})`);
            }

            sql += lines.join(',\n') + '\n);\n\n';
        });
        return sql;
    }

    /* ==========================================================================
       AUTOMATED TEST RUNNER
       ========================================================================== */
    async runTestSuite() {
        const resultsBox = document.getElementById('test-suite-results');
        const summaryBadge = document.getElementById('test-suite-summary-badge');
        const runBtn = document.getElementById('btn-run-tests');

        if (runBtn) runBtn.disabled = true;
        if (resultsBox) resultsBox.innerHTML = '<div class="running-tests-spinner">⏳ Running 12 verification test suites...</div>';

        const suite = new SchemaSenseTestSuite();
        const results = await suite.runAllTests();

        if (runBtn) runBtn.disabled = false;

        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;

        if (summaryBadge) {
            summaryBadge.className = `badge ${passedCount === totalCount ? 'badge-pass' : 'badge-fail'}`;
            summaryBadge.textContent = `${passedCount} / ${totalCount} Passed`;
        }

        if (resultsBox) {
            resultsBox.innerHTML = results.map(r => `
                <div class="test-result-row ${r.passed ? 'test-pass' : 'test-fail'}">
                    <div class="test-row-header">
                        <span class="test-badge">${r.passed ? '✓ PASS' : '✗ FAIL'}</span>
                        <span class="test-num">Test ${r.id}:</span>
                        <span class="test-name"><strong>${r.name}</strong></span>
                        <span class="test-duration">${r.durationMs}ms</span>
                    </div>
                    <div class="test-details">${r.details}</div>
                </div>
            `).join('');
        }
    }

    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SchemaSenseApp();
});
