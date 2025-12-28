import { readFileSync } from 'fs';
import { join } from 'path';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

export function loadMarkdownFile(filename: string): string | null {
  try {
    const docsPath = join(process.cwd(), '..', 'docs', 'guardian', `${filename}.md`);
    return readFileSync(docsPath, 'utf-8');
  } catch (error) {
    return null;
  }
}

export function renderMarkdown(content: string): string {
  return md.render(content);
}

export function loadAndRenderMarkdown(filename: string): string | null {
  const content = loadMarkdownFile(filename);
  if (!content) return null;
  return renderMarkdown(content);
}
