# Maintainers

## Current Maintainers

- **ODAVL Studio** ([@odavlstudio](https://github.com/odavlstudio)) — Primary maintainer and project lead

## Ownership Model

Guardian is maintained by ODAVL Studio. All releases, breaking changes, and strategic decisions are approved by the core team.

## Release Responsibility

- **Patch releases (0.2.x)**: Bug fixes and security patches; released as needed
- **Minor releases (0.x.0)**: New features and improvements; released quarterly or as planned
- **Major releases (1.0.0+)**: Reserved for significant breaking changes; not currently scheduled

Release process:
1. Changes merged to `main`
2. Version bumped in [package.json](package.json)
3. [CHANGELOG.md](CHANGELOG.md) updated
4. Tag created and pushed
5. GitHub Actions publishes to npm

## Becoming a Maintainer

Maintainers are responsible for code reviews, releases, and strategic direction. We're looking for contributors who:

- Have submitted multiple high-quality pull requests
- Understand Guardian's philosophy (silence discipline, reality-first testing)
- Can commit to regular reviews and communication
- Have demonstrated familiarity with the codebase

If interested, open an issue or reach out to discuss.

## Bus Factor

Guardian is maintained by ODAVL Studio. To mitigate single-point-of-failure:

- All changes are reviewed and merged to public `main`
- Documentation is comprehensive and maintained in the repo
- Tests are extensive and runnable by anyone
- Release process is automated via GitHub Actions

If the primary maintainer becomes unavailable, a community member can fork and maintain Guardian independently under the MIT license.

## Code Review

Pull requests should include:

- **Tests**: New features need unit/integration tests
- **Documentation**: Updates to README or docs if behavior changes
- **Changelog**: Entry in [CHANGELOG.md](CHANGELOG.md) for user-facing changes

Reviews typically happen within 5 business days.

## Communication

- **Issues**: Used for bugs, features, and discussions
- **Discussions**: For broader conversations and ideas
- **Email**: For security issues only (security@odavlstudio.com)

---

**Last Updated**: December 28, 2025
