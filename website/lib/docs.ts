import { readFileSync } from 'fs';
import { join } from 'path';
import MarkdownIt from 'markdown-it';

export type DocSlug = 'getting-started' | 'presets' | 'ci-integration' | 'guardian-contract-v1';

export type DocEntry = {
  slug: DocSlug;
  name: string;
  title: string;
  description: string;
};

export const docs: DocEntry[] = [
  {
    slug: 'getting-started',
    name: 'Getting Started',
    title: 'Getting Started with ODAVL Guardian',
    description: 'Installation, first run, and quick start guide',
  },
  {
    slug: 'presets',
    name: 'Presets & Policies',
    title: 'Presets & Policies',
    description: 'Choose the right preset for your product',
  },
  {
    slug: 'ci-integration',
    name: 'CI/CD Integration',
    title: 'CI/CD Integration Guide',
    description: 'GitHub Actions, GitLab CI, Bitbucket Pipelines',
  },
  {
    slug: 'guardian-contract-v1',
    name: 'Guardian Contract',
    title: 'Guardian Contract v1.0',
    description: 'Technical specification and guarantees',
  },
];

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

export function loadMarkdown(slug: DocSlug): { html: string; raw: string } | null {
  try {
    const filepath = join(process.cwd(), '..', 'docs', 'guardian', `${slug}.md`);
    const raw = readFileSync(filepath, 'utf-8');
    const html = md.render(raw);
    return { html, raw };
  } catch (error) {
    return null;
  }
}
