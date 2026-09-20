"""
SchemaSense – Database Schema Smell Detector
Flask Web Server & API Backend
B.Tech Course: Database Systems
"""

import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def index():
    """Render the single-page application."""
    return render_template('index.html')

@app.route('/test-runner')
def test_runner():
    """Render the automated in-browser test runner page."""
    return render_template('test_runner.html')

@app.route('/debug-redesign')
def debug_redesign():
    """Render the redesign debugging page."""
    return render_template('debug_redesign.html')

@app.route('/api/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'application': 'SchemaSense – Database Schema Smell Detector',
        'version': '1.0.0',
        'course': 'B.Tech Database Systems',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/samples')
def get_sample_schemas():
    """Return available sample schemas."""
    sample_path = os.path.join(app.static_folder, 'js', 'samples', 'sampleData.js')
    if os.path.exists(sample_path):
        with open(sample_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Return metadata summary
            return jsonify({
                'status': 'success',
                'samples': [
                    {'id': 'student-mgmt', 'title': 'Sample 1: Student Management System'},
                    {'id': 'hospital-mgmt', 'title': 'Sample 2: Hospital Management System'},
                    {'id': 'ecommerce-system', 'title': 'Sample 3: E-Commerce System'},
                    {'id': 'library-mgmt', 'title': 'Sample 4: Library Management System'},
                    {'id': 'perfect-schema', 'title': 'Benchmark: Perfectly Designed Academic Schema'}
                ]
            })
    return jsonify({'status': 'error', 'message': 'Samples file not found'}), 404

@app.route('/api/test-cases')
def get_test_cases():
    """Return the list of 12 required test cases for academic verification."""
    test_cases = [
        {'id': 1, 'name': 'Perfect Relational Schema', 'requirement': 'Verify clean 3NF/BCNF with 0 critical smells'},
        {'id': 2, 'name': 'Schema Without Primary Keys', 'requirement': 'Verify detection of Missing PK (REL-001)'},
        {'id': 3, 'name': 'Schema With Inferred Missing Foreign Keys', 'requirement': 'Verify detection of Missing FK (REL-002)'},
        {'id': 4, 'name': 'Schema With Multivalued / Non-Atomic Attributes', 'requirement': 'Verify detection of 1NF atomicity violation (REL-008)'},
        {'id': 5, 'name': 'Schema With Repeating Groups', 'requirement': 'Verify detection of repeating groups like phone1, phone2 (REL-009)'},
        {'id': 6, 'name': 'Schema With 2NF Violation', 'requirement': 'Verify partial functional dependencies flag (NORM-015)'},
        {'id': 7, 'name': 'Schema With 3NF Violation', 'requirement': 'Verify transitive dependencies flag (NORM-016)'},
        {'id': 8, 'name': 'Schema With Indexing Problems', 'requirement': 'Verify missing index on foreign key column (IDX-023)'},
        {'id': 9, 'name': 'Schema With Duplicate Indexes', 'requirement': 'Verify detection of redundant/duplicate index (IDX-024)'},
        {'id': 10, 'name': 'Invalid SQL Input', 'requirement': 'Verify graceful line-tracked syntax error handling'},
        {'id': 11, 'name': 'Empty Input', 'requirement': 'Verify empty input validation rejection'},
        {'id': 12, 'name': 'Partially Specified Dependency Info', 'requirement': 'Verify engine flags NEEDS DEPENDENCY INFO'}
    ]
    return jsonify({'status': 'success', 'test_cases': test_cases})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"================================================================")
    print(f"  SchemaSense – Database Schema Smell Detector")
    print(f"  Running on: http://127.0.0.1:{port}")
    print(f"  B.Tech Database Systems | Guide: Dr. Swaminathan A")
    print(f"================================================================")
    app.run(host='127.0.0.1', port=port, debug=True)
