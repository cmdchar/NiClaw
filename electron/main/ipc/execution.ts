import { ipcMain } from 'electron';
import { executionEngine } from '../execution/engine';
import { ExecutionGraph } from '../../../shared/types/execution';

export function registerExecutionHandlers() {
  ipcMain.handle('execution:start', async (_, graph: ExecutionGraph) => {
    return await executionEngine.execute(graph);
  });

  ipcMain.handle('execution:get-trace', async (_, executionId: string) => {
    return executionEngine.getTrace(executionId);
  });
}
