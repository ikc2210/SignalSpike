'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@perplexity/db';
import { enqueueRun } from '@perplexity/core';

export async function toggleTemplateActive(id: string, _formData: FormData): Promise<void> {
  const template = await prisma.queryTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.queryTemplate.update({
    where: { id },
    data: { active: !template.active },
  });
  revalidatePath('/templates');
}

export async function enqueueTemplateRun(templateId: string, _formData: FormData): Promise<void> {
  await enqueueRun(templateId);
  revalidatePath('/runs');
}

export async function approveEntity(id: string, _formData: FormData): Promise<void> {
  await prisma.entity.update({
    where: { id },
    data: { approvalState: 'approved' },
  });
  revalidatePath('/entities');
}

export async function rejectEntity(id: string, _formData: FormData): Promise<void> {
  await prisma.entity.update({
    where: { id },
    data: { approvalState: 'rejected' },
  });
  revalidatePath('/entities');
}
