const { cannotReadNullUndefined } = require('./runtime/cannot-read-null-undefined.js');
const { isNotAFunction } = require('./runtime/is-not-a-function.js');
const { isNotIterable } = require('./runtime/is-not-iterable.js');
const { unexpectedTokenRuntime } = require('./runtime/unexpected-token.js');
const { maximumCallStack } = require('./runtime/maximum-call-stack.js');

// NOTE: Removed build/* requires to prevent production crash on missing modules

const { invalidHookCall } = require('./react/invalid-hook-call.js');
const { tooManyReRenders } = require('./react/too-many-rerenders.js');
const { objectNotValidChild } = require('./react/object-not-valid-child.js');
const { cannotUpdateDuringRender } = require('./react/cannot-update-during-render.js');
const { useEffectDepsIssue } = require('./react/useeffect-deps.js');

const { processEnvMissing } = require('./node/process-env-missing.js');
const { eaddrinuse } = require('./node/eaddrinuse.js');
const { importOutsideModule } = require('./node/import-outside-module.js');
const { requireNotDefined } = require('./node/require-not-defined.js');

const signatures = [
  // Runtime
  cannotReadNullUndefined,
  isNotAFunction,
  isNotIterable,
  unexpectedTokenRuntime,
  maximumCallStack,
  // Build/Tooling (temporarily disabled in production due to missing modules)
  // React
  invalidHookCall,
  tooManyReRenders,
  objectNotValidChild,
  cannotUpdateDuringRender,
  useEffectDepsIssue,
  // Node
  processEnvMissing,
  eaddrinuse,
  importOutsideModule,
  requireNotDefined
];

module.exports = { signatures };
