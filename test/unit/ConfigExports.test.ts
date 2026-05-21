const { expect } = require('@researchdatabox/redbox-dev-tools/testing');
const { PDFGEN_CONFIG_MODEL, PDFGEN_CONFIG_SCHEMA } = require('../../src/api/configmodels/PDFGenConfig');
const { agendaQueue } = require('../../src/config/agendaQueue');

describe('Config exports', () => {
  it('registers the PDF creation queue job', () => {
    expect(agendaQueue.jobs).to.deep.include({
      name: 'PDFService-CreatePDF',
      fnName: 'rdmpservice.queuedTriggerSubscriptionHandler',
      options: {
        lockLifetime: 120 * 1000,
        lockLimit: 1,
        concurrency: 1
      }
    });
  });

  it('registers the PDF token as a secret config field', () => {
    expect(PDFGEN_CONFIG_MODEL.secretFields).to.deep.equal(['token']);
  });

  it('defines renderable nested controls for Puppeteer PDF options', () => {
    const pdfOptions = PDFGEN_CONFIG_SCHEMA.properties.PDFOptions;

    expect(pdfOptions.type).to.equal('object');
    expect(pdfOptions.additionalProperties).to.equal(false);
    expect(pdfOptions.properties).to.include.keys([
      'format',
      'printBackground',
      'landscape',
      'scale',
      'margin'
    ]);
  });

  it('limits PDF paper format to supported Puppeteer values', () => {
    const format = PDFGEN_CONFIG_SCHEMA.properties.PDFOptions.properties.format;

    expect(format.default).to.equal('A4');
    expect(format.enum).to.include.members(['A4', 'Letter', 'Legal', 'A3']);
  });

  it('renders PDF header and footer templates as textareas', () => {
    const properties = PDFGEN_CONFIG_SCHEMA.properties.PDFOptions.properties;

    expect(properties.headerTemplate.widget.formlyConfig.type).to.equal('textarea');
    expect(properties.footerTemplate.widget.formlyConfig.type).to.equal('textarea');
  });

  it('does not expose Puppeteer path in appconfiguration PDF options', () => {
    const properties = PDFGEN_CONFIG_SCHEMA.properties.PDFOptions.properties;

    expect(properties).to.not.have.property('path');
  });
});
