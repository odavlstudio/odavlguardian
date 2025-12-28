/**
 * Phase 12.1: Recipe Engine
 * Core recipe execution and validation system
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate recipe schema
 */
function validateRecipe(recipe) {
  const errors = [];
  
  if (!recipe.id || typeof recipe.id !== 'string') {
    errors.push('Recipe must have a string id');
  }
  
  if (!recipe.name || typeof recipe.name !== 'string') {
    errors.push('Recipe must have a string name');
  }
  
  if (!recipe.platform || typeof recipe.platform !== 'string') {
    errors.push('Recipe must have a platform (shopify|saas|landing)');
  }
  
  if (!['shopify', 'saas', 'landing'].includes(recipe.platform)) {
    errors.push(`Invalid platform: ${recipe.platform}. Must be shopify, saas, or landing`);
  }
  
  if (!recipe.intent || typeof recipe.intent !== 'string') {
    errors.push('Recipe must have an intent string');
  }
  
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    errors.push('Recipe must have at least one step');
  }
  
  if (recipe.steps && !recipe.steps.every(s => typeof s === 'string')) {
    errors.push('All recipe steps must be strings');
  }
  
  if (!recipe.expectedGoal || typeof recipe.expectedGoal !== 'string') {
    errors.push('Recipe must have an expectedGoal');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get recipe complexity score
 */
function getComplexityScore(recipe) {
  const stepCount = recipe.steps.length;
  
  if (stepCount <= 3) return 'simple';
  if (stepCount <= 7) return 'moderate';
  return 'complex';
}

/**
 * Get estimated execution time (seconds)
 */
function getEstimatedTime(recipe) {
  const stepCount = recipe.steps.length;
  const complexity = getComplexityScore(recipe);
  
  // Base time per step
  let baseTime = 5;
  
  if (complexity === 'complex') {
    baseTime = 8;
  } else if (complexity === 'moderate') {
    baseTime = 6;
  }
  
  return stepCount * baseTime;
}

/**
 * Create recipe execution context
 */
function createExecutionContext(recipe, baseUrl, options = {}) {
  return {
    recipe,
    baseUrl,
    startedAt: new Date(),
    steps: [],
    state: {
      currentUrl: baseUrl,
      pageTitle: null,
      pageUrl: null,
      lastElement: null,
      data: options.data || {}
    },
    options,
    success: false,
    error: null,
    completedAt: null,
    duration: 0
  };
}

/**
 * Record step execution
 */
function recordStep(context, stepIndex, action, result) {
  const step = {
    index: stepIndex,
    action,
    result,
    timestamp: new Date().toISOString(),
    duration: 0
  };
  
  context.steps.push(step);
  return step;
}

/**
 * Mark execution complete
 */
function markComplete(context, success, error = null) {
  context.success = success;
  context.error = error;
  context.completedAt = new Date();
  context.duration = Math.round(
    (context.completedAt - context.startedAt) / 1000
  );
  return context;
}

/**
 * Generate human-readable recipe summary
 */
function getRecipeSummary(recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    platform: recipe.platform,
    intent: recipe.intent,
    stepCount: recipe.steps.length,
    complexity: getComplexityScore(recipe),
    estimatedTime: getEstimatedTime(recipe),
    expectedGoal: recipe.expectedGoal
  };
}

/**
 * Format recipe for display
 */
function formatRecipe(recipe) {
  const summary = getRecipeSummary(recipe);
  
  let output = '';
  output += `📋 ${summary.name}\n`;
  output += `   Platform: ${summary.platform}\n`;
  output += `   Intent: ${summary.intent}\n`;
  output += `   Complexity: ${summary.complexity}\n`;
  output += `   Steps: ${summary.stepCount}\n`;
  output += `   Estimated Time: ${summary.estimatedTime}s\n`;
  output += `   Expected Goal: ${summary.expectedGoal}\n`;
  
  if (recipe.notes) {
    output += `   Notes: ${recipe.notes}\n`;
  }
  
  output += `\n   Steps:\n`;
  recipe.steps.forEach((step, i) => {
    output += `     ${i + 1}. ${step}\n`;
  });
  
  return output;
}

module.exports = {
  validateRecipe,
  getComplexityScore,
  getEstimatedTime,
  createExecutionContext,
  recordStep,
  markComplete,
  getRecipeSummary,
  formatRecipe
};
