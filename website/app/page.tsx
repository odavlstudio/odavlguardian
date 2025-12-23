"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import Link from "next/link";

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.6, ease: "easeOut" }
  })
};

const steps = [
  {
    title: "Opens your website in a real browser",
    text: "Guardian navigates between pages, clicks buttons, fills forms, switches languages, follows links and redirects—just like a real user would."
  },
  {
    title: "Tests critical user flows",
    text: "Signup and login flows, payment journeys, language switching, form submissions—Guardian tests the paths that matter to your users and your revenue."
  },
  {
    title: "Simulates dozens of real users",
    text: "Guardian repeats scenarios under different conditions, visits expected and unexpected URLs, and behaves like dozens of real users tested your product."
  },
  {
    title: "Delivers truth before launch",
    text: "Guardian simulates the market—not the code. It tests the only truth that matters: Will real users actually succeed? Without losing a single one."
  }
];

const isVsIsNot = {
  is: [
    "Market Reality Testing Engine",
    "Your first line of defense before reputation damage",
    "Digital guardian that prevents customer loss",
    "Peace of mind before launch"
  ],
  isNot: [
    "A linter or unit test framework",
    "UI test script runner",
    "Monitoring tool after failure",
    "AI demo or auto-fix system"
  ]
};

const problems = [
  "A button doesn't work. A page doesn't open.",
  "A form doesn't submit. A flow breaks halfway.",
  "The experience feels confusing or incomplete.",
  "Users don't report these problems. Users simply leave."
];

const principle = "A product is only 'real' when it survives a series of market-like reality tests.";

export default function Page() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <div className="page">
      <div className="progress-bar">
        <motion.div className="progress" style={{ scaleX: progress }} />
      </div>

      <header className="nav-bar shell">
        <div className="brand">
          <span className="marker" aria-hidden="true" />
          <span>ODAVL Guardian</span>
        </div>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#what-it-does" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="https://github.com/odavl/guardian/blob/main/README.md" className="nav-link" target="_blank" rel="noopener noreferrer">Docs</a>
        </nav>
        <div className="nav-actions">
          <a 
            href="https://github.com/odavl/guardian" 
            className="nav-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View ODAVL Guardian on GitHub"
          >
            GitHub
          </a>
          <a 
            href="https://github.com/odavl/guardian" 
            className="nav-cta"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Try ODAVL Guardian"
          >
            Try ODAVL Guardian
          </a>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <motion.div
            className="hero-grid"
            initial="hidden"
            animate="show"
            variants={fade}
          >
            <motion.div>
              <div className="overline">
                <span className="badge-dot" aria-hidden="true" />
                Market Reality Testing Engine
              </div>
              <h1>Before you launch, let Guardian be your first user.</h1>
              <div className="hero-one-liner">Guardian simulates real users and issues a launch verdict with evidence.</div>
              <p>ODAVL Guardian is a market reality testing engine that simulates real user behavior and performs the exact checks the market would perform on your product—before any real user ever reaches it. Guardian doesn't test code. Guardian tests the only truth that matters: Will real users actually succeed?</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 24 }}>
                <a 
                  href="https://github.com/odavl/guardian" 
                  className="cta"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View ODAVL Guardian on GitHub and get started"
                >
                  Try ODAVL Guardian
                </a>
                <div className="status-chip" role="status" aria-label="Open source project status">
                  <span className="badge-dot" aria-hidden="true" />
                  Open Source
                </div>
              </div>
              <div className="cli-inline" role="region" aria-label="Quick CLI example">
                <span className="code-pill" aria-hidden="true">CLI</span>
                <span className="cli-inline-text">npx odavl-guardian reality --url https://yoursite.com</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-card"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
            >
              <h3>Core Principle</h3>
              <strong>{principle}</strong>
              <p style={{ color: "#b8b8d4", marginTop: 14 }}>
                Anything before that is assumption, overconfidence, or hope. Guardian turns assumption into proof.
              </p>
            </motion.div>
          </motion.div>
        </section>

        <section className="section" id="what">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
            <h2>What is ODAVL Guardian?</h2>
            <p>ODAVL Guardian is a market reality testing engine that simulates real user behavior and performs the exact checks the market would perform on your product—before any real user ever reaches it.</p>
            <p>Guardian does not test code. Guardian does not care if the build passed. Guardian does not trust that "everything looks fine." Guardian tests the only truth that matters: Will real users actually succeed?</p>
          </motion.div>
        </section>

        <section className="section" id="principle">
          <motion.div className="panel" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fade}>
            <div className="overline">The Core Principle</div>
            <h2 style={{ marginBottom: 6 }}>{principle}</h2>
            <p>Anything before that is assumption, overconfidence, or hope. Guardian turns assumption into proof.</p>
          </motion.div>
        </section>

        <section className="section" id="problem">
          <div className="split">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
              <div className="overline">The Problem — Market Reality</div>
              <h2>Products fail at first human contact.</h2>
              <p>Most products are built correctly, technically tested, and deployed with confidence. Yet they fail at their very first encounter with the market—not because of code quality, but because of small human details that break trust.</p>
            </motion.div>
            <motion.div className="panel" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
              <ul className="list" role="list">
                {problems.map((item, index) => (
                  <li className="list-item" key={item}>
                    <span className="dot" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="section" id="does">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
            <div className="overline">What Guardian Actually Does</div>
            <h2>Simulates reality. Issues a verdict.</h2>
            <div className="card-grid">
              {steps.map((step, index) => (
                <motion.div
                  className="card"
                  key={step.title}
                  custom={index * 0.1}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={fade}
                >
                  <div className="tag" role="note" aria-label={`Step ${index + 1}`}>
                    <span className="badge-dot" aria-hidden="true" />
                    Step {index + 1}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="section" id="is-isnot">
          <div className="split">
            <motion.div className="panel" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
              <div className="overline">What Guardian Is</div>
              <ul className="list" role="list">
                {isVsIsNot.is.map((item) => (
                  <li className="list-item" key={item}>
                    <span className="dot" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div className="panel" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
              <div className="overline">What Guardian Is Not</div>
              <ul className="list" role="list">
                {isVsIsNot.isNot.map((item) => (
                  <li className="list-item" key={item}>
                    <span className="dot" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="section" id="role">
          <motion.div className="split" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
            <div>
              <div className="overline">Guardian's Role</div>
              <h2>Your first line of defense</h2>
              <p>Guardian exists before your reputation is damaged, before trust is lost, before negative reviews are written, before silent revenue loss occurs. Guardian prevents customer loss, brand damage, firefighting after launch, and invisible revenue leaks. Guardian doesn't sell features. Guardian sells peace of mind.</p>
            </div>
            <div className="panel">
              <div className="tag" role="note">
                <span className="badge-dot" aria-hidden="true" />
                Decision Output
              </div>
              <div role="region" aria-label="Guardian verdict types">
                <h3 style={{ marginBottom: 10 }}>READY</h3>
                <p style={{ marginTop: 0, color: "var(--muted)" }}>Experience withstands real-user behavior. Proceed.</p>
                <h3 style={{ marginBottom: 10, marginTop: 18 }}>DO_NOT_LAUNCH</h3>
                <p style={{ marginTop: 0, color: "var(--muted)" }}>Observed reality breaks trust. Fix before exposing the market.</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="section" id="final-truth">
          <motion.div className="panel" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fade}>
            <div className="overline">The Final Truth</div>
            <h2>Guardian is not a testing tool.</h2>
            <p>ODAVL Guardian is a Market Reality Testing Engine—a digital guardian that tests your product before the market does. It's not about code. It's about truth. It's about protecting what you've built before anyone else gets to judge it.</p>
          </motion.div>
        </section>

        <section className="section" id="cta">
          <motion.div className="panel" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fade}>
            <div className="overline">Try ODAVL Guardian</div>
            <h2>Simulate dozens of real users before launch.</h2>
            <p>Guardian behaves as if dozens of real users tested your product—but without losing a single one of them. Run market-reality tests and get the truth before the market does. No more assumptions. No more hope. Just proof.</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "14px 0" }}>
              <a 
                href="https://github.com/odavl/guardian" 
                className="cta"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get started with ODAVL Guardian on GitHub"
              >
                Try ODAVL Guardian
              </a>
              <div className="tag" role="note">
                <span className="badge-dot" aria-hidden="true" />
                Serious. Premium. Quietly bold.
              </div>
            </div>
            <div className="code" role="region" aria-label="Example CLI commands">
              <div style={{ color: "var(--muted)", marginBottom: 8 }}>Example CLI run</div>
              <div>$ guardian simulate --profile launch-ready</div>
              <div>$ guardian verdict</div>
              <div style={{ color: "var(--accent)" }}>✓ READY — Ship with confidence</div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="footer shell">
        ODAVL Guardian — Market Reality Testing Engine
      </footer>
    </div>
  );
}
