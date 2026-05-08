#!/bin/bash
echo "Stopping Backend and Frontend..."

if [ -f "backend.pid" ]; then
    kill $(cat backend.pid) 2>/dev/null
    rm backend.pid
    echo "Backend stopped."
else
    pkill -f "uvicorn main:app" 2>/dev/null
    echo "Backend stopped via pkill."
fi

if [ -f "frontend.pid" ]; then
    kill $(cat frontend.pid) 2>/dev/null
    rm frontend.pid
    echo "Frontend stopped."
else
    pkill -f "vite" 2>/dev/null
    echo "Frontend stopped via pkill."
fi
