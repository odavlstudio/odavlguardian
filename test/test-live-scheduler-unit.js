const assert = require('assert');
const { createSchedule, stopSchedule, listSchedules, loadState, saveState } = require('./src/guardian/live-scheduler');

// Reset test state
(() => {
  const state = { schedules: [], runner: null };
  saveState(state);
})();

// Create schedule
const s = createSchedule({ url: 'http://example.com', preset: 'landing', intervalMinutes: 1 });
assert.ok(s.id && typeof s.id === 'string');
assert.strictEqual(s.status, 'running');
assert.strictEqual(s.preset, 'landing');
assert.strictEqual(s.intervalMinutes, 1);

// List schedules
const all = listSchedules();
assert.ok(Array.isArray(all));
assert.ok(all.find(x => x.id === s.id));

// Stop schedule
const stopped = stopSchedule(s.id);
assert.strictEqual(stopped.status, 'stopped');

// Verify persistence
const persisted = loadState();
const entry = persisted.schedules.find(x => x.id === s.id);
assert.strictEqual(entry.status, 'stopped');

console.log('✅ Scheduler unit tests passed');
process.exit(0);
