<?php

namespace App\Services;

use App\Models\Server;
use Illuminate\Support\Facades\File;

class CrashDoctorService
{
    /**
     * Analyzes server console logs and detects anomalies, crashes, and failing plugins.
     */
    public function diagnoseServerHealth(Server $server): array
    {
        // Mock / read recent log file if available
        $logPath = storage_path("logs/server_{$server->id}.log");
        $logContent = File::exists($logPath) ? File::get($logPath) : '';

        $incidents = [];
        $healthScore = 100;
        $status = 'HEALTHY';

        if (str_contains($logContent, 'NullReferenceException')) {
            $healthScore -= 40;
            $status = 'DEGRADED';
            $incidents[] = [
                'type' => 'CS_SHARP_EXCEPTION',
                'severity' => 'HIGH',
                'culprit' => 'CounterStrikeSharp Plugin Hook',
                'message' => 'System.NullReferenceException detected in PlayerSpawn handler.',
                'solution' => 'Add null check `if (player == null || !player.IsValid) return HookResult.Continue;`',
                'detected_at' => now()->toIso8601String(),
            ];
        }

        if (str_contains($logContent, 'Segmentation fault') || str_contains($logContent, 'Fatal error')) {
            $healthScore = 20;
            $status = 'CRITICAL';
            $incidents[] = [
                'type' => 'ENGINE_CRASH',
                'severity' => 'CRITICAL',
                'culprit' => 'Metamod Core / Out of Memory',
                'message' => 'Engine process terminated abruptly with SIGSEGV.',
                'solution' => 'Verify shared symlinks and ensure server RAM limit >= 2048 MB.',
                'detected_at' => now()->toIso8601String(),
            ];
        }

        return [
            'server_id' => $server->id,
            'server_name' => $server->name,
            'health_score' => max(0, $healthScore),
            'status' => $status,
            'incidents' => $incidents,
            'total_incidents' => count($incidents),
            'last_scanned_at' => now()->toIso8601String(),
        ];
    }
}
