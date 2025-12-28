/**
 * ODAVL Guardian Usage Tracker
 * Tracks scans per month and enforces plan limits
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const USAGE_DIR = path.join(os.homedir(), '.odavl-guardian', 'usage');
const USAGE_FILE = path.join(USAGE_DIR, 'usage.json');

/**
 * Ensure usage directory exists
 */
function ensureUsageDir() {
  if (!fs.existsSync(USAGE_DIR)) {
    fs.mkdirSync(USAGE_DIR, { recursive: true });
  }
}

/**
 * Get current month key (YYYY-MM)
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Load usage data
 */
function loadUsage() {
  ensureUsageDir();
  
  if (!fs.existsSync(USAGE_FILE)) {
    return {
      currentMonth: getCurrentMonthKey(),
      scansThisMonth: 0,
      sites: [],
      totalScans: 0,
      history: {},
    };
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    
    // Reset if new month
    const currentMonth = getCurrentMonthKey();
    if (data.currentMonth !== currentMonth) {
      // Archive old month
      data.history[data.currentMonth] = {
        scans: data.scansThisMonth,
        sites: data.sites.length,
      };
      
      // Reset for new month
      data.currentMonth = currentMonth;
      data.scansThisMonth = 0;
    }
    
    return data;
  } catch (error) {
    console.error('Error loading usage data:', error.message);
    return {
      currentMonth: getCurrentMonthKey(),
      scansThisMonth: 0,
      sites: [],
      totalScans: 0,
      history: {},
    };
  }
}

/**
 * Save usage data
 */
function saveUsage(usage) {
  ensureUsageDir();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), 'utf-8');
}

/**
 * Record a scan
 */
function recordScan(url) {
  const usage = loadUsage();
  
  // Extract domain from URL
  let domain;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname;
  } catch {
    domain = url;
  }
  
  // Increment scan count
  usage.scansThisMonth += 1;
  usage.totalScans += 1;
  
  // Track unique site
  if (!usage.sites.includes(domain)) {
    usage.sites.push(domain);
  }
  
  // Record timestamp
  if (!usage.scanHistory) {
    usage.scanHistory = [];
  }
  usage.scanHistory.push({
    url,
    domain,
    timestamp: new Date().toISOString(),
  });
  
  // Keep only last 100 scans in history
  if (usage.scanHistory.length > 100) {
    usage.scanHistory = usage.scanHistory.slice(-100);
  }
  
  saveUsage(usage);
  return usage;
}

/**
 * Get current usage stats
 */
function getUsageStats() {
  return loadUsage();
}

/**
 * Get scans remaining for current plan
 */
function getScansRemaining(maxScans) {
  const usage = loadUsage();
  if (maxScans === -1) return 'Unlimited';
  return Math.max(0, maxScans - usage.scansThisMonth);
}

/**
 * Check if can perform scan
 */
function canPerformScan(maxScans) {
  if (maxScans === -1) return true; // unlimited
  const usage = loadUsage();
  return usage.scansThisMonth < maxScans;
}

/**
 * Check if can add site
 */
function canAddSite(url, maxSites) {
  if (maxSites === -1) return true; // unlimited
  
  const usage = loadUsage();
  
  // Extract domain
  let domain;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname;
  } catch {
    domain = url;
  }
  
  // If site already tracked, it's OK
  if (usage.sites.includes(domain)) {
    return true;
  }
  
  // Check if under limit
  return usage.sites.length < maxSites;
}

/**
 * Reset usage (for testing or manual reset)
 */
function resetUsage() {
  ensureUsageDir();
  const usage = {
    currentMonth: getCurrentMonthKey(),
    scansThisMonth: 0,
    sites: [],
    totalScans: 0,
    history: {},
    scanHistory: [],
  };
  saveUsage(usage);
  return usage;
}

/**
 * Get usage file path (for debugging)
 */
function getUsageFilePath() {
  return USAGE_FILE;
}

module.exports = {
  recordScan,
  getUsageStats,
  getScansRemaining,
  canPerformScan,
  canAddSite,
  resetUsage,
  getUsageFilePath,
};
