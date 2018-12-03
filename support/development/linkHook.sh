#! /bin/bash
cd /opt/sailshook; 
yarn link; 
cd /opt/redbox-portal;  
if [ ! -d "node_modules/@redbox/sails-hook-redbox-pdfgen" ]; then
    rm api/services/PDFService.js
    yarn remove "puppeteer"
    yarn add  "file:/opt/sailshook";
fi
yarn link "@redbox/sails-hook-redbox-pdfgen"; 
node app.js