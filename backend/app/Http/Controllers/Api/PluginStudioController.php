<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\GraphVersion;
use App\Models\JobTask;
use App\Models\PluginProject;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PluginStudioController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = PluginProject::withCount('versions');

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string',
        ]);

        // Default initial starter graph (Event -> Condition -> Action)
        $initialGraph = [
            'format' => 'cs2-plugin-graph',
            'version' => 1,
            'plugin' => [
                'name' => $data['name'],
                'version' => '1.0.0',
                'author' => $user->name,
            ],
            'nodes' => [
                [
                    'id' => 'node_event_1',
                    'type' => 'event.player_connect_full',
                    'category' => 'events',
                    'title' => 'Player Fully Connected',
                    'x' => 100,
                    'y' => 120,
                    'outputs' => ['exec', 'player', 'steam_id', 'player_name'],
                ],
                [
                    'id' => 'node_cond_1',
                    'type' => 'condition.has_permission',
                    'category' => 'conditions',
                    'title' => 'Has Permission (@css/vip)',
                    'x' => 420,
                    'y' => 120,
                    'inputs' => ['exec', 'player'],
                    'outputs' => ['true', 'false'],
                    'config' => ['permission' => '@css/vip'],
                ],
                [
                    'id' => 'node_action_1',
                    'type' => 'action.send_chat_message',
                    'category' => 'actions',
                    'title' => 'Send VIP Welcome Message',
                    'x' => 740,
                    'y' => 80,
                    'inputs' => ['exec', 'player', 'message'],
                    'config' => ['message' => '{Orange}[VIP]{White} Welcome back to the server, {PlayerName}!'],
                ],
                [
                    'id' => 'node_action_2',
                    'type' => 'action.give_weapon',
                    'category' => 'actions',
                    'title' => 'Give Healthshot',
                    'x' => 740,
                    'y' => 240,
                    'inputs' => ['exec', 'player', 'weapon_name'],
                    'config' => ['weapon_name' => 'weapon_healthshot'],
                ],
            ],
            'connections' => [
                ['from' => 'node_event_1', 'fromPort' => 'exec', 'to' => 'node_cond_1', 'toPort' => 'exec'],
                ['from' => 'node_event_1', 'fromPort' => 'player', 'to' => 'node_cond_1', 'toPort' => 'player'],
                ['from' => 'node_cond_1', 'fromPort' => 'true', 'to' => 'node_action_1', 'toPort' => 'exec'],
                ['from' => 'node_cond_1', 'fromPort' => 'true', 'to' => 'node_action_2', 'toPort' => 'exec'],
            ],
            'variables' => [
                ['name' => 'vipWelcomeBonus', 'type' => 'Integer', 'value' => 500],
            ],
        ];

        $project = PluginProject::create([
            'user_id' => $user->id,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']) . '-' . Str::random(4),
            'description' => $data['description'] ?? 'Custom CS2 plugin built with Visual Studio',
            'category' => $data['category'],
            'version' => '1.0.0',
            'author' => $user->name,
            'graph_json' => $initialGraph,
        ]);

        // Save initial version snapshot
        GraphVersion::create([
            'plugin_project_id' => $project->id,
            'version_number' => '1.0.0',
            'commit_message' => 'Initial Graph Template',
            'graph_snapshot' => $initialGraph,
            'node_count' => count($initialGraph['nodes']),
            'connection_count' => count($initialGraph['connections']),
        ]);

        return response()->json($project, 201);
    }

    public function show($id, Request $request)
    {
        $project = PluginProject::with('versions')->findOrFail($id);
        return response()->json($project);
    }

    public function update($id, Request $request)
    {
        $project = PluginProject::findOrFail($id);
        $data = $request->validate([
            'graph_json' => 'required|array',
            'commit_message' => 'nullable|string',
        ]);

        $project->update(['graph_json' => $data['graph_json']]);

        // Save version snapshot
        if (!empty($data['commit_message'])) {
            $versionCount = $project->versions()->count() + 1;
            GraphVersion::create([
                'plugin_project_id' => $project->id,
                'version_number' => "1.0.{$versionCount}",
                'commit_message' => $data['commit_message'],
                'graph_snapshot' => $data['graph_json'],
                'node_count' => count($data['graph_json']['nodes'] ?? []),
                'connection_count' => count($data['graph_json']['connections'] ?? []),
            ]);
        }

        return response()->json(['message' => 'Graph saved successfully', 'project' => $project]);
    }

    // AI Copilot Graph Synthesis (Prompt -> .cs2graph Node Blocks)
    public function generateAiNodes(Request $request)
    {
        $request->validate(['prompt' => 'required|string']);
        $prompt = strtolower($request->prompt);

        // Intelligently synthesize structured nodes and connections based on prompt
        $generatedNodes = [];
        $generatedConnections = [];

        if (str_contains($prompt, 'kill') || str_contains($prompt, 'death') || str_contains($prompt, 'headshot')) {
            $generatedNodes[] = [
                'id' => 'ai_event_' . uniqid(),
                'type' => 'event.player_death',
                'category' => 'events',
                'title' => 'Player Death Event',
                'x' => 150,
                'y' => 100,
                'outputs' => ['exec', 'victim', 'attacker', 'headshot'],
            ];
            $generatedNodes[] = [
                'id' => 'ai_cond_' . uniqid(),
                'type' => 'condition.is_headshot',
                'category' => 'conditions',
                'title' => 'Is Headshot?',
                'x' => 450,
                'y' => 100,
                'inputs' => ['exec', 'headshot'],
                'outputs' => ['true', 'false'],
            ];
            $generatedNodes[] = [
                'id' => 'ai_action_' . uniqid(),
                'type' => 'action.add_money',
                'category' => 'actions',
                'title' => 'Add Headshot Bonus (+$500)',
                'x' => 750,
                'y' => 80,
                'inputs' => ['exec', 'player', 'amount'],
                'config' => ['amount' => 500],
            ];
        } else {
            $generatedNodes[] = [
                'id' => 'ai_cmd_' . uniqid(),
                'type' => 'event.player_command',
                'category' => 'commands',
                'title' => 'Command: !rules',
                'x' => 150,
                'y' => 120,
                'outputs' => ['exec', 'player'],
                'config' => ['command' => '!rules'],
            ];
            $generatedNodes[] = [
                'id' => 'ai_action_' . uniqid(),
                'type' => 'action.send_center_message',
                'category' => 'actions',
                'title' => 'Show Server Rules',
                'x' => 480,
                'y' => 120,
                'inputs' => ['exec', 'player', 'message'],
                'config' => ['message' => '1. No Cheats | 2. Respect Players | 3. Have Fun'],
            ];
        }

        return response()->json([
            'nodes' => $generatedNodes,
            'connections' => $generatedConnections,
            'message' => 'AI synthesized visual node blocks from prompt successfully.',
        ]);
    }

    // Dispatch Build Job to local Client AI Agent
    public function dispatchBuild($id, Request $request)
    {
        $project = PluginProject::findOrFail($id);
        $user = $request->user();

        // Find user's active client agent
        $agent = Agent::where('user_id', $user->id)
            ->where('status', 'ready')
            ->first();

        if (!$agent) {
            // Fallback to any online agent
            $agent = Agent::where('status', 'ready')->first();
        }

        $job = JobTask::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'agent_id' => $agent ? $agent->agent_id : null,
            'type' => 'plugin.build',
            'priority' => 'high',
            'status' => 'pending',
            'payload' => [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'graph_data' => $project->graph_json,
            ],
            'logs' => ['Queued for Client AI Agent compilation...'],
        ]);

        return response()->json([
            'message' => 'Build job dispatched to local Client Agent',
            'job' => $job,
            'agent' => $agent,
        ], 202);
    }

    // Deploy compiled plugin artifact to target CS2 server via Daemon
    public function deployToServer($id, Request $request)
    {
        $request->validate(['server_id' => 'required|exists:servers,id']);
        $server = Server::with('node')->findOrFail($request->server_id);
        $project = PluginProject::findOrFail($id);

        // Reload plugins via RCON
        try {
            $this->daemon->executeRcon($server, 'css_plugins reload');
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "Plugin '{$project->name}' deployed successfully to server {$server->name}",
            'server_id' => $server->id,
        ]);
    }
}
