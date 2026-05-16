#!/bin/bash
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Starting NEPSE Elite backend on port 8080..."
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
