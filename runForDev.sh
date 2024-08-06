#!/usr/bin/env bash

set -euo pipefail

# This script runs a development redbox instance with sails-hook-redbox-pdfgen installed.

# Install packages for this hook.
npm install

# Prepare the host machine.
npm run dev:host

# Start docker compose for development.
npm run dev:docker
