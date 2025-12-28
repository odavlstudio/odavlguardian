import Link from "next/link";
import styles from "./docs.module.css";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.docs_layout}>
      <aside className={styles.docs_sidebar}>
        <div className={styles.docs_nav_section}>
          <h3 className={styles.docs_nav_title}>Getting Started</h3>
          <nav className={styles.docs_nav} role="navigation" aria-label="Getting started">
            <Link href="/docs/getting-started" className={styles.docs_nav_link}>
              Installation
            </Link>
            <Link href="/docs/first-run" className={styles.docs_nav_link}>
              Your First Run
            </Link>
          </nav>
        </div>

        <div className={styles.docs_nav_section}>
          <h3 className={styles.docs_nav_title}>Usage</h3>
          <nav className={styles.docs_nav} role="navigation" aria-label="Usage">
            <Link href="/docs/presets" className={styles.docs_nav_link}>
              Presets & Policies
            </Link>
            <Link href="/docs/understanding-verdicts" className={styles.docs_nav_link}>
              Understanding Verdicts
            </Link>
          </nav>
        </div>

        <div className={styles.docs_nav_section}>
          <h3 className={styles.docs_nav_title}>Integration</h3>
          <nav className={styles.docs_nav} role="navigation" aria-label="Integration">
            <Link href="/docs/ci-cd" className={styles.docs_nav_link}>
              CI/CD Integration
            </Link>
            <Link href="/docs/github-action" className={styles.docs_nav_link}>
              GitHub Action
            </Link>
          </nav>
        </div>

        <div className={styles.docs_nav_section}>
          <h3 className={styles.docs_nav_title}>Reference</h3>
          <nav className={styles.docs_nav} role="navigation" aria-label="Reference">
            <Link href="/docs/contract" className={styles.docs_nav_link}>
              Contract v1
            </Link>
          </nav>
        </div>

        <div className={styles.docs_nav_section}>
          <h3 className={styles.docs_nav_title}>Resources</h3>
          <nav className={styles.docs_nav} role="navigation" aria-label="Resources">
            <a
              href="https://github.com/odavlstudio/odavlguardian"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docs_nav_link}
            >
              GitHub →
            </a>
          </nav>
        </div>
      </aside>

      <main className={styles.docs_content}>{children}</main>
    </div>
  );
}
