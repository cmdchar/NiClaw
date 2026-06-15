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
    const { hermesAdapter } = require('../electron/services/orchestrator/hermes-adapter');
    
    // Subscribe to logs to show what's happening
    taskEventStore.on('task_log', (ev: any) => {
        console.log(`[LOG] ${ev.log}`);
    });
    taskEventStore.on('task_status_changed', (ev: any) => {
        console.log(`[STATUS] => ${ev.status}`);
    });

    console.log("Submitting Phase 4.1 task...");
    const task = await taskOrchestrator.submitTask(
        'Phase 4.1',
        'Adaugă un text static mic în Android Dashboard care spune: Hermes + Remote Claude active. Modifică doar mobile/android-kotlin/app/src/main/res/layout/activity_dashboard.xml și mobile/android-kotlin/app/src/main/java/com/jarvis/DashboardActivity.kt.',
        'niclaw-app',
        'remote-claude-code'
    );
    console.log("Task created:", task);
    
    // Process it right away
    await taskOrchestrator.processTask(task.id);
    
    // For Phase 4.1, it stops at waiting_approval after planning, we must approve it
    let statusAfterProcess = taskEventStore.getTask(task.id)?.status;
    if (statusAfterProcess === 'waiting_approval') {
        console.log("Approving task to trigger execution...");
        await taskOrchestrator.approveTask(task.id);
    }
    
    const finalTask = taskEventStore.getTask(task.id);
    console.log("\n====== FINAL TASK STATUS ======");
    console.log("Status:", finalTask?.status);
    console.log("Executor:", finalTask?.executor);
    
    const hHealth = await hermesAdapter.healthCheck();
    console.log("\n====== HERMES TELEMETRY ======");
    console.log("Status:", hHealth.status);
    console.log("Planning Transport:", hHealth.planningTransport);
    console.log("Fallback Used:", hHealth.fallbackUsed);

    console.log("\n====== FINAL TASK FILES CHANGED ======");
    const generatedDiff = finalTask?.auditLogs?.find((l: any) => l.action === 'diff_generated');
    const executionCompleted = finalTask?.auditLogs?.find((l: any) => l.action === 'execution_completed');
    
    console.log("Files:", generatedDiff?.details?.filesChanged || executionCompleted?.details?.filesChanged);
    console.log("Exit Code:", executionCompleted?.details?.exitCode);
    console.log("Duration:", executionCompleted?.details?.durationHuman);

    console.log("\n====== DIFF PREVIEW ======");
    console.log(generatedDiff?.details?.diff);
}

run().catch(console.error);
