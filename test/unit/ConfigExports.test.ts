const { expect } = require('@researchdatabox/redbox-dev-tools/testing');
const { PDFGEN_CONFIG_MODEL } = require('../../src/api/configmodels/PDFGenConfig');
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
});
