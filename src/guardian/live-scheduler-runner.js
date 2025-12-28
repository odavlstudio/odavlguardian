/**
 * Live Scheduler Runner
 * Detached background process that executes schedules on time.
 *
 * Each tick invokes the existing CLI path: "guardian live <url> [--preset ...]"
 * to reuse baseline/drift/alerts and plan/RBAC enforcement without refactoring.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const SCHED_DIR = path.join(os.homedir(), '.odavl-guardian', 'scheduler');
const STATE_FILE = path.join(SCHED_DIR, 'schedules.json');

// Active timers per schedule id
const timers = new Map();

function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    if (!data.schedules) data.schedules = [];
    return data;
  } catch {
    return { schedules: [] };
  }
}

function saveState(state) {
  const data = {
    schedules: state.schedules || [],
    runner: state.runner || null,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function scheduleRun(entry) {
  // Clear existing timer
  const existing = timers.get(entry.id);
  if (existing) {
    clearTimeout(existing);
    timers.delete(entry.id);
  }

  if (entry.status !== 'running') {
    return;
  }

  const now = Date.now();
  const nextTs = entry.nextRunAt ? Date.parse(entry.nextRunAt) : (now + entry.intervalMinutes * 60 * 1000);
  const delay = Math.max(0, nextTs - now);

  const t = setTimeout(() => {
    executeLive(entry).then(() => {
      // Update times and reschedule
      const state = loadState();
      const s = state.schedules.find(x => x.id === entry.id);
      if (s) {
        const finished = Date.now();
        s.lastRunAt = new Date(finished).toISOString();
        s.nextRunAt = new Date(finished + s.intervalMinutes * 60 * 1000).toISOString();
        saveState(state);
        scheduleRun(s);
      }
    }).catch(() => {
      // On failure, still advance nextRunAt
      const state = loadState();
      const s = state.schedules.find(x => x.id === entry.id);
      if (s) {
        const finished = Date.now();
        s.lastRunAt = new Date(finished).toISOString();
        s.nextRunAt = new Date(finished + s.intervalMinutes * 60 * 1000).toISOString();
        saveState(state);
        scheduleRun(s);
      }
    });
  }, delay);

  timers.set(entry.id, t);
}

function executeLive(entry) {
  return new Promise((resolve) => {
    // Spawn the existing CLI path in a child process.
    const nodeExec = process.execPath;
    const binPath = path.join(__dirname, '..', '..', 'bin', 'guardian.js');
    const args = ['live', '--url', entry.url];
    if (entry.preset) {
      args.push('--preset', entry.preset);
    }

    const child = spawn(nodeExec, [binPath, ...args], {
      stdio: 'ignore',
      windowsHide: true,
    });

    child.on('exit', () => resolve());
    child.on('error', () => resolve());
  });
}

function reconcile() {
  const state = loadState();
  // For every running schedule, ensure a timer exists
  for (const s of state.schedules) {
    if (s.status === 'running') {
      scheduleRun(s);
    } else {
      const t = timers.get(s.id);
      if (t) {
        clearTimeout(t);
        timers.delete(s.id);
      }
    }
  }
}

function startWatch() {
  try {
    fs.watch(STATE_FILE, { persistent: true }, () => {
      reconcile();
    });
  } catch {
    // Fallback: periodic reconcile
    setInterval(reconcile, 5000);
  }
}

function main() {
  // Initial reconcile and watch for changes
  reconcile();
  startWatch();
}

main();
