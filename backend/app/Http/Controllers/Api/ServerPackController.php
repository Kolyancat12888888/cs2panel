<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\Node;
use Illuminate\Http\Request;

class ServerPackController extends Controller
{
    public function index()
    {
        $packs = [
            [
                'id' => 'pack_public_classic',
                'name' => 'Public Classic 5v5 / 10v10',
                'category' => 'Competitive & Casual',
                'tagline' => 'Complete public community setup with Ranks, VIP, Skins, and Team Balance.',
                'icon' => 'Trophy',
                'badge' => 'POPULAR',
                'features' => [
                    'Levels Ranks ELO System',
                    'VIP Privileges & Custom Tag',
                    'Skins & Knife Chooser (!ws, !knife)',
                    'Anti-AFK & Camp Radar Watchdog',
                    'Auto Team Balance & Match Pauses',
                ],
                'default_map' => 'de_mirage',
                'required_ram_mb' => 2048,
                'max_players' => 20,
            ],
            [
                'id' => 'pack_retake_executes',
                'name' => 'Retake & Tactical Executes',
                'category' => 'Practice & Tactics',
                'tagline' => 'High-intensity bombsite retake practice with automatic smoke/flash setups.',
                'icon' => 'Crosshair',
                'badge' => 'COMPETITIVE',
                'features' => [
                    'Instant Bombsite Allocation (Site A / B)',
                    'Automatic Smoke & Flash Grenade Distributions',
                    'Fast Round Restarts (No freeze-time lag)',
                    'Custom Gun Round Selectors',
                ],
                'default_map' => 'de_inferno',
                'required_ram_mb' => 2048,
                'max_players' => 9,
            ],
            [
                'id' => 'pack_surf_bhop_kz',
                'name' => 'Surf, BHOP & KZ Movement Arena',
                'category' => 'Movement & Skill',
                'tagline' => 'Full movement playground with precision timers, checkpoints, and speedometer.',
                'icon' => 'Zap',
                'badge' => 'MOVEMENT',
                'features' => [
                    'Precision Tick Timer Engine',
                    'Checkpoint Teleporter (!cp, !tele)',
                    'Real-Time Speedometer HUD',
                    'NoBlock & Godmode Spawns',
                    'Custom Airaccelerate Tuning (sv_airaccelerate 150)',
                ],
                'default_map' => 'surf_utopia_v3',
                'required_ram_mb' => 2048,
                'max_players' => 24,
            ],
            [
                'id' => 'pack_ffa_deathmatch',
                'name' => 'FFA Deathmatch & Warmup Arena',
                'category' => 'Combat & Aim',
                'tagline' => 'Free-for-all aim warm-up with weapon menus and vampire HP refill on kill.',
                'icon' => 'Flame',
                'badge' => 'AIM WARMUP',
                'features' => [
                    'Instant Random Spawns with Invulnerability Shield',
                    'Weapons Selection Menu (!guns)',
                    'Vampire HP & Armor Leech on Kill',
                    'Instant Ammo Refill on Headshot',
                ],
                'default_map' => 'de_dust2',
                'required_ram_mb' => 2048,
                'max_players' => 16,
            ],
            [
                'id' => 'pack_1v1_arenas',
                'name' => '1v1 Multi-Arenas Duel Ladder',
                'category' => 'Duels & Ladders',
                'tagline' => 'Multi-arena 1v1 duels with automated ranking promotion between arenas.',
                'icon' => 'Swords',
                'badge' => 'DUEL',
                'features' => [
                    'Automated Arena 1, 2, 3... Promotion/Demotion',
                    'Weapon Round Voting (AWP, Rifle, Pistol, Knife)',
                    'Player K/D Statistics & ELO Tracking',
                    'Anti-Ghosting & Fast Duels',
                ],
                'default_map' => 'am_dust2',
                'required_ram_mb' => 2048,
                'max_players' => 16,
            ],
        ];

        return response()->json([
            'success' => true,
            'packs' => $packs,
        ]);
    }

    public function deploy(Request $request)
    {
        $validated = $request->validate([
            'pack_id' => 'required|string',
            'server_name' => 'required|string|max:100',
            'node_id' => 'required|exists:nodes,id',
            'port' => 'nullable|integer',
        ]);

        $node = Node::findOrFail($validated['node_id']);
        $allocatedPort = $validated['port'] ?? (27015 + (Server::where('node_id', $node->id)->count() * 10));

        $server = Server::create([
            'uuid' => (string)\Illuminate\Support\Str::uuid(),
            'name' => $validated['server_name'],
            'node_id' => $node->id,
            'owner_id' => $request->user()->id,
            'port' => $allocatedPort,
            'rcon_port' => $allocatedPort + 1000,
            'tv_port' => $allocatedPort + 2000,
            'default_map' => 'de_mirage',
            'game_type' => 0,
            'game_mode' => 1,
            'max_players' => 20,
            'status' => 'offline',
            'cpu_limit' => 200,
            'memory_limit_mb' => 2048,
            'disk_limit_mb' => 10240,
            'has_css' => true,
            'has_metamod' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Server Pack '{$validated['pack_id']}' provisioned successfully on port {$allocatedPort}!",
            'server' => $server,
        ], 201);
    }
}
