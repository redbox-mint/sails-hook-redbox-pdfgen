FROM qcifengineering/redbox-portal:feature-ng19-forms AS runtime-base

# This Dockerfile is for dev and testing only.
USER root

# Configure default locale for headless browser execution.
ENV LANG=en_US.UTF-8

# Install runtime dependencies and a system browser.
# google-chrome-stable is only published for amd64; use distro chromium elsewhere.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends wget gnupg ca-certificates fonts-freefont-ttf libxss1; \
    if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
      install -m 0755 -d /etc/apt/keyrings; \
      wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg; \
      chmod a+r /etc/apt/keyrings/google-chrome.gpg; \
      echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list; \
      apt-get update; \
      apt-get install -y --no-install-recommends google-chrome-stable; \
    else \
      apt-get install -y --no-install-recommends chromium; \
    fi; \
    rm -rf /var/lib/apt/lists/*

# Get the minio client for the current architecture.
RUN set -eux; \
    ARCH="$(dpkg --print-architecture)"; \
    case "${ARCH}" in \
      amd64) MC_ARCH="amd64" ;; \
      arm64) MC_ARCH="arm64" ;; \
      *) echo "Unsupported architecture for minio client: ${ARCH}" && exit 1 ;; \
    esac; \
    wget --quiet --show-progress -O /usr/local/bin/minio-client "https://dl.min.io/client/mc/release/linux-${MC_ARCH}/mc"; \
    chmod +x /usr/local/bin/minio-client

RUN mkdir -p /opt/browsers \
    && chown node:node /opt/browsers

FROM runtime-base AS deps

COPY --chown=node:node package*.json /opt/sails-hook-redbox-pdfgen/

USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
ENV PUPPETEER_CACHE_DIR=/opt/browsers
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN cd /opt/sails-hook-redbox-pdfgen \
    && npm ci

FROM runtime-base AS final

COPY --chown=node:node . /opt/sails-hook-redbox-pdfgen
COPY --from=deps --chown=node:node /opt/sails-hook-redbox-pdfgen/node_modules /opt/sails-hook-redbox-pdfgen/node_modules

USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
ENV PUPPETEER_CACHE_DIR=/opt/browsers
ENV PUPPETEER_SKIP_DOWNLOAD=true
