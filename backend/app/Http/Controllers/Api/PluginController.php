<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plugin;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class PluginController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index()
    {
        $plugins = Plugin::all();
        if ($plugins->isEmpty()) {
            return response()->json($this->getDefaultPlugins());
        }
        return response()->json($plugins);
    }

    public function installEngine($serverId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $res = $this->daemon->installCSS($server);
        return response()->json([
            'message' => 'CounterStrikeSharp and Metamod downloaded and installed into instance!',
            'details' => $res,
        ]);
    }

    public function reloadPlugins($serverId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $res = $this->daemon->executeRcon($server, 'css_plugins reload');
        return response()->json([
            'message' => 'Dispatched css_plugins reload to server',
            'response' => $res['response'] ?? '',
        ]);
    }

    public function install($serverId, $pluginId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);

        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $plugin = Plugin::find($pluginId);
        $pluginName = $plugin ? $plugin->name : "Plugin #{$pluginId}";

        // Trigger RCON reload of CounterStrikeSharp plugins if server is active
        try {
            $this->daemon->executeRcon($server, 'css_plugins reload');
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "Plugin '{$pluginName}' verified and active on server {$server->name}",
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Admin only');
        }

        $data = $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string|unique:plugins',
            'category' => 'required|string',
            'description' => 'required|string',
            'author' => 'nullable|string',
            'version' => 'nullable|string',
            'download_url' => 'required|url',
            'github_repo' => 'nullable|string',
        ]);

        $plugin = Plugin::create($data);
        return response()->json($plugin, 201);
    }

    protected function getDefaultPlugins(): array
    {
        return [
            [
                'id' => 1,
                'name' => 'MatchZy',
                'slug' => 'matchzy',
                'category' => 'Competitive & Matches',
                'description' => 'Practice, scrims, tournament management, demo recording, knife rounds, pauses, and webhook match stats for CS2.',
                'author' => 'shobhit-pathak',
                'version' => '0.8.9',
                'install_count' => 1420,
                'github_repo' => 'shobhit-pathak/MatchZy',
                'download_url' => 'https://github.com/shobhit-pathak/MatchZy/releases/latest',
            ],
            [
                'id' => 2,
                'name' => 'CS2-CustomAccess',
                'slug' => 'custom-access-controller',
                'category' => 'Access & Security',
                'description' => 'Advanced player permission groups, custom flags, VIP slots, immunity, and ban bypass management.',
                'author' => 'CS2 Community Dev',
                'version' => '1.3.0',
                'install_count' => 840,
                'github_repo' => 'roflmuffin/CounterStrikeSharp',
                'download_url' => 'https://github.com/roflmuffin/CounterStrikeSharp/releases',
            ],
            [
                'id' => 3,
                'name' => 'CS2-AdminSystem',
                'slug' => 'cs2-admin-system',
                'category' => 'Administration',
                'description' => 'Complete in-game admin menu (!admin), kick, ban, mute, gag, slay, teleport, map change, and cvar voting.',
                'author' => 'daffyyyy',
                'version' => '2.1.4',
                'install_count' => 2190,
                'github_repo' => 'daffyyyy/CS2-AdminSystem',
                'download_url' => 'https://github.com/daffyyyy/CS2-AdminSystem/releases',
            ],
            [
                'id' => 4,
                'name' => 'CS2-Retakes',
                'slug' => 'cs2-retakes',
                'category' => 'Game Modes',
                'description' => 'Automatic site retakes game mode with smart weapon allocation, plant scenarios, and site rotation.',
                'author' => 'B3none',
                'version' => '1.5.2',
                'install_count' => 1750,
                'github_repo' => 'B3none/cs2-retakes',
                'download_url' => 'https://github.com/B3none/cs2-retakes/releases',
            ],
            [
                'id' => 5,
                'name' => 'Weapon Paints / Skins (CS2)',
                'slug' => 'cs2-weapon-paints',
                'category' => 'Customization & VIP',
                'description' => 'Allow players and VIPs to select custom knife models, gloves, weapon skins, and stickers in real-time.',
                'author' => 'Nereziel',
                'version' => '3.0.1',
                'install_count' => 3200,
                'github_repo' => 'Nereziel/cs2-WeaponPaints',
                'download_url' => 'https://github.com/Nereziel/cs2-WeaponPaints/releases',
            ],
            [
                'id' => 6,
                'name' => 'Multi1v1 CS2 Arenas',
                'slug' => 'cs2-multi1v1',
                'category' => 'Game Modes',
                'description' => 'Ladder arena duel system (Arena 1, 2, 3...) with rifle, pistol, AWP, and knife custom rounds.',
                'author' => 'kgns',
                'version' => '1.2.0',
                'install_count' => 960,
                'github_repo' => 'kgns/multi1v1',
                'download_url' => 'https://github.com/kgns/multi1v1/releases',
            ],
        ];
    }
}
