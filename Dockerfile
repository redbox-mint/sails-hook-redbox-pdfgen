FROM qcifengineering/redbox-portal:develop

# This Dockerfile is for dev and testing only.

USER root

# Configure default locale for chrome-headless-shell.
ENV LANG en_US.UTF-8

# Install the dependencies required for Chrome for Testing and chrome-headless-shell
# that puppeteer installs. See https://pptr.dev/guides/docker
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/*

# Get the minio client
RUN wget --quiet --show-progress -O /usr/local/bin/minio-client https://dl.min.io/client/mc/release/linux-amd64/mc \
    && chmod +x /usr/local/bin/minio-client

USER node
