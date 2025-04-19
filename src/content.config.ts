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
      days: z.string().optional(),
      treatments: z.array(z.string()).optional(), // <-- ADD THIS LINE
    }),
});

export const collections = {
  pils: pils,
};
