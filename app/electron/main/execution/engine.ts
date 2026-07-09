import { ExecutionGraph, ExecutionTrace, NodeExecutionState } from '../../../shared/types/execution';
import { logger } from '../../utils/logger';
import { getGatewayManager } from '../../bootstrap/service-registry';
import { telemetryEngine } from '../telemetry/engine';

export class ExecutionEngine {
  private activeExecutions: Map<string, ExecutionTrace> = new Map();

  async execute(graph: ExecutionGraph): Promise<ExecutionTrace> {
    const executionId = `exec_${Date.now()}`;
    getGatewayManager().emit('notification', {
      type: 'info',
      title: 'Execution Started',
      message: `Graph ${graph.metadata?.name || graph.id} execution started`,
      timestamp: Date.now(),
    });

    const trace: ExecutionTrace = {
      graphId: graph.id,
      executionId,
      startTime: Date.now(),
      status: 'running',
      nodeStates: {},
      totalTokens: 0,
      totalCost: 0,
    };

    this.activeExecutions.set(executionId, trace);
    logger.info(`[ExecutionEngine] Starting AI OS Graph: ${graph.metadata.name} (${executionId})`);

    try {
      // Find trigger nodes to start execution
      const startNodes = graph.nodes.filter(n => n.type === 'trigger');
      if (startNodes.length === 0) {
        throw new Error('No trigger nodes found in graph');
      }

      // Execute all triggers in parallel
      await Promise.all(startNodes.map(node => this.executeNode(node.id, graph, trace)));

      trace.status = 'completed';
      trace.endTime = Date.now();
    } catch (error) {
      trace.status = 'failed';
      trace.endTime = Date.now();
      getGatewayManager().emit('notification', {
        type: 'error',
        title: 'Execution Failed',
        message: `Graph ${graph.metadata?.name || graph.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      });
      logger.error(`[ExecutionEngine] Graph execution failed: ${String(error)}`);
    }

    return trace;
  }

  private async executeNode(nodeId: string, graph: ExecutionGraph, trace: ExecutionTrace, inputData?: any) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Check if node is already being executed or completed to prevent infinite loops without explicit logic
    if (trace.nodeStates[nodeId] && trace.nodeStates[nodeId].status === 'running') {
      logger.warn(`[ExecutionEngine] Circular execution detected at node: ${nodeId}`);
      return;
    }

    const state: NodeExecutionState = {
      nodeId,
      status: 'running',
      startTime: Date.now(),
      retryCount: 0,
      inputData,
    };
    trace.nodeStates[nodeId] = state;

    try {
      logger.info(`[ExecutionEngine] [${trace.executionId}] Executing ${node.type} node: ${node.label}`);

      switch (node.type) {
        case 'agent':
          await this.handleAgentNode(node, state);
          break;
        case 'action':
          await this.handleActionNode(node, state);
          break;
        case 'condition':
          await this.handleConditionNode(node, state, graph, trace);
          return; // Condition node handles its own downstream triggers
        case 'knowledge':
          await this.handleKnowledgeNode(node, state);
          break;
        case 'trigger':
          state.outputData = inputData || { event: 'triggered' };
          state.status = 'completed';
          break;
        default:
          state.status = 'completed';
          state.outputData = {};
      }

      state.status = 'completed';
      state.endTime = Date.now();

      // Trigger all downstream nodes
      const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
      await Promise.all(outgoingEdges.map(edge =>
        this.executeNode(edge.target, graph, trace, state.outputData)
      ));

    } catch (error) {
      state.status = 'failed';
      state.error = String(error);
      logger.error(`[ExecutionEngine] Node ${nodeId} failed: ${state.error}`);

      // If a node fails, we might want to halt the branch or the whole graph
      throw error;
    }
  }

  private async handleAgentNode(node: any, state: NodeExecutionState) {
    // Advanced Delegation Logic
    const agentRole = node.config.role || 'worker';
    const prompt = node.config.prompt || state.inputData?.content || 'Process the current context';

    logger.info(`[ExecutionEngine] Delegating to ${agentRole} agent: ${node.label}`);

    const response = await getGatewayManager().rpc<any>('chat.send', {
      agentId: node.config.agentId || 'main',
      message: prompt,
      metadata: {
        orchestrationType: 'AI_OS_GRAPH',
        nodeId: node.id,
        role: agentRole
      }
    });

    state.outputData = {
      content: response.text || response.content,
      usage: response.usage,
      agentId: response.agentId
    };

    // Log Telemetry
    if (response.usage) {
      telemetryEngine.logMetric({
        timestamp: Date.now(),
        type: 'token_usage',
        value: response.usage.total_tokens || 0,
        metadata: { nodeId: node.id, agentId: response.agentId }
      });
    }
  }

  private async handleActionNode(node: any, state: NodeExecutionState) {
    if (node.config.command) {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      logger.info(`[ExecutionEngine] Running system action: ${node.config.command}`);
      const { stdout, stderr } = await execAsync(node.config.command);
      state.outputData = { stdout, stderr };
    } else {
      state.outputData = { success: true };
    }
  }

  private async handleConditionNode(node: any, state: NodeExecutionState, graph: ExecutionGraph, trace: ExecutionTrace) {
    const expression = node.config.expression || 'true';
    // Simple eval for demo, in production use a safe sandbox or logic parser
    let result = false;
    try {
      const context = state.inputData || {};
      result = !!(new Function('context', `with(context) { return ${expression}; }`)(context));
    } catch (e) {
      logger.error(`[ExecutionEngine] Condition evaluation failed: ${String(e)}`);
    }

    state.outputData = { result };
    state.status = 'completed';
    state.endTime = Date.now();

    // Condition nodes use source handles "true" and "false"
    const targetEdges = graph.edges.filter(e =>
      e.source === node.id &&
      (e.sourceHandle === String(result) || (!e.sourceHandle && result))
    );

    await Promise.all(targetEdges.map(edge =>
      this.executeNode(edge.target, graph, trace, state.inputData)
    ));
  }

  private async handleKnowledgeNode(node: any, state: NodeExecutionState) {
    const query = node.config.query || state.inputData?.content;
    logger.info(`[ExecutionEngine] Querying Knowledge Graph: ${query}`);

    // In a real AI OS, this would hit a local Vector DB or Knowledge Graph
    // For now, we simulate a retrieval
    state.outputData = {
      retrieved: true,
      context: `Context retrieved for: ${query}. (Mocked AI OS Knowledge Layer)`,
    };
  }

  getTrace(executionId: string): ExecutionTrace | undefined {
    return this.activeExecutions.get(executionId);
  }
}

export const executionEngine = new ExecutionEngine();
