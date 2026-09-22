<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Node;
use App\Models\Server;
use App\Models\Plugin;
use App\Models\CvarPreset;
use App\Models\WorkshopMap;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@cs2panel.local'],
            [
                'name' => 'Root Administrator',
                'password' => Hash::make('admin123'),
                'steam_id' => '76561198000000001',
                'role' => 'admin',
                'server_limit' => 50,
                'avatar' => 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
            ]
        );

        $demoUser = User::firstOrCreate(
            ['email' => 'player@cs2panel.local'],
            [
                'name' => 'CS2 Server Owner',
                'password' => Hash::make('user123'),
                'steam_id' => '76561198000000002',
                'role' => 'user',
                'server_limit' => 3,
                'avatar' => 'https://avatars.steamstatic.com/d5a57cbde2088f17a9446be01f0fa236dbebb034_full.jpg',
            ]
        );

        // 2. Default Master Node
        $node = Node::firstOrCreate(
            ['name' => 'Node 01 - Frankfurt Master'],
            [
                'fqdn' => 'node01.cs2panel.local',
                'ip_address' => '127.0.0.1',
                'daemon_port' => 8080,
                'sftp_port' => 2022,
                'daemon_secret' => 'cs2panel-daemon-secret-key',
                'master_path' => '/opt/cs2panel/master_cs2',
                'is_active' => true,
                'total_ram_mb' => 32768,
                'total_disk_gb' => 500,
                'cpu_cores' => 16,
                'location' => 'EU-Frankfurt (High-Frequency AMD EPYC)',
            ]
        );

        // 3. Default Demo Servers
        Server::firstOrCreate(
            ['name' => 'CS2Panel Public Competitive 5v5 #1'],
            [
                'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                'node_id' => $node->id,
                'owner_id' => $admin->id,
                'description' => 'Official 128-subtick Competitive Server with CounterStrikeSharp & MatchZy',
                'port' => 27015,
                'rcon_port' => 27015,
                'rcon_password' => 'superrconpass123',
                'tv_port' => 27020,
                'default_map' => 'de_mirage',
                'game_type' => 0,
                'game_mode' => 1,
                'max_players' => 12,
                'status' => 'offline',
                'cpu_limit' => 200,
                'memory_limit_mb' => 4096,
                'disk_limit_mb' => 10240,
                'has_css' => true,
                'has_metamod' => true,
                'fastdl_enabled' => true,
                'auto_restart_on_crash' => true,
            ]
        );

        Server::firstOrCreate(
            ['name' => 'CS2Panel FFA Deathmatch & Retakes #2'],
            [
                'uuid' => 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                'node_id' => $node->id,
                'owner_id' => $demoUser->id,
                'description' => 'Fast-paced FFA Multi-CFG Deathmatch with automated spawn protection',
                'port' => 27025,
                'rcon_port' => 27025,
                'rcon_password' => 'deathmatchrconpass',
                'tv_port' => 27030,
                'default_map' => 'de_dust2',
                'game_type' => 1,
                'game_mode' => 2,
                'max_players' => 18,
                'status' => 'offline',
                'cpu_limit' => 200,
                'memory_limit_mb' => 4096,
                'disk_limit_mb' => 10240,
                'has_css' => true,
                'has_metamod' => true,
                'fastdl_enabled' => true,
                'auto_restart_on_crash' => true,
            ]
        );

        // 4. Featured Plugins Marketplace
        $plugins = [
            [
                'name' => 'MatchZy (Competitive & Scrim Engine)',
                'slug' => 'matchzy',
                'category' => 'competitive',
                'description' => 'Advanced match management system for CS2 with automated knife rounds, pauses, backup round recovery, and stats webhooks.',
                'author' => 'shobhit-pathak',
                'version' => '0.8.4',
                'download_url' => 'https://github.com/shobhit-pathak/MatchZy/releases/latest/download/MatchZy.zip',
                'github_repo' => 'shobhit-pathak/MatchZy',
                'requires_css' => true,
                'requires_metamod' => true,
                'is_featured' => true,
                'install_count' => 1420,
            ],
            [
                'name' => 'Weapon Paints & Skins (WS/Knife)',
                'slug' => 'cs2-weapon-paints',
                'category' => 'customization',
                'description' => 'Allows players to choose custom skins, knife models, gloves, agent skins, and custom stickers on your server.',
                'author' => 'CS2-Community',
                'version' => '2.1.0',
                'download_url' => 'https://github.com/Nereziel/cs2-WeaponPaints/releases/latest/download/WeaponPaints.zip',
                'github_repo' => 'Nereziel/cs2-WeaponPaints',
                'requires_css' => true,
                'requires_metamod' => true,
                'is_featured' => true,
                'install_count' => 3890,
            ],
            [
                'name' => 'CS2-VIP System',
                'slug' => 'cs2-vip-core',
                'category' => 'management',
                'description' => 'Modular VIP privilege system with double jump, HP bonuses, custom tags, grenade kits, and auto-give armor.',
                'author' => 'partiusfabaa',
                'version' => '1.5.2',
                'download_url' => 'https://github.com/partiusfabaa/cs2-vip-core/releases/latest/download/cs2-vip.zip',
                'github_repo' => 'partiusfabaa/cs2-vip-core',
                'requires_css' => true,
                'requires_metamod' => true,
                'is_featured' => true,
                'install_count' => 2100,
            ],
            [
                'name' => 'RockTheVote (RTV & MapChooser)',
                'slug' => 'cs2-rockthevote',
                'category' => 'gameplay',
                'description' => 'End of map voting, !rtv, !nominate, !timeleft and !nextmap commands with smooth CS2 center screen menus.',
                'author' => 'abnerfs',
                'version' => '1.8.0',
                'download_url' => 'https://github.com/abnerfs/cs2-rockthevote/releases/latest/download/rockthevote.zip',
                'github_repo' => 'abnerfs/cs2-rockthevote',
                'requires_css' => true,
                'requires_metamod' => true,
                'is_featured' => true,
                'install_count' => 4500,
            ],
            [
                'name' => 'CS2 Retakes Engine',
                'slug' => 'cs2-retakes',
                'category' => 'gamemode',
                'description' => 'Instant bomb site retakes gamemode with randomized spawns, weapon allocation, and automatic site rotation.',
                'author' => 'CS2-Retakes-Dev',
                'version' => '2.0.1',
                'download_url' => 'https://github.com/B3none/cs2-retakes/releases/latest/download/retakes.zip',
                'github_repo' => 'B3none/cs2-retakes',
                'requires_css' => true,
                'requires_metamod' => true,
                'is_featured' => true,
                'install_count' => 1890,
            ],
            [
                'name' => 'Kento RankMe CS2 Statistics',
                'slug' => 'kento-rankme',
                'category' => 'analytics',
                'description' => 'Real-time player ELO ranking, score tracking, MVP points, headshot percentage, and web leaderboard integration.',
                'author' => 'Kento-Team',
                'version' => '3.0.0',
                'download_url' => 'https://github.com/Kento-Team/CS2-RankMe/releases/latest/download/RankMe.zip',
                'github_repo' => 'Kento-Team/CS2-RankMe',
                'requires_css' => true,
                'requires_metamod' => true,
                'is_featured' => true,
                'install_count' => 2950,
            ],
        ];

        foreach ($plugins as $p) {
            Plugin::firstOrCreate(['slug' => $p['slug']], $p);
        }

        // 5. Cvar Presets
        $presets = [
            [
                'name' => 'Valve Official 5v5 Competitive',
                'game_mode' => 'competitive',
                'description' => 'Standard tournament rules: 12 rounds per half, 1.92 round time, 40s C4 timer, friendly fire enabled.',
                'is_default' => true,
                'cvars_json' => [
                    'mp_roundtime' => '1.92',
                    'mp_roundtime_defuse' => '1.92',
                    'mp_c4timer' => '40',
                    'mp_freezetime' => '15',
                    'mp_buytime' => '20',
                    'mp_maxrounds' => '24',
                    'mp_overtime_enable' => '1',
                    'mp_overtime_maxrounds' => '6',
                    'mp_friendlyfire' => '1',
                    'sv_cheats' => '0',
                ],
            ],
            [
                'name' => 'Fast FFA Deathmatch',
                'game_mode' => 'deathmatch',
                'description' => 'Instant respawn, all weapons available anywhere, HP refill on kill.',
                'is_default' => false,
                'cvars_json' => [
                    'mp_roundtime' => '10',
                    'mp_freezetime' => '0',
                    'mp_respawn_on_death_ct' => '1',
                    'mp_respawn_on_death_t' => '1',
                    'mp_teammates_are_enemies' => '1',
                    'sv_cheats' => '0',
                ],
            ],
            [
                'name' => 'Practice & Grenade Warmup',
                'game_mode' => 'practice',
                'description' => 'Infinite ammo, grenade trajectory camera, god mode, bot kick, sv_cheats 1.',
                'is_default' => false,
                'cvars_json' => [
                    'sv_cheats' => '1',
                    'mp_roundtime' => '60',
                    'sv_infinite_ammo' => '1',
                    'sv_grenade_trajectory_prac_pipreview' => '1',
                    'sv_showimpacts' => '1',
                    'mp_limitteams' => '0',
                    'mp_autoteambalance' => '0',
                    'mp_restartgame' => '1',
                ],
            ],
        ];

        foreach ($presets as $pr) {
            CvarPreset::firstOrCreate(['name' => $pr['name']], $pr);
        }

        // 6. Workshop Maps
        $maps = [
            ['workshop_id' => 3070196885, 'title' => 'de_dust2', 'map_name' => 'de_dust2', 'preview_url' => 'https://community.cloudflare.steamstatic.com/public/images/apps/730/de_dust2.jpg', 'game_mode_tags' => ['defusal', 'competitive']],
            ['workshop_id' => 3070196886, 'title' => 'de_mirage', 'map_name' => 'de_mirage', 'preview_url' => 'https://community.cloudflare.steamstatic.com/public/images/apps/730/de_mirage.jpg', 'game_mode_tags' => ['defusal', 'competitive']],
            ['workshop_id' => 3070196887, 'title' => 'de_inferno', 'map_name' => 'de_inferno', 'preview_url' => 'https://community.cloudflare.steamstatic.com/public/images/apps/730/de_inferno.jpg', 'game_mode_tags' => ['defusal', 'competitive']],
            ['workshop_id' => 3070196888, 'title' => 'de_nuke', 'map_name' => 'de_nuke', 'preview_url' => 'https://community.cloudflare.steamstatic.com/public/images/apps/730/de_nuke.jpg', 'game_mode_tags' => ['defusal', 'competitive']],
            ['workshop_id' => 3070196889, 'title' => 'de_anubis', 'map_name' => 'de_anubis', 'preview_url' => 'https://community.cloudflare.steamstatic.com/public/images/apps/730/de_anubis.jpg', 'game_mode_tags' => ['defusal', 'competitive']],
            ['workshop_id' => 3070196890, 'title' => 'aim_botz CS2', 'map_name' => 'aim_botz', 'preview_url' => 'https://community.cloudflare.steamstatic.com/public/images/apps/730/aim_botz.jpg', 'game_mode_tags' => ['training', 'aim']],
        ];

        foreach ($maps as $m) {
            WorkshopMap::firstOrCreate(['workshop_id' => $m['workshop_id']], $m);
        }
    }
}
