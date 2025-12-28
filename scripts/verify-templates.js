const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const checks = [
  {
    file: path.join(root, ".github/workflows/guardian-pr-gate.yml"),
    mustContain: ["@odavl/guardian reality"],
    mustNotContain: ["src/guardian/cli.js"],
  },
  {
    file: path.join(root, ".gitlab-ci.yml"),
    mustNotContain: ["Skipping Guardian scan"],
  },
  {
    file: path.join(root, "bitbucket-pipelines.yml"),
    mustNotContain: ["Skipping Guardian scan"],
  },
];

const errors = [];

for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    errors.push(`Missing template: ${path.relative(root, check.file)}`);
    continue;
  }
  const content = fs.readFileSync(check.file, "utf8");
  (check.mustContain || []).forEach((needle) => {
    if (!content.includes(needle)) {
      errors.push(`${path.relative(root, check.file)} missing required text: ${needle}`);
    }
  });
  (check.mustNotContain || []).forEach((needle) => {
    if (content.includes(needle)) {
      errors.push(`${path.relative(root, check.file)} contains forbidden text: ${needle}`);
    }
  });
}

if (errors.length) {
  console.error("Template verification failed:\n" + errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}

console.log("Template verification passed for GitHub, GitLab, and Bitbucket configs.");
