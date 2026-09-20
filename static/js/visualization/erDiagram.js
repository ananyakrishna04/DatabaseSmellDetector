/**
 * SchemaSense - Interactive SVG ER Diagram Visualizer
 * Renders relational tables, columns, PK/FK badges, and foreign key relationship connectors.
 * Highlights problematic tables and columns based on detected smells.
 */

class ERDiagramRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scale = 1.0;
        this.panX = 20;
        this.panY = 20;
    }

    /**
     * Render the Schema and highlight tables/columns with smells
     * @param {Schema} schema 
     * @param {SmellResult[]} smells 
     */
    render(schema, smells = []) {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (!schema || schema.tables.length === 0) {
            this.container.innerHTML = `<div class="er-empty-msg"><i class="icon-info"></i> No schema tables to visualize.</div>`;
            return;
        }

        // Map smells to tables and columns
        const problematicTables = new Set();
        const problematicColumns = new Set();

        smells.filter(s => s.status === 'Detected').forEach(s => {
            schema.tables.forEach(t => {
                if (s.affectedObject.includes(`Table: ${t.name}`)) {
                    problematicTables.add(t.name);
                }
                t.columns.forEach(c => {
                    if (s.affectedObject.includes(`${t.name}.${c.name}`)) {
                        problematicTables.add(t.name);
                        problematicColumns.add(`${t.name}.${c.name}`);
                    }
                });
            });
        });

        // Compute layout coordinates for tables
        const tableWidth = 240;
        const colHeight = 24;
        const headerHeight = 40;
        const padding = 50;
        const columnsPerRow = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(schema.tables.length))));

        const tablePositions = {};
        let maxWidth = 800;
        let maxHeight = 600;

        schema.tables.forEach((table, index) => {
            const row = Math.floor(index / columnsPerRow);
            const col = index % columnsPerRow;

            const x = 50 + col * (tableWidth + padding + 60);
            const height = headerHeight + (table.columns.length * colHeight) + 16;
            const y = 50 + row * (height + padding + 40);

            tablePositions[table.name] = { x, y, width: tableWidth, height, table };
            maxWidth = Math.max(maxWidth, x + tableWidth + 100);
            maxHeight = Math.max(maxHeight, y + height + 100);
        });

        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '550');
        svg.setAttribute('viewBox', `0 0 ${maxWidth} ${maxHeight}`);
        svg.classList.add('er-svg-canvas');

        // Define SVG markers for relationship arrows
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-primary, #2563eb)" />
            </marker>
            <marker id="crowsfoot" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 M 0 5 L 10 5" stroke="var(--color-primary, #2563eb)" stroke-width="1.5" fill="none" />
            </marker>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ef4444" flood-opacity="0.6"/>
            </filter>
        `;
        svg.appendChild(defs);

        // Group for panning/zooming
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'er-viewport');
        svg.appendChild(g);

        // 1. Draw Relationship Lines (Foreign Keys)
        schema.tables.forEach(table => {
            const srcPos = tablePositions[table.name];
            if (!srcPos) return;

            table.foreignKeys.forEach(fk => {
                const targetPos = tablePositions[fk.toTable];
                if (!targetPos) return; // Non-existent target table (already flagged as smell!)

                // Calculate connection endpoints
                const startX = srcPos.x + srcPos.width;
                const startY = srcPos.y + (srcPos.height / 2);
                const endX = targetPos.x;
                const endY = targetPos.y + (targetPos.height / 2);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const dx = Math.abs(endX - startX) * 0.5;
                const d = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                path.setAttribute('d', d);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', 'var(--accent-blue, #3b82f6)');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-dasharray', '4,2');
                path.setAttribute('marker-end', 'url(#arrow)');
                path.classList.add('er-fk-line');

                // Tooltip title
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                title.textContent = `FK: ${table.name}(${fk.fromColumns.join(', ')}) -> ${fk.toTable}(${fk.toColumns.join(', ')})`;
                path.appendChild(title);

                g.appendChild(path);
            });
        });

        // 2. Draw Table Entities
        schema.tables.forEach(table => {
            const pos = tablePositions[table.name];
            const hasSmell = problematicTables.has(table.name);

            const tableGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            tableGroup.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            tableGroup.classList.add('er-table-card');

            // Table Container Box
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', pos.width);
            rect.setAttribute('height', pos.height);
            rect.setAttribute('rx', '8');
            rect.setAttribute('fill', 'var(--bg-card, #ffffff)');
            rect.setAttribute('stroke', hasSmell ? '#ef4444' : 'var(--border-color, #e2e8f0)');
            rect.setAttribute('stroke-width', hasSmell ? '2.5' : '1.5');
            if (hasSmell) rect.setAttribute('filter', 'url(#glow-red)');
            tableGroup.appendChild(rect);

            // Table Header Bar
            const header = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            header.setAttribute('width', pos.width);
            header.setAttribute('height', headerHeight);
            header.setAttribute('rx', '8');
            header.setAttribute('fill', hasSmell ? 'var(--badge-danger-bg, #fee2e2)' : 'var(--table-header-bg, #f1f5f9)');
            tableGroup.appendChild(header);

            // Table Name Text
            const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleText.setAttribute('x', '14');
            titleText.setAttribute('y', '25');
            titleText.setAttribute('font-weight', '700');
            titleText.setAttribute('font-size', '14');
            titleText.setAttribute('fill', hasSmell ? '#b91c1c' : 'var(--text-primary, #0f172a)');
            titleText.textContent = table.name;
            tableGroup.appendChild(titleText);

            // Smell Alert Badge in Header if problematic
            if (hasSmell) {
                const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                badge.setAttribute('x', pos.width - 24);
                badge.setAttribute('y', '25');
                badge.setAttribute('font-size', '14');
                badge.textContent = '⚠️';
                tableGroup.appendChild(badge);
            }

            // Columns List
            table.columns.forEach((col, cIdx) => {
                const colY = headerHeight + 18 + (cIdx * colHeight);
                const isColProblem = problematicColumns.has(`${table.name}.${col.name}`);

                // Key Indicator Badge (PK, FK, or empty)
                const keyBadge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                keyBadge.setAttribute('x', '12');
                keyBadge.setAttribute('y', colY);
                keyBadge.setAttribute('font-size', '10');
                keyBadge.setAttribute('font-weight', 'bold');

                if (col.isPrimaryKey) {
                    keyBadge.setAttribute('fill', '#d97706'); // Amber/Gold for PK
                    keyBadge.textContent = 'PK';
                } else if (col.isForeignKey) {
                    keyBadge.setAttribute('fill', '#2563eb'); // Blue for FK
                    keyBadge.textContent = 'FK';
                } else {
                    keyBadge.setAttribute('fill', 'var(--text-muted, #94a3b8)');
                    keyBadge.textContent = '•';
                }
                tableGroup.appendChild(keyBadge);

                // Column Name Text
                const colText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                colText.setAttribute('x', '36');
                colText.setAttribute('y', colY);
                colText.setAttribute('font-size', '12');
                colText.setAttribute('font-weight', col.isPrimaryKey ? '600' : '400');
                colText.setAttribute('fill', isColProblem ? '#ef4444' : 'var(--text-primary, #1e293b)');
                colText.textContent = col.name;
                if (isColProblem) {
                    colText.textContent += ' ⚠️';
                }
                tableGroup.appendChild(colText);

                // Column Data Type Text
                const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                typeText.setAttribute('x', pos.width - 12);
                typeText.setAttribute('y', colY);
                typeText.setAttribute('font-size', '10');
                typeText.setAttribute('text-anchor', 'end');
                typeText.setAttribute('fill', 'var(--text-muted, #64748b)');
                typeText.textContent = col.dataType.length > 14 ? col.dataType.substring(0, 12) + '..' : col.dataType;
                tableGroup.appendChild(typeText);
            });

            g.appendChild(tableGroup);
        });

        // Controls Bar (Zoom In, Zoom Out, Reset)
        const controls = document.createElement('div');
        controls.className = 'er-controls';
        controls.innerHTML = `
            <button class="btn btn-sm btn-outline" id="btn-er-zoom-in" title="Zoom In">🔍+</button>
            <button class="btn btn-sm btn-outline" id="btn-er-zoom-out" title="Zoom Out">🔍-</button>
            <button class="btn btn-sm btn-outline" id="btn-er-reset" title="Reset View">↺ Reset</button>
            <span class="er-legend">
                <span class="badge badge-pk">PK</span> Primary Key
                <span class="badge badge-fk">FK</span> Foreign Key
                <span class="badge badge-smell">⚠️</span> Smell Detected
            </span>
        `;
        this.container.appendChild(controls);
        this.container.appendChild(svg);

        // Bind zoom events
        let zoom = 1.0;
        const zoomInBtn = document.getElementById('btn-er-zoom-in');
        const zoomOutBtn = document.getElementById('btn-er-zoom-out');
        const resetBtn = document.getElementById('btn-er-reset');

        if (zoomInBtn) {
            zoomInBtn.onclick = () => {
                zoom = Math.min(2.0, zoom + 0.15);
                g.setAttribute('transform', `scale(${zoom})`);
            };
        }
        if (zoomOutBtn) {
            zoomOutBtn.onclick = () => {
                zoom = Math.max(0.4, zoom - 0.15);
                g.setAttribute('transform', `scale(${zoom})`);
            };
        }
        if (resetBtn) {
            resetBtn.onclick = () => {
                zoom = 1.0;
                g.setAttribute('transform', 'scale(1)');
            };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ERDiagramRenderer };
}
