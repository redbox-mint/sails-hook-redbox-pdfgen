import type { AgendaQueueConfig } from '@researchdatabox/redbox-core';

export function mergeAgendaQueueJobs(existingJobs: unknown, hookJobs: unknown) {
  const mergedJobs = Array.isArray(existingJobs) ? [...existingJobs] : [];

  for (const hookJob of Array.isArray(hookJobs) ? hookJobs : []) {
    if (hookJob == null || typeof hookJob !== 'object') {
      continue;
    }

    const hookJobName = (hookJob as { name?: unknown }).name;
    if (typeof hookJobName !== 'string') {
      mergedJobs.push(hookJob);
      continue;
    }

    const existingIndex = mergedJobs.findIndex((job) =>
      job != null
      && typeof job === 'object'
      && (job as { name?: unknown }).name === hookJobName
    );

    if (existingIndex >= 0) {
      mergedJobs[existingIndex] = hookJob;
    } else {
      mergedJobs.push(hookJob);
    }
  }

  return mergedJobs;
}

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
