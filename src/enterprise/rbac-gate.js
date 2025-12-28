/**
 * Phase C: RBAC Gate Enforcement
 * Single shared gate for all sensitive commands
 * Ensures no bypass paths exist
 */

const { requirePermission } = require('./rbac');
const { logAudit, AUDIT_ACTIONS } = require('./audit-logger');

/**
 * Definitive list of all sensitive commands and their required permissions
 */
const SENSITIVE_COMMANDS = {
  // Scan operations
  'scan:run': {
    action: AUDIT_ACTIONS.SCAN_RUN,
    description: 'Execute scan',
  },
  'scan:view': {
    action: AUDIT_ACTIONS.SCAN_VIEW,
    description: 'View scan results',
  },

  // Live scheduling
  'live:start': {
    action: AUDIT_ACTIONS.LIVE_START,
    description: 'Start live scheduler',
  },
  'live:stop': {
    action: AUDIT_ACTIONS.LIVE_STOP,
    description: 'Stop live scheduler',
  },

  // Site management
  'site:add': {
    action: AUDIT_ACTIONS.SITE_ADD,
    description: 'Add site',
  },
  'site:remove': {
    action: AUDIT_ACTIONS.SITE_REMOVE,
    description: 'Remove site',
  },

  // User management
  'user:add': {
    action: AUDIT_ACTIONS.USER_ADD,
    description: 'Add user',
  },
  'user:remove': {
    action: AUDIT_ACTIONS.USER_REMOVE,
    description: 'Remove user',
  },

  // Recipe management
  'recipe:import': {
    action: AUDIT_ACTIONS.RECIPE_IMPORT,
    description: 'Import recipe',
  },
  'recipe:export': {
    action: AUDIT_ACTIONS.RECIPE_EXPORT,
    description: 'Export recipe',
  },
  'recipe:remove': {
    action: 'recipe:remove',
    description: 'Remove recipe',
  },

  // Export operations
  'export:pdf': {
    action: AUDIT_ACTIONS.EXPORT_PDF,
    description: 'Export PDF report',
  },

  // Plan operations
  'plan:upgrade': {
    action: AUDIT_ACTIONS.PLAN_UPGRADE,
    description: 'Upgrade plan',
  },

  // Audit operations
  'audit:view': {
    action: 'audit:view',
    description: 'View audit logs',
  },
};

/**
 * Gate function: Check permission and log action
 * This is the SINGLE entry point for all sensitive commands
 * 
 * @param {string} permission - Permission string (e.g., 'scan:run', 'user:add')
 * @param {Object} context - Optional context info for audit log
 * @throws {Error} If permission denied
 */
function enforceGate(permission, context = {}) {
  // Validate permission exists in sensitive commands
  if (!SENSITIVE_COMMANDS[permission]) {
    throw new Error(`Unknown sensitive command: ${permission}`);
  }

  // Enforce RBAC
  requirePermission(permission, SENSITIVE_COMMANDS[permission].description);

  // Log to audit trail (immediately after successful permission check)
  const cmdInfo = SENSITIVE_COMMANDS[permission];
  logAudit(cmdInfo.action, {
    permission,
    description: cmdInfo.description,
    ...context,
  });

  // Return context for caller to use
  return {
    permission,
    action: cmdInfo.action,
    description: cmdInfo.description,
  };
}

/**
 * Get all sensitive commands (for testing/documentation)
 */
function listSensitiveCommands() {
  return Object.entries(SENSITIVE_COMMANDS).map(([permission, info]) => ({
    permission,
    ...info,
  }));
}

/**
 * Check if a permission is sensitive (gated)
 */
function isSensitiveCommand(permission) {
  return permission in SENSITIVE_COMMANDS;
}

module.exports = {
  enforceGate,
  listSensitiveCommands,
  isSensitiveCommand,
  SENSITIVE_COMMANDS,
};
