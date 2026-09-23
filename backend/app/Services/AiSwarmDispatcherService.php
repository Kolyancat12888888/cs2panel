<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\JobTask;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class AiSwarmDispatcherService
{
    /**
     * Scores all online agents and selects the optimal worker for a given task.
     */
    public function selectOptimalAgentForTask(string $taskType, array $payload = []): ?Agent
    {
        // 1. Get all agents active within the last 15 seconds
        $onlineThreshold = now()->subSeconds(15);
        $agents = Agent::where('last_seen_at', '>=', $onlineThreshold)
            ->where('status', '!=', 'offline')
            ->get();

        if ($agents->isEmpty()) {
            // Fallback: any agent marked ready
            $agents = Agent::where('status', 'ready')->get();
        }

        if ($agents->isEmpty()) {
            return null;
        }

        $scoredAgents = [];

        foreach ($agents as $agent) {
            $telemetry = $agent->telemetry ?? [];
            $gpu = $telemetry['gpu'] ?? [];
            $cpuUsage = (float)($telemetry['cpu_usage'] ?? $agent->cpu_usage ?? 0);
            $ramUsageMB = (int)($telemetry['ram_usage_mb'] ?? $agent->ram_usage_mb ?? 0);
            $ramTotalMB = (int)($telemetry['ram_total_mb'] ?? 16384);
            $vramFreeMB = (int)($gpu['vram_free_mb'] ?? 0);
            $hasGpu = (bool)($gpu['has_gpu'] ?? false);
            $isThrottled = ($agent->status === 'throttled');

            // Severe penalty if throttled by Power Governor
            if ($isThrottled) {
                $score = 5.0;
            } else {
                $cpuScore = max(0, 100 - $cpuUsage) * 0.3;
                $ramFreeRatio = $ramTotalMB > 0 ? max(0, 1 - ($ramUsageMB / $ramTotalMB)) : 0.5;
                $ramScore = $ramFreeRatio * 100 * 0.2;
                $gpuScore = $hasGpu ? min(50, ($vramFreeMB / 500)) : 10.0;

                // Penalty for active jobs in flight
                $queuePenalty = ($agent->status === 'busy' ? 30.0 : 0.0);

                $score = $cpuScore + $ramScore + $gpuScore - $queuePenalty;
            }

            $scoredAgents[] = [
                'agent' => $agent,
                'score' => $score,
            ];
        }

        // Sort descending by score
        usort($scoredAgents, fn($a, $b) => $b['score'] <=> $a['score']);

        return $scoredAgents[0]['agent'] ?? null;
    }

    /**
     * Dispatches a job with automatic swarm routing and migration tracking.
     */
    public function dispatchSwarmJob(string $type, array $payload, ?int $projectId = null): JobTask
    {
        $selectedAgent = $this->selectOptimalAgentForTask($type, $payload);

        $job = JobTask::create([
            'uuid' => 'swarm_job_' . bin2hex(random_bytes(10)),
            'type' => $type,
            'agent_id' => $selectedAgent?->id,
            'project_id' => $projectId,
            'payload' => $payload,
            'status' => 'pending',
            'progress' => 0,
            'logs' => "Job queued into Decentralized AI Swarm. Target Node: " . ($selectedAgent->device_name ?? 'Auto-Dispatch Queue'),
        ]);

        return $job;
    }

    /**
     * Checks for dead or unresponsive agents and migrates their active tasks.
     */
    public function performSwarmFailoverMigration(): int
    {
        $deadThreshold = now()->subSeconds(20);
        $deadAgents = Agent::where('last_seen_at', '<', $deadThreshold)
            ->where('status', 'busy')
            ->get();

        $migratedCount = 0;

        foreach ($deadAgents as $deadAgent) {
            $deadAgent->update(['status' => 'offline']);

            $stuckJobs = JobTask::where('agent_id', $deadAgent->id)
                ->whereIn('status', ['pending', 'processing'])
                ->get();

            foreach ($stuckJobs as $stuckJob) {
                // Find next available healthy worker
                $newWorker = $this->selectOptimalAgentForTask($stuckJob->type, $stuckJob->payload ?? []);
                if ($newWorker && $newWorker->id !== $deadAgent->id) {
                    $stuckJob->update([
                        'agent_id' => $newWorker->id,
                        'status' => 'pending',
                        'logs' => $stuckJob->logs . "\n[SWARM FAILOVER] Agent " . $deadAgent->device_name . " became unresponsive. Task migrated to " . $newWorker->device_name . " at " . now()->toDateTimeString(),
                    ]);
                    $migratedCount++;
                    Log::warning("[Swarm Failover] Migrated Job {$stuckJob->uuid} from {$deadAgent->device_name} to {$newWorker->device_name}");
                }
            }
        }

        return $migratedCount;
    }
}
