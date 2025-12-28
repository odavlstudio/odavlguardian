const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  crawl: {
    maxPages: 25,
    maxDepth: 3,
  },
  timeouts: {
    navigationMs: 20000,
  },
  output: {
    dir: './.odavlguardian',
  }
};

function findConfigFile(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, 'guardian.config.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function validatePositiveInt(value, name, allowZero = false) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (allowZero) {
    if (value < 0) throw new Error(`${name} must be >= 0`);
  } else {
    if (value <= 0) throw new Error(`${name} must be > 0`);
  }
}

function validateConfigShape(raw, filePath) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Invalid config in ${filePath}: expected an object`);
  }

  const effective = {
    crawl: {
      maxPages: DEFAULTS.crawl.maxPages,
      maxDepth: DEFAULTS.crawl.maxDepth
    },
    timeouts: {
      navigationMs: DEFAULTS.timeouts.navigationMs
    },
    output: {
      dir: DEFAULTS.output.dir
    }
  };

  if (raw.crawl) {
    if (raw.crawl.maxPages !== undefined) {
      validatePositiveInt(raw.crawl.maxPages, 'crawl.maxPages');
      effective.crawl.maxPages = raw.crawl.maxPages;
    }
    if (raw.crawl.maxDepth !== undefined) {
      validatePositiveInt(raw.crawl.maxDepth, 'crawl.maxDepth', true);
      effective.crawl.maxDepth = raw.crawl.maxDepth;
    }
  }

  if (raw.timeouts) {
    if (raw.timeouts.navigationMs !== undefined) {
      validatePositiveInt(raw.timeouts.navigationMs, 'timeouts.navigationMs');
      effective.timeouts.navigationMs = raw.timeouts.navigationMs;
    }
  }

  if (raw.output) {
    if (raw.output.dir !== undefined) {
      if (typeof raw.output.dir !== 'string' || raw.output.dir.trim() === '') {
        throw new Error('output.dir must be a non-empty string');
      }
      effective.output.dir = raw.output.dir;
    }
  }

  return effective;
}

function applyLocalConfig(inputConfig) {
  const cliSource = inputConfig._cliSource || {};
  const discoveredPath = findConfigFile();
  let fileConfig = null;
  let fileEffective = null;

  if (discoveredPath) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(discoveredPath, 'utf8'));
      fileEffective = validateConfigShape(fileConfig, discoveredPath);
    } catch (err) {
      throw new Error(`Invalid guardian.config.json at ${discoveredPath}: ${err.message}`);
    }
  }

  const effective = {
    crawl: { ...DEFAULTS.crawl },
    timeouts: { ...DEFAULTS.timeouts },
    output: { ...DEFAULTS.output }
  };

  if (fileEffective) {
    effective.crawl = { ...effective.crawl, ...fileEffective.crawl };
    effective.timeouts = { ...effective.timeouts, ...fileEffective.timeouts };
    effective.output = { ...effective.output, ...fileEffective.output };
  }

  // CLI overrides
  if (inputConfig.maxPages !== undefined) {
    validatePositiveInt(inputConfig.maxPages, 'crawl.maxPages');
    effective.crawl.maxPages = inputConfig.maxPages;
  }
  if (inputConfig.maxDepth !== undefined) {
    validatePositiveInt(inputConfig.maxDepth, 'crawl.maxDepth', true);
    effective.crawl.maxDepth = inputConfig.maxDepth;
  }
  if (inputConfig.timeout !== undefined) {
    validatePositiveInt(inputConfig.timeout, 'timeouts.navigationMs');
    effective.timeouts.navigationMs = inputConfig.timeout;
  }
  if (inputConfig.artifactsDir !== undefined) {
    if (typeof inputConfig.artifactsDir !== 'string' || inputConfig.artifactsDir.trim() === '') {
      throw new Error('output.dir must be a non-empty string');
    }
    effective.output.dir = inputConfig.artifactsDir;
  }

  // Determine source label
  let source = 'defaults';
  if (fileEffective) source = 'guardian.config.json';
  const cliOverride = cliSource.maxPages || cliSource.maxDepth || cliSource.timeout || cliSource.artifactsDir;
  if (cliOverride) source = 'cli';

  const finalConfig = { ...inputConfig };
  finalConfig.maxPages = effective.crawl.maxPages;
  finalConfig.maxDepth = effective.crawl.maxDepth;
  finalConfig.timeout = effective.timeouts.navigationMs;
  finalConfig.artifactsDir = effective.output.dir;

  return {
    config: finalConfig,
    report: {
      source,
      path: fileEffective ? path.resolve(discoveredPath) : null,
      effective
    }
  };
}

module.exports = { applyLocalConfig, DEFAULTS };