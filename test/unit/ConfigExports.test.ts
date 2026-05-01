const { expect } = require('@researchdatabox/redbox-dev-tools/testing');
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
});
