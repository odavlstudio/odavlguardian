const { cannotReadNullUndefined } = require('./runtime/cannot-read-null-undefined.js');
const { isNotAFunction } = require('./runtime/is-not-a-function.js');
const { isNotIterable } = require('./runtime/is-not-iterable.js');
const { unexpectedTokenRuntime } = require('./runtime/unexpected-token.js');
const { maximumCallStack } = require('./runtime/maximum-call-stack.js');

const { moduleNotFoundBuild } = require('./build/module-not-found.js');
const { cannotFindModuleLiteral } = require('./build/cannot-find-module-literal.js');
const { ts2307CannotFindModule } = require('./build/ts2307.js');
const { failedToCompileLoader } = require('./build/failed-to-compile.js');

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
  // Build/Tooling
  moduleNotFoundBuild,
  cannotFindModuleLiteral,
  ts2307CannotFindModule,
  failedToCompileLoader,
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
