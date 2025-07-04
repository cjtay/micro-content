import { z, defineCollection } from "astro:content";
import { glob } from 'astro/loaders';

const pils = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: "./src/content/pil" }),
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
      treatments: z.union([
        z.array(z.string()),
        z.array(
          z.object({
            name: z.string(),
            cycle: z.string(),
            info: z.string(),
            icon: z.string().optional()
          })
        )
      ]).optional(),
      treatmentSchedule: z.array(
        z.object({
          day: z.number().optional(),
          treatments: z.array(z.string())
        }).catchall(z.any())
      ).optional(),
      commonSideEffects: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional()
        })
      ).optional(),
      otherCommonSideEffects: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional()
        })
      ).optional(),
      occasionalSideEffects: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional()
        })
      ).optional(),
      rareSideEffects: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional()
        })
      ).optional(),
    }),
});

const basic = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: "./src/content/basic" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    slug: z.string(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    pubDate: z.coerce.date(),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  pils: pils,
  basic: basic,
};

