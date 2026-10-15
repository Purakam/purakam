#!/bin/bash

# Port declarations
BACKEND_PORT=8000
FRONTEND_PORT=5000

echo "=== Starting Purakam Application ==="

# Make sure virtual env is activated
source .venv/bin/activate

# Function to kill all subprocesses on exit
cleanup() {
    echo "=== Shutting down servers ==="
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start backend (FastAPI)
echo "Launching FastAPI Backend on port $BACKEND_PORT..."
python -m uvicorn backend.main:app --host 127.0.0.1 --port $BACKEND_PORT --reload &

# Wait briefly for backend to initialize
sleep 2

# Start frontend (Flask)
echo "Launching Flask Frontend on port $FRONTEND_PORT..."
python frontend/app.py &

# Wait for background jobs to finish
wait
