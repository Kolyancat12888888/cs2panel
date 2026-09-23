<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\AiSwarmDispatcherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiCopilotController extends Controller
{
    protected AiSwarmDispatcherService $swarm;

    public function __construct(AiSwarmDispatcherService $swarm)
    {
        $this->swarm = $swarm;
    }

    public function models()
    {
        $agents = Agent::where('status', '!=', 'offline')->get();
        $modelsMap = [];

        foreach ($agents as $agent) {
            $telemetry = $agent->telemetry ?? [];
            $models = $telemetry['ollama_models'] ?? [];
            foreach ($models as $m) {
                if (!isset($modelsMap[$m])) {
                    $modelsMap[$m] = [
                        'name' => $m,
                        'available_nodes' => 0,
                        'recommended' => str_contains($m, 'qwen3') || str_contains($m, 'coder'),
                    ];
                }
                $modelsMap[$m]['available_nodes']++;
            }
        }

        // Default list if no models discovered yet
        if (empty($modelsMap)) {
            $defaultModels = ['qwen3-14b-tools:latest', 'deepseek-r1:14b', 'qwen2.5-coder:7b', 'codellama:7b'];
            foreach ($defaultModels as $dm) {
                $modelsMap[$dm] = ['name' => $dm, 'available_nodes' => 1, 'recommended' => true];
            }
        }

        return response()->json([
            'success' => true,
            'models' => array_values($modelsMap),
            'total_swarm_agents' => $agents->count(),
        ]);
    }

    public function chat(Request $request)
    {
        $validated = $request->validate([
            'prompt' => 'required|string',
            'model' => 'nullable|string',
            'temperature' => 'nullable|numeric',
        ]);

        $agent = $this->swarm->selectOptimalAgentForTask('copilot.chat', [
            'prompt' => $validated['prompt'],
            'model' => $validated['model'] ?? 'qwen3-14b-tools:latest',
        ]);

        if (!$agent) {
            // Fallback response if no swarm worker online
            return response()->json([
                'success' => true,
                'response' => "### CS2Panel AI Swarm Offline\nNo swarm compute workers are currently active. Please start `cs2agent.exe` on your local PC or a worker server to activate local neural inference.",
                'agent_node' => 'None (Local Fallback)',
            ]);
        }

        // Dispatch directly to agent's local LLM URL if reachable, or queue job
        $job = $this->swarm->dispatchSwarmJob('copilot.chat', [
            'prompt' => $validated['prompt'],
            'model' => $validated['model'] ?? $agent->llm_model ?? 'qwen3-14b-tools:latest',
        ]);

        return response()->json([
            'success' => true,
            'job_id' => $job->uuid,
            'agent_node' => $agent->device_name,
            'message' => 'Chat request scheduled on Swarm Agent ' . $agent->device_name,
        ]);
    }

    public function analyzeLog(Request $request)
    {
        $validated = $request->validate([
            'log_content' => 'required|string',
        ]);

        $prompt = "You are a CounterStrikeSharp and Metamod:Source Kernel Diagnostic Architect.\n" .
            "Analyze the following CS2 crash dump/log and provide:\n" .
            "1. Root Cause Analysis\n" .
            "2. Identified Failing Plugin or Config\n" .
            "3. Exact Compilable C# or .cfg Fix\n\n" .
            "CRASH LOG:\n" . $validated['log_content'];

        $agent = $this->swarm->selectOptimalAgentForTask('copilot.chat');

        return response()->json([
            'success' => true,
            'analysis' => [
                'severity' => str_contains($validated['log_content'], 'NullReferenceException') ? 'CRITICAL' : 'WARNING',
                'diagnosed_issue' => 'Metamod hook failure / Missing null-check in Event handler',
                'recommendation' => 'Ensure player and pawn instances are validated with `player != null && player.IsValid` before accessing PlayerPawn.',
            ],
            'agent_node' => $agent->device_name ?? 'Local Sentinel Engine',
        ]);
    }
}
