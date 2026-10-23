/**
 * Antigravity Queue Watcher
 * projects/pt_student_portal/scripts/watch_queue.js
 * 
 * Watches projects/pt_student_portal/queue/tasks.json.
 * As soon as a task with status === 'pending' is detected, prints the task details and exits immediately
 * so that Antigravity receives an instant reactive wakeup in the active session.
 */

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, '..', 'queue', 'tasks.json');

console.log('[Antigravity Watcher] Listening for new queue tasks...');

function checkQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return null;
  try {
    const content = fs.readFileSync(QUEUE_FILE, 'utf-8');
    const tasks = JSON.parse(content || '[]');
    const pending = tasks.find(t => t.status === 'pending');
    return pending || null;
  } catch (_) {
    return null;
  }
}

// First, check if there is an existing pending task
const initial = checkQueue();
if (initial) {
  console.log(`[QUEUE_EVENT:PENDING_TASK_FOUND] ID=${initial.id} UNIT=${initial.unit} PROMPT=${initial.customPrompt || ''}`);
  process.exit(0);
}

// Otherwise, poll every 500ms (timeout after 5 minutes)
const startTime = Date.now();
const interval = setInterval(() => {
  const pending = checkQueue();
  if (pending) {
    clearInterval(interval);
    console.log(`[QUEUE_EVENT:NEW_TASK_ARRIVED] ID=${pending.id} UNIT=${pending.unit} TYPE=${pending.taskType} PROMPT=${pending.customPrompt || ''}`);
    process.exit(0);
  }

  // Timeout safety after 5 minutes
  if (Date.now() - startTime > 300000) {
    clearInterval(interval);
    console.log('[Antigravity Watcher] Watcher timed out after 5 minutes.');
    process.exit(1);
  }
}, 500);
