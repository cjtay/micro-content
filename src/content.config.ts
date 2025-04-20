import { z, defineCollection } from "astro:content";
import { glob } from 'astro/loaders';

const pils = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/pil" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      slug: z.string(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
      pubDate: z.date(),
      draft: z.boolean().optional(),
      days: z.number().optional(),
      treatments: z.array(z.string()).optional(),
      treatmentSchedule: z.array(
        z.object({
          day: z.number(),
          treatments: z.array(z.string())
        })
      ).optional(),
    }),
});

export const collections = {
  pils: pils,
};

