"""
Verification Script for SchemaSense
Tests Flask server startup, endpoint responses, and static asset integrity.
"""

import os
import sys
import unittest
from app import app

class SchemaSenseAppTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_home_page_renders(self):
        """Verify the main index page renders with HTTP 200 and expected elements."""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        content = response.data.decode('utf-8')
        self.assertIn('SchemaSense', content)
        self.assertIn('Detect. Understand.', content)
        self.assertIn('Dr. Swaminathan A', content)
        self.assertIn('B.Tech Database Systems', content)

    def test_health_endpoint(self):
        """Verify the health check endpoint returns 200 and healthy status."""
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'healthy')
        self.assertIn('SchemaSense', data['application'])

    def test_samples_endpoint(self):
        """Verify sample schemas endpoint returns 200 and sample list."""
        response = self.app.get('/api/samples')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertGreaterEqual(len(data['samples']), 4)

    def test_test_cases_endpoint(self):
        """Verify test cases endpoint returns all 12 test definitions."""
        response = self.app.get('/api/test-cases')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['test_cases']), 12)

    def test_static_assets_exist(self):
        """Verify all static JavaScript and CSS files are present on disk."""
        base_static = os.path.join(os.path.dirname(__file__), 'static')
        required_files = [
            'css/style.css',
            'js/schema/schemaModel.js',
            'js/parser/sqlParser.js',
            'js/normalization/dependencyEngine.js',
            'js/smells/smellRegistry.js',
            'js/smells/relationalSmells.js',
            'js/smells/normalizationSmells.js',
            'js/smells/consequenceSmells.js',
            'js/smells/indexingSmells.js',
            'js/smells/distributedSmells.js',
            'js/analyzer/schemaAnalyzer.js',
            'js/visualization/erDiagram.js',
            'js/visualization/charts.js',
            'js/reports/reportGenerator.js',
            'js/samples/sampleData.js',
            'js/tests/testSuite.js',
            'js/app.js'
        ]
        for rel_path in required_files:
            full_path = os.path.join(base_static, rel_path)
            self.assertTrue(os.path.exists(full_path), f"File missing: {rel_path}")

if __name__ == '__main__':
    unittest.main()
