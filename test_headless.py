"""
Headless browser verification script using Edge.
Loads the page, executes the test suite, and checks the DOM output.
"""

import subprocess
import time
import urllib.request
import threading
from app import app

def run_server():
    app.run(host='127.0.0.1', port=5050, debug=False)

# Start Flask in background thread
server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

# Wait for server to start
time.sleep(1.5)

# Verify HTTP response
try:
    resp = urllib.request.urlopen('http://127.0.0.1:5050/')
    html = resp.read().decode('utf-8')
    print(f"HTTP GET / returned {resp.status}, HTML length: {len(html)}")
except Exception as e:
    print(f"Error fetching from server: {e}")
    exit(1)

# Check edge path
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--virtual-time-budget=5000",
    "--dump-dom",
    "http://127.0.0.1:5050/test-runner"
]

try:
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=15)
    print("Headless Edge executed test runner.")
    dom_output = proc.stdout
    for line in dom_output.split('\n'):
        if "TEST" in line or "PASS" in line or "FAIL" in line or "SUMMARY" in line:
            print(line.strip())
except Exception as e:
    print(f"Browser execution exception: {e}")
