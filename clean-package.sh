#!/bin/bash

# Backup the original file
cp package.json package.json.bak

# Remove any potential BOM and normalize line endings
cat package.json | tr -d '\r' | sed 's/^\xEF\xBB\xBF//' > package.json.tmp

# Format JSON
jq '.' package.json.tmp > package.json

# Clean up
rm package.json.tmp

echo "package.json has been cleaned and formatted" 