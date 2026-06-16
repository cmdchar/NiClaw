import { TaskEventStore } from '../task-event-store';

async function runStressTest() {
  console.log('Starting Persistence Stress Test...');
  const store = new TaskEventStore();

  // Wait for initialization
  await new Promise(r => setTimeout(r, 1000));

  const numTasks = 50;
  const eventsPerTask = 20;

  let epermErrors = 0;
  let corruptionErrors = 0;
  let otherErrors = 0;

  // Intercept console.warn and console.error to track EPERMs and Integrity checks
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('code=EPERM')) {
      epermErrors++;
    }
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('Integrity check failed')) {
      corruptionErrors++;
    } else {
      otherErrors++;
    }
    originalError(...args);
  };

  const tasks: string[] = [];

  console.log(`Creating ${numTasks} tasks concurrently...`);
  const createPromises = Array.from({ length: numTasks }).map(async (_, i) => {
    const task = store.createTask(`Stress Task ${i}`, 'Do something', 'Project A');
    tasks.push(task.id);
  });

  await Promise.all(createPromises);

  console.log(`Adding ${eventsPerTask} events to each task concurrently (${numTasks * eventsPerTask} total events)...`);
  
  const eventPromises: Promise<void>[] = [];
  
  for (const taskId of tasks) {
    for (let i = 0; i < eventsPerTask; i++) {
      eventPromises.push(
        new Promise(resolve => {
          setTimeout(() => {
            try {
              store.addEvent(taskId, 'status_change', `Event ${i} for task ${taskId}`);
              // Randomly interleave log updates and status updates
              if (i % 5 === 0) store.addLog(taskId, `Log ${i}`);
              if (i % 10 === 0) store.updateTaskStatus(taskId, 'running');
            } catch (err) {
              console.error('Error adding event:', err);
            }
            resolve();
          }, Math.random() * 50); // Add random jitter to maximize concurrency overlap
        })
      );
    }
  }

  await Promise.all(eventPromises);

  // Wait a bit for pending queues to flush
  console.log('Waiting for write queues to flush...');
  await new Promise(r => setTimeout(r, 3000));

  // Verification
  console.log('--- Stress Test Results ---');
  console.log(`Expected Tasks: ${numTasks}, Actual: ${store.getAllTasks().length}`);
  
  let totalEvents = 0;
  let totalLogs = 0;
  let eventsLost = 0;

  for (const taskId of tasks) {
    const taskEvents = store.getEvents(taskId);
    totalEvents += taskEvents.length;
    
    const t = store.getTask(taskId);
    if (t) {
      totalLogs += t.logs.length;
      if (taskEvents.length < eventsPerTask) {
        eventsLost += (eventsPerTask - taskEvents.length);
      }
    }
  }

  console.log(`Total Events Recorded: ${totalEvents} (Expected >= ${numTasks * eventsPerTask})`);
  console.log(`Total Logs Recorded: ${totalLogs}`);
  console.log(`EPERM errors encountered: ${epermErrors} (Handled by retry)`);
  console.log(`Corruption errors: ${corruptionErrors}`);
  console.log(`Lost events: ${eventsLost}`);
  
  // Re-read tasks.json to ensure it parses
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(require('../../../utils/paths').getDataDir(), 'command-center', 'tasks.json');
  
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    JSON.parse(raw);
    console.log('tasks.json parsed successfully.');
  } catch (err) {
    console.error('tasks.json is corrupted!', err);
    corruptionErrors++;
  }

  console.log('---------------------------');
  if (corruptionErrors === 0 && eventsLost === 0) {
    console.log('SUCCESS! Persistence layer is hardened and stable.');
  } else {
    console.error('FAILED! Persistence layer has issues.');
  }

  // Restore console
  console.warn = originalWarn;
  console.error = originalError;
  
  process.exit(corruptionErrors > 0 || eventsLost > 0 ? 1 : 0);
}

runStressTest().catch(console.error);
