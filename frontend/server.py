#!/usr/bin/env python3
"""
Simple HTTP server to serve the ReadShift authentication frontend demo.
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Change to the frontend directory
frontend_dir = Path(__file__).parent
os.chdir(frontend_dir)

PORT = 3000

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with CORS support."""
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def start_server():
    """Start the HTTP server."""
    try:
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            print(f"🚀 ReadShift Frontend Demo Server")
            print(f"📍 Serving at: http://localhost:{PORT}")
            print(f"📁 Directory: {frontend_dir}")
            print(f"🔗 Backend API: http://localhost:8000")
            print(f"\n✨ Opening browser automatically...")
            print(f"💡 Press Ctrl+C to stop the server")
            
            # Open browser automatically
            webbrowser.open(f'http://localhost:{PORT}')
            
            # Start serving
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use!")
            print(f"💡 Try: lsof -ti:{PORT} | xargs kill")
        else:
            print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    start_server()
