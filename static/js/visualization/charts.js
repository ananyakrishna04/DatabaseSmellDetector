/**
 * SchemaSense - Clean Academic Charting & Visualization Module
 * Implements lightweight SVG/Canvas charts for Category distributions, Severity donuts,
 * Table-wise smell counts, and the Normalization Progression Ladder.
 * Fully adapts to Day and Night themes.
 */

class SchemaSenseCharts {
    /**
     * Render the Category Bar Chart
     * @param {string} containerId 
     * @param {object} categoryCounts 
     */
    static renderCategoryChart(containerId, categoryCounts = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const categories = Object.keys(categoryCounts);
        const values = Object.values(categoryCounts);
        const maxVal = Math.max(...values, 1);

        const svgWidth = 460;
        const barHeight = 28;
        const gap = 16;
        const svgHeight = categories.length * (barHeight + gap) + 40;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

        categories.forEach((cat, idx) => {
            const count = categoryCounts[cat] || 0;
            const y = 20 + idx * (barHeight + gap);
            const barMaxWidth = 220;
            const barWidth = Math.max(6, (count / maxVal) * barMaxWidth);

            // Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '10');
            text.setAttribute('y', y + 18);
            text.setAttribute('font-size', '11');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', 'var(--text-primary, #1e293b)');
            // Abbreviate category for space
            text.textContent = cat.length > 20 ? cat.substring(0, 18) + '..' : cat;
            svg.appendChild(text);

            // Bar Background
            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('x', '150');
            bgRect.setAttribute('y', y);
            bgRect.setAttribute('width', barMaxWidth);
            bgRect.setAttribute('height', barHeight);
            bgRect.setAttribute('rx', '4');
            bgRect.setAttribute('fill', 'var(--chart-bg, #f1f5f9)');
            svg.appendChild(bgRect);

            // Active Bar
            const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bar.setAttribute('x', '150');
            bar.setAttribute('y', y);
            bar.setAttribute('width', barWidth);
            bar.setAttribute('height', barHeight);
            bar.setAttribute('rx', '4');
            bar.setAttribute('fill', colors[idx % colors.length]);
            svg.appendChild(bar);

            // Value Text
            const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            valText.setAttribute('x', 160 + barWidth + 10);
            valText.setAttribute('y', y + 18);
            valText.setAttribute('font-size', '12');
            valText.setAttribute('font-weight', '700');
            valText.setAttribute('fill', 'var(--text-secondary, #475569)');
            valText.textContent = count;
            svg.appendChild(valText);
        });

        container.appendChild(svg);
    }

    /**
     * Render the Severity Donut Chart
     * @param {string} containerId 
     * @param {{ critical: number, warning: number, suggestion: number }} counts 
     */
    static renderSeverityDonut(containerId, { critical = 0, warning = 0, suggestion = 0 }) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const total = critical + warning + suggestion;
        if (total === 0) {
            container.innerHTML = `<div class="chart-empty-state"><span class="badge badge-success">✓</span> 0 Smells Detected</div>`;
            return;
        }

        const size = 200;
        const radius = 65;
        const strokeWidth = 26;
        const cx = size / 2;
        const cy = size / 2;
        const circumference = 2 * Math.PI * radius;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '200');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

        const segments = [
            { count: critical, color: '#ef4444', label: 'High (Critical)' },
            { count: warning, color: '#f59e0b', label: 'Medium (Warning)' },
            { count: suggestion, color: '#3b82f6', label: 'Low (Suggestion)' }
        ];

        let accumulatedAngle = 0;

        segments.forEach(seg => {
            if (seg.count === 0) return;
            const ratio = seg.count / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle * circumference;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', seg.color);
            circle.setAttribute('stroke-width', strokeWidth);
            circle.setAttribute('stroke-dasharray', strokeDasharray);
            circle.setAttribute('stroke-dashoffset', strokeDashoffset);
            circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
            svg.appendChild(circle);

            accumulatedAngle += ratio;
        });

        // Center Total Text
        const centerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        centerGroup.setAttribute('text-anchor', 'middle');

        const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        numText.setAttribute('x', cx);
        numText.setAttribute('y', cy + 5);
        numText.setAttribute('font-size', '24');
        numText.setAttribute('font-weight', 'bold');
        numText.setAttribute('fill', 'var(--text-primary, #0f172a)');
        numText.textContent = total;
        centerGroup.appendChild(numText);

        const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subText.setAttribute('x', cx);
        subText.setAttribute('y', cy + 22);
        subText.setAttribute('font-size', '10');
        subText.setAttribute('fill', 'var(--text-muted, #64748b)');
        subText.textContent = 'ISSUES';
        centerGroup.appendChild(subText);

        svg.appendChild(centerGroup);
        container.appendChild(svg);
    }

    /**
     * Render the Table-wise Smell Count Bar Chart
     * @param {string} containerId 
     * @param {object} tableCounts 
     */
    static renderTableSmellChart(containerId, tableCounts = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const tables = Object.keys(tableCounts);
        if (tables.length === 0) {
            container.innerHTML = `<div class="chart-empty-state">No tables analyzed</div>`;
            return;
        }

        const values = Object.values(tableCounts);
        const maxVal = Math.max(...values, 1);

        const svgWidth = 460;
        const barHeight = 26;
        const gap = 14;
        const svgHeight = tables.length * (barHeight + gap) + 40;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

        tables.forEach((tName, idx) => {
            const count = tableCounts[tName] || 0;
            const y = 20 + idx * (barHeight + gap);
            const barMaxWidth = 220;
            const barWidth = Math.max(6, (count / maxVal) * barMaxWidth);
            const barColor = count > 2 ? '#ef4444' : (count > 0 ? '#f59e0b' : '#10b981');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '10');
            text.setAttribute('y', y + 17);
            text.setAttribute('font-size', '11');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', 'var(--text-primary, #1e293b)');
            text.textContent = tName;
            svg.appendChild(text);

            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('x', '140');
            bgRect.setAttribute('y', y);
            bgRect.setAttribute('width', barMaxWidth);
            bgRect.setAttribute('height', barHeight);
            bgRect.setAttribute('rx', '4');
            bgRect.setAttribute('fill', 'var(--chart-bg, #f1f5f9)');
            svg.appendChild(bgRect);

            const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bar.setAttribute('x', '140');
            bar.setAttribute('y', y);
            bar.setAttribute('width', barWidth);
            bar.setAttribute('height', barHeight);
            bar.setAttribute('rx', '4');
            bar.setAttribute('fill', barColor);
            svg.appendChild(bar);

            const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            valText.setAttribute('x', 150 + barWidth + 8);
            valText.setAttribute('y', y + 17);
            valText.setAttribute('font-size', '12');
            valText.setAttribute('font-weight', '700');
            valText.setAttribute('fill', 'var(--text-secondary, #475569)');
            valText.textContent = `${count} smells`;
            svg.appendChild(valText);
        });

        container.appendChild(svg);
    }

    /**
     * Render the Normalization Progression Stepper UI
     * @param {string} containerId 
     * @param {object} normalizationReport 
     */
    static renderNormalizationLadder(containerId, normalizationReport = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const tableNames = Object.keys(normalizationReport);
        if (tableNames.length === 0) {
            container.innerHTML = `<div class="chart-empty-state">No normalization data available</div>`;
            return;
        }

        const stages = ['1NF', '2NF', '3NF', 'BCNF', '4NF', '5NF'];
        const stageKeys = ['oneNF', 'twoNF', 'threeNF', 'bcnf', 'fourNF', 'fiveNF'];

        tableNames.forEach(tName => {
            const norm = normalizationReport[tName];
            const card = document.createElement('div');
            card.className = 'norm-table-card';

            let stepsHtml = '';
            stages.forEach((stage, sIdx) => {
                const stepKey = stageKeys[sIdx];
                const step = norm.steps[stepKey];
                let badgeClass = 'badge-pass';
                let icon = '✓ PASS';

                if (step.status === 'FAIL') {
                    badgeClass = 'badge-fail';
                    icon = '✗ FAIL';
                } else if (step.status.includes('NEEDS')) {
                    badgeClass = 'badge-needs-info';
                    icon = '? INFO NEEDED';
                }

                stepsHtml += `
                    <div class="norm-step-item">
                        <div class="norm-step-header">
                            <span class="norm-step-name">${stage}</span>
                            <span class="badge ${badgeClass}">${icon}</span>
                        </div>
                        <div class="norm-step-details">
                            ${step.reasons.map(r => `<p class="norm-reason">• ${r}</p>`).join('')}
                        </div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="norm-card-header">
                    <h4 class="norm-table-title"><span class="icon-table">▦</span> Table: <code>${tName}</code></h4>
                    <span class="badge badge-highest-nf">Highest: <strong>${norm.highestNF}</strong></span>
                </div>
                <div class="norm-steps-grid">
                    ${stepsHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SchemaSenseCharts };
}
