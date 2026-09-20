"""
Debug script to inspect exact smells detected on Sample 1 Redesign.
"""

import subprocess

cmd = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "--headless",
    "--disable-gpu",
    "--virtual-time-budget=4000",
    "--dump-dom",
    "http://127.0.0.1:5050/test-runner"
]

# Let's create an html file that analyzes Sample 1 Redesign and prints all smells
html = """<!DOCTYPE html>
<html>
<head>
    <script src="/static/js/schema/schemaModel.js"></script>
    <script src="/static/js/parser/sqlParser.js"></script>
    <script src="/static/js/normalization/dependencyEngine.js"></script>
    <script src="/static/js/smells/smellRegistry.js"></script>
    <script src="/static/js/smells/relationalSmells.js"></script>
    <script src="/static/js/smells/normalizationSmells.js"></script>
    <script src="/static/js/smells/consequenceSmells.js"></script>
    <script src="/static/js/smells/indexingSmells.js"></script>
    <script src="/static/js/smells/distributedSmells.js"></script>
    <script src="/static/js/analyzer/schemaAnalyzer.js"></script>
    <script src="/static/js/samples/sampleData.js"></script>
</head>
<body>
    <div id="debug"></div>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            const sample1 = SAMPLE_SCHEMAS.find(s => s.id === 'student-mgmt');
            const analyzer = new SchemaAnalyzer();
            const res = analyzer.analyze(sample1.suggestedRedesign.after, { functionalDependenciesText: sample1.suggestedRedesign.redesignFDs });
            
            let out = 'DETECTED SMELLS ON SAMPLE 1 REDESIGN:\\n';
            res.smells.filter(s => s.status === 'Detected').forEach(s => {
                out += `[${s.severity}] ${s.id} - ${s.name} | Affected: ${s.affectedObject} | Why: ${s.whyDetected}\\n`;
            });
            out += '\\nTABLE SMELL COUNTS:\\n';
            for (const [t, c] of Object.entries(res.summary.tableSmellCounts)) {
                out += `${t}: ${c} smells\\n`;
            }
            document.getElementById('debug').innerText = out;
            console.log(out);
        });
    </script>
</body>
</html>
"""

with open("templates/debug_redesign.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Created templates/debug_redesign.html")
