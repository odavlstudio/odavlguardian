import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Documentation',
  description: 'Guardian documentation and guides',
};

export default function DocsIndex() {
  redirect('/docs/getting-started');
}
