import path from 'path';

// MOCK ELECTRON FOR CLI SCRIPT
const mockElectron = {
    app: {
        getPath: (name: string) => {
            if (name === 'userData') return 'C:\\Users\\nicus\\AppData\\Roaming\\niclaw';
            if (name === 'home') return 'C:\\Users\\nicus';
            return 'C:\\Users\\nicus\\AppData\\Roaming\\niclaw';
        },
        getAppPath: () => 'C:\\Server\\niclaw\\app'
    },
    ipcMain: { handle: () => {}, on: () => {} }
};
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request: string) {
    if (request === 'electron') {
        return mockElectron;
    }
    return originalRequire.apply(this, arguments);
};

async function run() {
    const { taskOrchestrator } = require('../electron/services/orchestrator/task-orchestrator');
    const { taskEventStore } = require('../electron/services/orchestrator/task-event-store');
    
    // Subscribe to logs to show what's happening
    taskEventStore.on('task_log', (ev: any) => {
        console.log(`[LOG] ${ev.log}`);
    });
    taskEventStore.on('task_status_changed', (ev: any) => {
        console.log(`[STATUS] => ${ev.status}`);
    });

    console.log("Submitting Phase 3A-R task...");
    const task = await taskOrchestrator.submitTask(
        'Phase 3A-R',
        'Adaugă un text static mic în Android Dashboard care spune: Remote Claude Code active',
        'niclaw-app',
        'remote-claude-code'
    );
    console.log("Task created:", task);
    
    // Process it right away
    await taskOrchestrator.processTask(task.id);
    
    // For remote-claude-code, it stops at waiting_approval, we must approve it
    const statusAfterProcess = taskEventStore.getTask(task.id)?.status;
    if (statusAfterProcess === 'waiting_approval') {
        console.log("Approving task to trigger execution...");
        await taskOrchestrator.approveTask(task.id);
    }
    
    const finalTask = taskEventStore.getTask(task.id);
    console.log("FINAL TASK STATUS:", finalTask?.status);
    console.log("FINAL TASK FILES CHANGED:", finalTask?.filesChanged);
    console.log("FINAL TASK DIFF PREVIEW:");
    console.log(finalTask?.auditLogs?.find(l => l.action === 'diff_generated')?.details?.diff);
}

run().catch(console.error);
