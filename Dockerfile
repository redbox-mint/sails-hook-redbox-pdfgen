ARG REDBOX_BASE_IMAGE=qcifengineering/redbox-portal:develop

FROM ${REDBOX_BASE_IMAGE} AS builder

USER root

COPY . /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.npm \
  cd /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen \
  && npm install --include=dev --ignore-scripts --legacy-peer-deps \
  && npm run compile \
  && cd /opt/redbox-portal \
  && npm install --legacy-peer-deps --ignore-scripts /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen \
  && mkdir -p /opt/redbox-portal/views /opt/redbox-portal/assets /opt/redbox-portal/language-defaults \
  && if [ -d /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen/views ]; then cp -a /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen/views/. /opt/redbox-portal/views/; fi \
  && if [ -d /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen/assets ]; then cp -a /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen/assets/. /opt/redbox-portal/assets/; fi \
  && if [ -d /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen/language-defaults ]; then cp -a /opt/redbox-hook--researchdatabox-sails-hook-redbox-pdfgen/language-defaults/. /opt/redbox-portal/language-defaults/; fi

FROM builder AS redbox-hook--researchdatabox-sails-hook-redbox-pdfgen

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN mkdir -p /attachments/staging /attachments/primary \
  && chown -R node:node /opt/redbox-portal /attachments

USER node
