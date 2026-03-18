#!/bin/bash
# Run this ONCE to install PostgreSQL server and create the jobboard database.
# Requires sudo.

set -e

echo "==> Installing PostgreSQL server..."
sudo apt install -y postgresql

echo "==> Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo "==> Creating database and user..."
sudo -u postgres psql <<SQL
CREATE DATABASE jobboard;
CREATE USER satyasai WITH PASSWORD 'jobboard';
GRANT ALL PRIVILEGES ON DATABASE jobboard TO satyasai;
ALTER DATABASE jobboard OWNER TO satyasai;
SQL

echo ""
echo "Done! Database 'jobboard' is ready."
echo "Connection string: postgres://satyasai:jobboard@localhost:5432/jobboard?sslmode=disable"
