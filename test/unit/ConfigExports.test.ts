const { expect } = require('@researchdatabox/redbox-dev-tools/testing');
const sinon = require('sinon');
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
    const registerConfigModel = sinon.stub();
    const after = sinon.stub().callsFake((_event, callback) => callback());
    const mergeHookConfig = sinon.stub();

    const hook = require('../../src/index');
    hook.initialize(
      {
        log: {
          warn: sinon.stub(),
          error: sinon.stub()
        },
        services: {
          configservice: {
            mergeHookConfig
          },
          appconfigservice: {
            registerConfigModel
          }
        },
        after
      },
      sinon.stub()
    );

    expect(mergeHookConfig.calledOnce).to.be.true;
    expect(registerConfigModel.calledOnce).to.be.true;
    expect(registerConfigModel.firstCall.args[0]).to.include({
      key: 'pdfgen'
    });
    expect(registerConfigModel.firstCall.args[0].secretFields).to.deep.equal(['token']);
  });
});
