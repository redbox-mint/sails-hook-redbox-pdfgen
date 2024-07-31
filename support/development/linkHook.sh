#! /bin/bash

set -euxo pipefail

cd /opt/sailshook
npm link

cd /opt/redbox-portal
if [ ! -d "node_modules/@researchdatabox/sails-hook-redbox-pdfgen" ]; then
    rm -f api/services/PDFService.js
    npm uninstall "puppeteer"
    npm install "file:/opt/sailshook"
fi

npm link "@researchdatabox/sails-hook-redbox-pdfgen"

node app.js
