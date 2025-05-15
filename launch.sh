#!/bin/bash

# Start the LLM backend
echo "Starting Docker containers..."
docker-compose up -d

# Wait for backend to be ready
echo "Waiting for backend to start..."
while ! curl -s http://localhost:5000 >/dev/null; do
    sleep 1
done

# Open VS Code with the extension
code ~/llm-assistant/vscode-llm-assistant

# Launch the frontend (if using)
# (Uncomment if you have a frontend control panel)
# xdg-open http://localhost:5173 &

echo "All services started!"