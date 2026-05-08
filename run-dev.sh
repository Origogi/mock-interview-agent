#!/bin/bash
echo "Starting Backend and Frontend in the background..."

# Start backend
cd backend
if [ -f "uv.lock" ]; then
    nohup uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
else
    nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
fi
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

echo "Waiting for services to start..."
sleep 3
echo "---- Backend Log ----"
cat backend/backend.log | grep -i "Uvicorn running on"
echo "---- Frontend Log ----"
cat frontend/frontend.log | grep -i "Local:"
