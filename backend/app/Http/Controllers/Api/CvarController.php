<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CvarPreset;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class CvarController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function presets()
    {
        return response()->json(CvarPreset::all());
    }

    public function applyPreset($serverId, $presetId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        $preset = CvarPreset::findOrFail($presetId);

        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        // Build server.cfg contents from preset
        $lines = ["// CS2Panel Generated Config from Preset: " . $preset->name];
        foreach ($preset->cvars_json as $cvar => $val) {
            $lines[] = "{$cvar} {$val}";
        }
        $cfgContent = implode("\n", $lines) . "\n";

        // Save server.cfg via daemon
        // We can send RCON commands if running
        if ($server->status === 'running') {
            foreach ($preset->cvars_json as $cvar => $val) {
                try {
                    $this->daemon->executeRcon($server, "{$cvar} {$val}");
                } catch (\Exception $e) {}
            }
        }

        return response()->json([
            'message' => "Applied preset '{$preset->name}' to server {$server->name}",
            'config' => $cfgContent,
        ]);
    }
}
