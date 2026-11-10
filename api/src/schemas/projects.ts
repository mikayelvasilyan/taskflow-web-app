import { z } from 'zod';
import { email, hexColor, reqString } from './common.js';

const projectName = reqString('Project name')
  .trim()
  .min(1, 'Project name is required')
  .max(60, 'Project name must be at most 60 characters');

const description = z.string().trim().max(500, 'Description must be at most 500 characters');

export const createProjectBody = z.object({
  name: projectName,
  description: description.optional(),
  color: hexColor.optional(),
});

export const updateProjectBody = z
  .object({
    name: projectName.optional(),
    description: description.optional(),
    color: hexColor.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export const inviteBody = z.object({ email });

export const createLabelBody = z.object({
  name: reqString('Label name').trim().min(1, 'Label name is required').max(30),
  color: hexColor,
});

export const idParam = z.object({ id: z.string().min(1).max(64) });
