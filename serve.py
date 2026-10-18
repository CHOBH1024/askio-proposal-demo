# 시연 사이트를 http://localhost:5090 으로 엽니다
import http.server, os, socketserver, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 5090
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
http.server.ThreadingHTTPServer.allow_reuse_address = True
with http.server.ThreadingHTTPServer(('127.0.0.1', port), H) as s:
    print('serving', os.getcwd(), 'on', port, flush=True)
    s.serve_forever()
