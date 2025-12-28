/**
 * Recipe Failure Analysis & Reporting
 * 
 * Integrates recipe failures into the decision engine and breakage intelligence.
 */

/**
 * Analyze a recipe execution failure
 * 
 * @param {Object} recipeResult - Result from executeRecipeRuntime
 * @returns {Object} Intelligence object for reporting
 */
function analyzeRecipeFailure(recipeResult) {
  if (recipeResult.success) {
    return null; // No failure to analyze
  }

  const { failedStep, failureReason, steps, recipe, recipeName, baseUrl } = recipeResult;
  
  // Categorize failure type
  let failureType = 'EXECUTION';
  let severity = 'CRITICAL';
  
  if (failureReason.includes('not found')) {
    failureType = 'ELEMENT_NOT_FOUND';
  } else if (failureReason.includes('not visible')) {
    failureType = 'ELEMENT_NOT_VISIBLE';
  } else if (failureReason.includes('Goal not reached')) {
    failureType = 'GOAL_FAILURE';
  } else if (failureReason.includes('Runtime error')) {
    failureType = 'RUNTIME_ERROR';
    severity = 'CRITICAL';
  } else if (failureReason.includes('Recipe not found')) {
    failureType = 'RECIPE_NOT_FOUND';
    severity = 'INFO';
  }

  const stepsFailed = steps.filter(s => !s.success).length;
  const stepsTotal = steps.length;

  return {
    id: `recipe-${recipe}`,
    name: `Recipe: ${recipeName}`,
    outcome: 'FAILURE',
    failureType,
    severity,
    baseUrl,
    recipeId: recipe,
    recipeName,
    failedStepId: failedStep,
    failedStepNumber: failedStep ? parseInt(failedStep.split('-').pop(), 10) : null,
    failureReason,
    stepProgress: {
      completed: stepsTotal - stepsFailed,
      total: stepsTotal,
      percentage: Math.round(((stepsTotal - stepsFailed) / stepsTotal) * 100)
    },
    humanReadableError: formatRecipeError(recipeName, failedStep, failureReason, stepsTotal),
    source: 'recipe-runtime',
    behavioralSignals: [
      {
        signal: 'RECIPE_EXECUTION_FAILED',
        message: failureReason,
        severity: severity
      }
    ]
  };
}

/**
 * Format recipe error for human readability
 */
function formatRecipeError(recipeName, failedStep, failureReason, totalSteps) {
  const stepNum = failedStep ? parseInt(failedStep.split('-').pop(), 10) + 1 : 0;
  
  return `Recipe '${recipeName}' failed at step ${stepNum} of ${totalSteps}: ${failureReason}`;
}

/**
 * Convert recipe failure to attempt-like structure for reporting compatibility
 */
function recipeFailureToAttempt(recipeResult) {
  const intelligence = analyzeRecipeFailure(recipeResult);
  if (!intelligence) return null;

  return {
    attemptId: intelligence.id,
    attemptName: intelligence.name,
    outcome: 'FAILURE',
    error: intelligence.failureReason,
    failureType: intelligence.failureType,
    severity: intelligence.severity,
    baseUrl: intelligence.baseUrl,
    riskCategory: 'TRUST', // Recipes are trust/integrity checks
    source: 'recipe',
    validators: [
      {
        id: 'recipe-step-validation',
        name: 'Recipe Step Execution',
        passed: false,
        evidence: recipeResult.evidence
      }
    ],
    behavioralSignals: intelligence.behavioralSignals
  };
}

/**
 * Integrate recipe failures into market impact analysis
 */
function assessRecipeImpact(recipeResult) {
  if (recipeResult.success) {
    return {
      hasRisk: false,
      riskScore: 0,
      severity: 'INFO',
      message: `Recipe '${recipeResult.recipeName}' passed successfully`
    };
  }

  const intelligence = analyzeRecipeFailure(recipeResult);
  
  // Recipe failures always elevate risk
  let riskScore = 70; // Base critical risk
  let severity = 'CRITICAL';

  // Adjust based on step completion
  const progress = intelligence.stepProgress.percentage;
  if (progress === 0) {
    riskScore = 90; // Failed on first step — very bad
  } else if (progress < 50) {
    riskScore = 80; // Failed early
  } else {
    riskScore = 60; // Failed late but still indicates issue
  }

  // Type-specific scoring
  if (intelligence.failureType === 'GOAL_FAILURE') {
    riskScore = Math.max(riskScore - 10, 50); // Goal failure less severe than execution error
    severity = 'WARNING';
  }

  return {
    hasRisk: true,
    riskScore,
    severity,
    message: intelligence.humanReadableError,
    recipe: intelligence.recipeId,
    failureType: intelligence.failureType,
    stepProgress: intelligence.stepProgress
  };
}

module.exports = {
  analyzeRecipeFailure,
  formatRecipeError,
  recipeFailureToAttempt,
  assessRecipeImpact
};
