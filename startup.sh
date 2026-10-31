#!/bin/sh
set -e
cd /workspace
if ! curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8000/api/health; then
  /workspace/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 > /tmp/api-server.log 2>&1 &
fi
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/dev-server.log 2>&1 &
exit 0
