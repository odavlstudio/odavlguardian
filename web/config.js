const REQUIRED_ENVS = ['NODE_ENV'];
const OPTIONAL_ENVS = { PORT: 3000, STRIPE_SECRET_KEY: '' };

function getEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig() {
  const missing = REQUIRED_ENVS.filter((key) => !process.env[key] || process.env[key] === '');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const NODE_ENV = getEnv('NODE_ENV');
  const PORT = parseInt(getEnv('PORT', OPTIONAL_ENVS.PORT), 10);
  const STRIPE_SECRET_KEY = getEnv('STRIPE_SECRET_KEY', OPTIONAL_ENVS.STRIPE_SECRET_KEY);

  if (Number.isNaN(PORT) || PORT <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return {
    NODE_ENV,
    PORT,
    STRIPE_SECRET_KEY
  };
}

module.exports = { loadConfig };
