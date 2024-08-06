# ReDBox Portal Record PDF Generation

An installable hook for the ReDBox Portal to 
add PDF generation functionality for records using Puppeteer.

## Installation

There are a few steps to install the pieces needed for generating PDF files.

### Install package

In your redbox portal root folder run the command:

```npm i @researchdatabox/sails-hook-redbox-pdfgen```

### Install browser that puppeteer will control

Modify your Dockerfile to install the puppeteer dependencies and 
install the browser that puppeteer will control.

The dependency of this package `puppeteer` will download known working versions of 
Chrome for Testing and chrome-headless-shell.

Add to your Dockerfile:

```Dockerfile
# As the 'root' user.
# USER root

# Install dependencies for Chrome for Testing.
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/browsers \
    && chown node:node /opt/browsers

# As the 'node' user.
# USER node

# Copy the source files.
# COPY --chown=node:node . <source-path-in-container>

# Set the download path to a place that is stored in the container.
ENV PUPPETEER_CACHE_DIR=/opt/browsers
RUN cd <source-path-in-container> \
    && npm install
```

## Configuration

The service is designed to run using the record post-save trigger functionality.
It has the following options:

### `waitForSelector`

Required: yes

A [css selector](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitforselectorselector-options) that puppeteer will wait for before generating the PDF. 
Usually this is when the angular app has finished initialising and the selector "div#loading.hidden" will be satisfactory.
If you have components that make AJAX calls after initialisation that you need to wait on then you may need to use a different selector.


### `pdf-prefix`

Required: yes

The prefix of the filename that will be generated. PDFs will be stored as datastreams (attachments) 
to the record with this parameter as a prefix followed by an ISO8601 datestring. 
e.g. `<type>-pdf-201901021000.pdf`


### `token`

Required: yes

An API access token that puppeteer will use to access the record. This needs to be generated for a user on the User Management page of the system.
The user must also have appropriate roles set so that it has appropriate permissions to view the record.

### `sourceUrlBase`

Required: no

Default: `/default/rdmp/record/view`

Set the base source url.

### `PDFOptions`

Required: no

Default: `{format: 'A4', printBackground: true}`

Change the pdf attributes.

## Example configuration


Inject the API token via the hook's `index.js`.

In `index.js`:

```js
module.exports = function (sails) {
  return {
    initialize: function (cb) {
      if (!_.isUndefined(sails.config.auth.default.local.default.token) && !_.isEmpty(sails.config.auth.default.local.default.token)) {
        const enabledTypes = ["<type>"];
        for (let enabledType of enabledTypes) {
          sails.log.verbose(`PDFService::Adding token for recordtype ${enabledType}`)
          sails.config.recordtype[enabledType].hooks.onCreate.post[0].options.triggerConfiguration.options.token = sails.config.auth.default.local.default.token;
          sails.config.recordtype[enabledType].hooks.onUpdate.post[0].options.triggerConfiguration.options.token = sails.config.auth.default.local.default.token;
        }
      }
    }
  };
};
```

Set up the pdf generation task.

In `config/agendaQueue.js`:

```js
module.exports.agendaQueue = {
    jobs: [
        {
            name: 'PDFService-CreatePDF',
            fnName: 'rdmpservice.queuedTriggerSubscriptionHandler',
            options: {
                lockLifetime: 120 * 1000, // 120 seconds max runtime
                lockLimit: 1,
                concurrency: 1
            }
        }
    ]
};
```

Configure when to run the pdf generation.

In `config/<type>-recordtype.js`

```js
module.exports.recordtype = {
  '<type>': {
    "packageType": "<type>",
    hooks: {
      onCreate: {
        post: [
          {
            function: 'sails.services.rdmpservice.queueTriggerCall',
            options: {
              jobName: 'PDFService-CreatePDF',
              triggerConfiguration: {
                function: 'sails.services.pdfservice.createPDF',
                options: {
                  waitForSelector: 'div#loading.hidden',
                  pdfPrefix: '<type>-pdf',
                  token: ''
                }
              }
            }
          },
        ]
      },
      onUpdate: {
        post: [
          {
            function: 'sails.services.rdmpservice.queueTriggerCall',
            options: {
              jobName: 'PDFService-CreatePDF',
              triggerConfiguration: {
                function: 'sails.services.pdfservice.createPDF',
                options: {
                  waitForSelector: 'div#loading.hidden',
                  pdfPrefix: '<type>-pdf',
                  token: ''
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

## Development

```bash
# This will build the npm package for `sails-hook-redbox-pdfgen` and install it into the `rbportal`.
# To start a redbox instance for local development:
./runForDev.sh

# After making code changes:
npm run dev:docker:clean


# To run tests, then clean up the test docker compose resources:
npm install
npm run dev:host

npm run test:bruno:docker
npm run test:bruno:docker:clean

# npm run test:mocha:docker
# npm run test:mocha:docker:clean

npm run test:docker:clean


# To remove the database contents and all generated and cached files:
npm run dev:host:clean
```
