<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\JobTask;
use App\Models\User;
use Illuminate\Http\Request;

class AgentGatewayController extends Controller
{
    // Outbound registration from local Client AI Agent
    public function register(Request $request)
    {
        $data = $request->validate([
            'agent_id' => 'required|string',
            'device_id' => 'required|string',
            'device_name' => 'required|string',
            'agent_token' => 'required|string',
            'os' => 'nullable|string',
            'arch' => 'nullable|string',
            'capabilities' => 'nullable|array',
        ]);

        $user = $request->user() ?? User::first();

        $agent = Agent::updateOrCreate(
            ['agent_id' => $data['agent_id']],
            [
                'user_id' => $user->id,
                'device_id' => $data['device_id'],
                'device_name' => $data['device_name'],
                'agent_token' => $data['agent_token'],
                'status' => 'ready',
                'os' => $data['os'] ?? 'windows',
                'arch' => $data['arch'] ?? 'x64',
                'capabilities' => $data['capabilities'] ?? [],
                'last_heartbeat_at' => now(),
            ]
        );

        return response()->json([
            'status' => 'registered',
            'agent' => $agent,
            'message' => 'Client AI Agent authorized successfully over persistent outbound connection.',
        ]);
    }

    // Heartbeat from Client Agent
    public function heartbeat(Request $request)
    {
        $data = $request->validate([
            'agent_id' => 'required|string',
            'status' => 'required|string',
            'cpu_usage' => 'nullable|numeric',
            'ram_usage_mb' => 'nullable|integer',
            'active_job_id' => 'nullable|string',
            'capabilities' => 'nullable|array',
        ]);

        $agent = Agent::where('agent_id', $data['agent_id'])->first();
        if ($agent) {
            $agent->update([
                'status' => $data['status'],
                'cpu_usage' => $data['cpu_usage'] ?? 0,
                'ram_usage_mb' => $data['ram_usage_mb'] ?? 0,
                'active_job_id' => $data['active_job_id'] ?? null,
                'capabilities' => $data['capabilities'] ?? $agent->capabilities,
                'last_heartbeat_at' => now(),
            ]);
        }

        // Check if there are pending jobs for this agent
        $pendingJob = JobTask::where('agent_id', $data['agent_id'])
            ->where('status', 'pending')
            ->oldest()
            ->first();

        return response()->json([
            'status' => 'acknowledged',
            'dispatch_job' => $pendingJob,
        ]);
    }

    // Client Agent submits job results
    public function submitJobResult(Request $request)
    {
        $data = $request->validate([
            'job_id' => 'required|string',
            'agent_id' => 'required|string',
            'status' => 'required|string',
            'progress' => 'nullable|integer',
            'logs' => 'nullable|array',
            'artifact' => 'nullable|array',
            'error' => 'nullable|string',
        ]);

        $job = JobTask::where('uuid', $data['job_id'])->firstOrFail();
        $job->update([
            'status' => $data['status'] === 'success' ? 'completed' : 'failed',
            'progress' => $data['progress'] ?? 100,
            'logs' => $data['logs'] ?? [],
            'result' => $data['artifact'] ?? null,
            'error' => $data['error'] ?? null,
            'finished_at' => now(),
        ]);

        return response()->json(['message' => 'Job result recorded successfully']);
    }

    // List user's connected Client AI Agents
    public function listAgents(Request $request)
    {
        $user = $request->user();
        $query = Agent::query();

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->latest()->get());
    }
}
