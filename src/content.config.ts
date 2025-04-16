import { z, defineCollection } from "astro:content";
import { glob } from 'astro/loaders';

const pils = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/pil-set-1" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      slug: z.string(),
      tags: z.array(z.string()).optional(), // Define tags as an array of topics - community, elderly, general
      category: z.string().optional(),
      pubDate: z.date(),
    }),
});



// const milestones = defineCollection({
//   type: "data",
//   schema: ({ image }) =>
//     z.object({
//       title: z.string(),
//       description: z.string(),
//       photo: image().refine((img) => img.width >= 1, {
//         message: "Cover image must be moew than 1 pixel wide!",
//       }),
//       photoAlt: z.string(),
//       link: z.string().optional(),
//       date: z.date(),
//       canonicalURL: z.string().optional(),
//     }),
// });

export const collections = {
  pils: pils,

  // milestones: milestones,
};
