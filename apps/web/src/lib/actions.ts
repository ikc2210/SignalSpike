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
  revalidatePath('/settings/templates');
}

export async function enqueueTemplateRun(templateId: string, _formData: FormData): Promise<void> {
  const template = await prisma.queryTemplate.findUniqueOrThrow({ where: { id: templateId } });

  if (template.templateType === 'entity_type_discovery') {
    await enqueueRun(templateId);
  } else {
    const entities = await prisma.entity.findMany({
      where: {
        approvalState: 'approved',
        active: true,
        entityType: { in: template.entityTypes },
      },
      select: { id: true },
    });
    await Promise.all(entities.map((e) => enqueueRun(templateId, e.id)));
  }

  revalidatePath('/runs');
}

export async function approveEntity(id: string, _formData: FormData): Promise<void> {
  const entity = await prisma.entity.update({
    where: { id },
    data: { approvalState: 'approved' },
  });

  const templates = await prisma.queryTemplate.findMany({
    where: {
      templateType: 'entity_monitoring',
      active: true,
      entityTypes: { has: entity.entityType },
    },
    select: { id: true },
  });
  await Promise.all(templates.map((t) => enqueueRun(t.id, entity.id)));

  revalidatePath('/entities');
}

export async function rejectEntity(id: string, _formData: FormData): Promise<void> {
  await prisma.entity.update({
    where: { id },
    data: { approvalState: 'rejected' },
  });
  revalidatePath('/entities');
}

export async function saveUserProfile(_prevState: unknown, formData: FormData): Promise<{ saved: boolean }> {
  await prisma.userProfile.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      role: formData.get('role') as string || null,
      entity: formData.get('entity') as string || null,
      entityType: formData.get('entityType') as string || null,
      primaryRemit: formData.get('primaryRemit') as string || null,
    },
    update: {
      role: formData.get('role') as string || null,
      entity: formData.get('entity') as string || null,
      entityType: formData.get('entityType') as string || null,
      primaryRemit: formData.get('primaryRemit') as string || null,
    },
  });
  revalidatePath('/settings/profile');
  return { saved: true };
}
