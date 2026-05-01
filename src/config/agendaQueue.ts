import type { AgendaQueueConfig } from '@researchdatabox/redbox-core';

export const agendaQueue: AgendaQueueConfig = {
  jobs: [
    {
      name: 'PDFService-CreatePDF',
      fnName: 'rdmpservice.queuedTriggerSubscriptionHandler',
      options: {
        lockLifetime: 120 * 1000,
        lockLimit: 1,
        concurrency: 1
      }
    }
  ]
};
