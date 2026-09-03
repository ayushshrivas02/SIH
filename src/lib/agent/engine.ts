import { AgentTools } from './tools';
import { AgentPlanner, AgentPlan } from './planner';
import { AIProviderManager } from '@/lib/ai/manager';
import { prisma } from '@/lib/db';

export class AgentEngine {
  static async runTask(taskId: string, input: string) {
    try {
      let task = await prisma.task.findUnique({ where: { id: taskId }, include: { steps: true } });
      if (!task) throw new Error('Task not found');
      if (task.status === 'CANCELED' || task.status === 'COMPLETED' || task.status === 'FAILED') return;
      
      let context = '';
      let plan: AgentPlan;
      
      // If task is waiting for approval and user clicked approve, status is set to IN_PROGRESS.
      // We need to fetch the existing plan if we are resuming.
      const planStep = task.steps.find(s => s.action === 'Plan Generated');
      if (planStep && planStep.result) {
        plan = JSON.parse(planStep.result);
        context = `Task: ${plan.taskDescription}\n\nExecution History:\n`;
        // Build history from previous steps
        const executionSteps = task.steps.filter(s => s.action.startsWith('Executed:'));
        executionSteps.forEach(s => context += `${s.action}\nResult: ${s.result}\n---\n`);
      } else {
        await prisma.task.update({ where: { id: taskId }, data: { status: 'IN_PROGRESS' } });
        await prisma.taskStep.create({ data: { taskId, action: 'Planning', status: 'COMPLETED', result: 'Generating execution plan...' } });
        plan = await AgentPlanner.createPlan(input);
        
        await prisma.taskStep.create({
          data: { taskId, action: 'Plan Generated', status: 'COMPLETED', result: JSON.stringify(plan, null, 2) }
        });
        
        context = `Task: ${plan.taskDescription}\n\nExecution History:\n`;
      }

      // Automatically select provider based on classification
      const taskCategory = plan.taskClassification || 'AGENT';
      const ai = await AIProviderManager.getProviderForTask(taskCategory as any);
      
      let targetModel = undefined;
      if (ai.getModels) {
        const availableModels = await ai.getModels();
        const modelNames = availableModels.map(m => m.name);
        if (modelNames.length === 0) {
          if (ai.id === 'ollama') throw new Error('No models are installed in Ollama.');
        } else {
          targetModel = modelNames[0];
        }
      }
      if (targetModel && 'setModel' in ai) {
         (ai as any).setModel?.(targetModel);
      }
      const health = await ai.healthCheck();
      if (health.status !== 'CONNECTED') {
        throw new Error(`AI Provider (${ai.name}) is unavailable: ${health.error || 'Unknown error'}`);
      }

      const finalModel = (ai as any).model || 'unknown';

      let stepIndex = 0;
      let iterations = 0;
      const MAX_ITERATIONS = 10;
      let replanned = false;
      let stepRetryCount = 0;

      while (stepIndex < plan.steps.length && iterations < MAX_ITERATIONS) {
        iterations++;
        task = await prisma.task.findUnique({ where: { id: taskId } }) as any;
        if (!task || task.status === 'CANCELED') return;

        const currentStep = plan.steps[stepIndex];
        


        const dbStep = await prisma.taskStep.create({
          data: { taskId, action: `Executing: ${currentStep.goal}`, status: 'PENDING' }
        });

        // Agent selects parameters based on context
        const availableToolsStr = JSON.stringify(AgentTools.getAvailableTools(), null, 2);
        const systemPrompt = `You are an autonomous agent executing a workflow.
Current Goal: ${currentStep.goal}
Suggested Tool: ${currentStep.requiredTool || 'None'}
Available Tools Definitions:
${availableToolsStr}

Context History:
${context}

You must execute this step. If a tool is required, provide the parameters exactly as described in the tool definition. You MUST choose a tool from the Available Tools list. If the Suggested Tool is invalid or failed previously, pick the closest matching Available Tool or use ExecuteCode.
Respond ONLY with a valid JSON object matching this schema:
{
  "tool": "ToolName",
  "parameters": { "param1": "value" },
  "reasoning": "Why you chose these parameters"
}`;

        try {
          const start = Date.now();
          let decision;
          try {
            decision = await ai.generateStructuredOutput({
              schema: {},
              prompt: systemPrompt + '\nWhat parameters should we use for the required tool?\n'
            });
          } catch(e) {
             decision = { tool: currentStep.requiredTool, parameters: currentStep.inputArguments || {}, reasoning: 'Fallback due to parse error' };
          }

          // Execute Tool
          let toolResult = { success: true, result: 'No tool required' };
          if (decision.tool && decision.tool !== 'None') {
            toolResult = await AgentTools.executeTool(decision.tool, decision.parameters || {}, taskId);
          }

          await prisma.auditLog.create({
            data: {
              action: 'AGENT_TOOL_EXECUTED',
              details: `Task: ${taskId}, Tool: ${decision.tool}, Model: ${finalModel}, Latency: ${Date.now() - start}ms, Success: ${toolResult.success}`
            }
          });

          // Observation phase
          const observationPrompt = `You just executed a tool.
Goal: ${currentStep.goal}
Tool Output: ${toolResult.result}

Analyze the output. Did it succeed in achieving the goal?
Respond ONLY with a valid JSON object:
{
  "status": "CONTINUE" | "RETRY" | "REPLAN",
  "reason": "Explain your decision"
}`;
          
          const obsResponse = await ai.chat([
            { role: 'system', content: observationPrompt },
            { role: 'user', content: 'Evaluate the output.' }
          ]);
          
          let obsDecision = { status: 'CONTINUE', reason: 'Fallback' };
          try {
             const cleanedObs = obsResponse.replace(/```json/g, '').replace(/```/g, '').trim();
             obsDecision = JSON.parse(cleanedObs);
          } catch(e) {}

          context += `Step: ${currentStep.goal}\nTool: ${decision.tool}\nResult: ${toolResult.result}\nObservation: ${obsDecision.reason}\n---\n`;

          await prisma.taskStep.update({
            where: { id: dbStep.id },
            data: {
              status: toolResult.success ? 'COMPLETED' : 'FAILED',
              result: `Tool: ${decision.tool}\nOutput: ${toolResult.result}\nDecision: ${obsDecision.status}`
            }
          });

          if (obsDecision.status === 'CONTINUE') {
            stepIndex++;
            stepRetryCount = 0;
          } else if (obsDecision.status === 'RETRY') {
            stepRetryCount++;
            if (stepRetryCount > 2) {
              obsDecision.status = 'REPLAN';
              obsDecision.reason = 'Max retries exceeded for this step.';
            } else {
              continue;
            }
          }

          if (obsDecision.status === 'REPLAN') {
             replanned = true;
             await prisma.taskStep.create({
               data: { taskId, action: 'Replanning', status: 'COMPLETED', result: `Replanning triggered because: ${obsDecision.reason}` }
             });
             // Generate a new plan from remaining context
             const newPlanStr = await ai.chat([{ role: 'system', content: 'You are the planner.' }, { role: 'user', content: `The task is ${input}. Here is what happened so far: ${context}. Generate a new AgentPlan JSON (taskClassification, taskDescription, steps array with id, goal, description, requiredTool, expectedOutput, dependencies) to finish the task.` }]);
             try {
                const cleanedNew = newPlanStr.replace(/```json/g, '').replace(/```/g, '').trim();
                plan = JSON.parse(cleanedNew);
                stepIndex = 0; // restart new plan
                stepRetryCount = 0;
                await prisma.taskStep.create({
                  data: { taskId, action: 'New Plan Generated', status: 'COMPLETED', result: JSON.stringify(plan, null, 2) }
                });
             } catch (e) {
                // If replan fails, just continue to next step of old plan
                stepIndex++;
                stepRetryCount = 0;
             }
          }

        } catch (error: any) {
          await prisma.taskStep.update({
            where: { id: dbStep.id },
            data: { status: 'FAILED', result: `Agent engine error: ${error.message}` }
          });
          throw error;
        }
      }

      if (iterations >= MAX_ITERATIONS) {
         await prisma.task.update({ where: { id: taskId }, data: { status: 'FAILED', result: `Max iterations (${MAX_ITERATIONS}) reached. Loop protection engaged.` } });
         return;
      }

      // Verification Step
      await prisma.taskStep.create({ data: { taskId, action: 'Verification Started', status: 'PENDING' } });
      const verifyPrompt = `You are the verifier. Review the entire execution history and ensure the original user request was fully satisfied.
Original Request: ${input}
History:
${context}

Did we succeed? Are all deliverables created? Are calculations correct?
Provide a JSON response:
{
  "verified": true/false,
  "summary": "Final answer or reason for failure"
}`;
      
      const verifyResponse = await ai.chat([{ role: 'system', content: 'You are a strict verification module.' }, { role: 'user', content: verifyPrompt }]);
      let verification = { verified: true, summary: 'Verified' };
      try {
         const cleanedVer = verifyResponse.replace(/```json/g, '').replace(/```/g, '').trim();
         verification = JSON.parse(cleanedVer);
      } catch(e) {}

      await prisma.taskStep.create({
        data: { taskId, action: 'Verification Result', status: verification.verified ? 'COMPLETED' : 'FAILED', result: verification.summary }
      });

      await prisma.task.update({
        where: { id: taskId },
        data: { status: verification.verified ? 'COMPLETED' : 'FAILED', result: verification.summary }
      });

      await prisma.auditLog.create({
        data: {
          action: 'AGENT_TASK_FINISHED',
          details: `Task: ${taskId}, Verified: ${verification.verified}, Iterations: ${iterations}, Replanned: ${replanned}`
        }
      });

    } catch (e: any) {
      console.error('Agent Loop Error:', e);
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'FAILED', result: `Fatal error: ${e.message}` }
      });
    }
  }
}

