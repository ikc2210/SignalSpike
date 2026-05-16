import { Worker } from 'bullmq';
import { connection, executeRun } from '@perplexity/core';
import type { RunTemplateJobData } from '@perplexity/core';

const worker = new Worker<RunTemplateJobData>(
  'monitor',
  async (job) => {
    console.log(`[worker] starting job ${job.id} — template ${job.data.templateId}`);
    const runId = await executeRun(job.data.templateId, job.data.entityId);
    console.log(`[worker] job ${job.id} completed — run ${runId}`);
    return runId;
  },
  { connection, concurrency: 3 },
);

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

async function shutdown(): Promise<void> {
  console.log('[worker] shutting down...');
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });

console.log('[worker] started — listening on queue: monitor');
