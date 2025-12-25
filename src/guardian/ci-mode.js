function isCiMode() {
  const ci = process.env.CI;
  const gha = process.env.GITHUB_ACTIONS;
  const guardianCi = process.env.GUARDIAN_CI;

  const normalize = (value) => String(value || '').toLowerCase();
  const isTrueish = (value) => {
    const v = normalize(value);
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  };

  return isTrueish(ci) || isTrueish(gha) || isTrueish(guardianCi);
}

module.exports = { isCiMode };
