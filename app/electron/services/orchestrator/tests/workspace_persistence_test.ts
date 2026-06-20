import { TaskEventStore } from '../task-event-store';

async function runTest() {
  console.log('Initializing Store 1...');
  const store1 = new TaskEventStore();
  
  // wait for init
  await new Promise(r => setTimeout(r, 1000));

  const task = store1.createTask('Test task', 'Make a test', '/tmp');
  console.log('Created Task:', task.id);

  const ws = store1.createWorkspaceForTask(task.id);
  console.log('Created Workspace:', ws.id, ws.status);
  console.log('Workspace events on creation:', ws.events.length, 'Type:', ws.events[0]?.type);

  // Wait to allow safeWrite to flush
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n--- Simulating Reload ---');
  const store2 = new TaskEventStore();
  
  // wait for init
  await new Promise(r => setTimeout(r, 1000));

  const reloadedTask = store2.getTask(task.id);
  console.log('Reloaded Task Title:', reloadedTask?.title);

  const reloadedWs = store2.getWorkspace(ws.id);
  if (!reloadedWs) {
    console.error('FAIL: Workspace not found after reload!');
    process.exit(1);
  }

  console.log('Reloaded Workspace ID:', reloadedWs.id);
  console.log('Reloaded Workspace events:', reloadedWs.events.length, 'Type:', reloadedWs.events[0]?.type);

  if (reloadedWs.events[0]?.type === 'workspace.created') {
    console.log('SUCCESS: Workspace and workspace.created event persisted correctly.');
  } else {
    console.error('FAIL: Event mismatch or missing.');
    process.exit(1);
  }
  process.exit(0);
}

runTest().catch(e => console.error(e));
