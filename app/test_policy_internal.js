require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
});
const { policyEngine } = require('./electron/services/orchestrator/policy-engine');

async function runTests() {
  console.log("=== Policy Engine Internal Tests ===");

  // 1. Valid task pe niclaw-app
  console.log("\n1. Valid task pe niclaw-app");
  const test1 = await policyEngine.evaluateExecutionPlan("task-1", "niclaw-app", {
    files: ["C:/Server/niclaw/app/src/main.ts"],
    commands: ["npm run lint"]
  });
  console.log("Result:", test1);

  // 2. Modificare .env
  console.log("\n2. Modificare .env");
  const test2 = await policyEngine.evaluateExecutionPlan("task-2", "niclaw-app", {
    files: ["C:/Server/niclaw/app/.env"]
  });
  console.log("Result:", test2);

  // 3. Git push
  console.log("\n3. Git push");
  const test3 = await policyEngine.evaluateExecutionPlan("task-3", "niclaw-app", {
    commands: ["git push origin main"]
  });
  console.log("Result:", test3);

  // 4. Diff cu 20 fișiere
  console.log("\n4. Diff cu 20 fișiere");
  const arr = Array.from({length: 20}, (_, i) => `file${i}.ts`);
  const test4 = await policyEngine.evaluateExecutionPlan("task-4", "niclaw-app", {
    files: arr
  });
  console.log("Result:", test4);

  // 5. Rollback request
  console.log("\n5. Rollback request");
  const test5 = await policyEngine.requiresApproval('rollback');
  console.log("Result: Requires Approval?", test5);

  const status = await policyEngine.getStatus();
  console.log("\nPolicy Status:", status);
}

runTests().catch(console.error);
