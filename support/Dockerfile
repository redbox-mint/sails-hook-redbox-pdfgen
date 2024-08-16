FROM qcifengineering/redbox-portal:v3.7 AS build

# This Dockerfile is for dev and testing only.

USER root

# Configure default locale for chrome-headless-shell.
ENV LANG="en_US.UTF-8"

# Install the dependencies required for Chrome for Testing and chrome-headless-shell
# that puppeteer installs. See https://pptr.dev/guides/docker
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/browsers \
    && chown node:node /opt/browsers

COPY --from=minio/mc:latest /bin/mc /bin/mc

USER node

ENV HOOK_NAME="sails-hook-redbox-pdfgen"

ENV HOOK_PATH="/opt/${HOOK_NAME}"
ENV BUILD_DIR="/tmp/build-${HOOK_NAME}"
ENV BUILD_PREFIX="researchdatabox-${HOOK_NAME}"
ENV INSTALL_DIR="/opt/redbox-portal/node_modules/${HOOK_NAME}"
ENV PUPPETEER_CACHE_DIR="/opt/browsers"

# Package this hook and install it
COPY --chown=node:node . "${HOOK_PATH}"
RUN cd "${HOOK_PATH}" \
    && mkdir -p "${BUILD_DIR}" \
    && rm -rf ${BUILD_DIR}/* \
    && npm pack . --pack-destination=${BUILD_DIR} \
    && cd /opt/redbox-portal  \
    && npm install --omit=dev ${BUILD_DIR}/${BUILD_PREFIX}*

