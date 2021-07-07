# ReDBox Portal Record PDF Generation

An installable hook for the ReDBox Portal to add PDF generation functionality for records using Puppeteer.

Note: this plugin has been extended to allow for creating browser pools, see config item below.

## Installation
In your redbox portal root folder run the command:

```npm i @researchdatabox/sails-hook-redbox-pdfgen```

### 1.2.6 only
Before installing this plugin, install Chrome manually:
```
apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
```
Then set `export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

## Configuration

The service is designed to run using the record post-save trigger functionality. It has the following options:

| Parameter      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                          | Required |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| waitForSelector | A [css selector](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitforselectorselector-options) that puppeteer will wait for before generating the PDF. Usually this is when the angular app has finished initialising and the selector "div#loading.hidden" will be satisfactory. If you have components that make AJAX calls after initialisation that you need to wait on then you may need to use a different selector.  | Yes      |
| pdf-prefix      | The prefix of the filename that will be generated. PDFs will be stored as datastreams (attachments) to the record with this parameter as a prefix followed by an ISO8601 datestring. e.g. rdmp-pdf-201901021000.pdf                                                                                                                                                                                                                                  | Yes      |
| token           | An API access token that puppeteer will use to access the record. This needs to be generated for a user on the User Management page of the system. The user must also have appropriate roles set so that it has appropriate permissions to view the record.                                                                                                                                                                                          | Yes      |

### Example RecordType configuration

```
hooks: {
      onCreate: {
        post: [{

          function: 'sails.services.pdfservice.createPDF',
          options: {
            waitForSelector: 'div#loading.hidden',
            pdfPrefix: 'rdmp-pdf',
            token: 'abcd-efgh-abcd-abcd-abcd'
          }
        }]
      },
      onUpdate: {
        post: [{
          function: 'sails.services.pdfservice.createPDF',
          options: {
            waitForSelector: 'div#loading.hidden',
            pdfPrefix: 'rdmp-pdf',
            token: 'abcd-efgh-abcd-abcd-abcd'
          }
        }]
      }
    },
```

### System-wide configuration

`sails.config.pdfgen.minPool` - mininum number of browser instances in the pool
`sails.config.pdfgen.maxPool` - maximum number of browser instances in the pool

