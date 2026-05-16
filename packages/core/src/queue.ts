import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

export const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const monitorQueue = new Queue('monitor', { connection });

export interface RunTemplateJobData {
  templateId: string;
  entityId?: string;
}

export async function enqueueRun(templateId: string, entityId?: string): Promise<string> {
  const data: RunTemplateJobData = entityId
    ? { templateId, entityId }
    : { templateId };

  const job = await monitorQueue.add('run-template', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  return job.id ?? '';
}
