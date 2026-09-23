<?php

namespace App\Services;

use App\Models\PluginProject;

class GraphCompilerService
{
    /**
     * Compile a visual node graph (.cs2graph) into valid CounterStrikeSharp C# code.
     */
    public function compile(PluginProject $project): string
    {
        $graph = $project->graph_json ?? [];
        $nodes = $graph['nodes'] ?? [];
        $connections = $graph['connections'] ?? [];

        $safeClassName = preg_replace('/[^a-zA-Z0-9_]/', '', $project->name) ?: 'CustomPlugin';
        if (is_numeric($safeClassName[0])) {
            $safeClassName = 'Plugin_' . $safeClassName;
        }

        $moduleName = addslashes($project->name);
        $moduleVersion = addslashes($project->version ?? '1.0.0');
        $moduleAuthor = addslashes($project->author ?? 'CS2 Visual Studio');
        $moduleDesc = addslashes($project->description ?? 'Compiled by CS2Panel Visual Studio');

        // Index nodes by ID
        $nodeMap = [];
        foreach ($nodes as $n) {
            $id = $n['id'] ?? '';
            if ($id) {
                $nodeMap[$id] = $n;
            }
        }

        // Build adjacency list for connections
        $outgoingConns = [];
        foreach ($connections as $c) {
            $from = $c['fromNodeId'] ?? ($c['from'] ?? '');
            $fromPort = $c['fromPortId'] ?? ($c['fromPort'] ?? 'flow_out');
            $to = $c['toNodeId'] ?? ($c['to'] ?? '');
            $toPort = $c['toPortId'] ?? ($c['toPort'] ?? 'flow_in');

            if ($from && $to) {
                $outgoingConns[$from][] = [
                    'fromPort' => $fromPort,
                    'to' => $to,
                    'toPort' => $toPort,
                ];
            }
        }

        // Find Event / Entry / Command nodes
        $eventNodes = [];
        $commandNodes = [];
        $otherNodes = [];

        foreach ($nodes as $n) {
            $type = strtolower($n['type'] ?? '');
            if (str_starts_with($type, 'event.') || str_contains($type, 'event_')) {
                $eventNodes[] = $n;
            } elseif (str_starts_with($type, 'command.') || str_contains($type, 'player_command')) {
                $commandNodes[] = $n;
            } else {
                $otherNodes[] = $n;
            }
        }

        // Generate Load method registrations
        $loadRegistrations = [];
        $handlersCode = [];

        // 1. Process Event Nodes
        $registeredEvents = [];
        foreach ($eventNodes as $evNode) {
            $type = strtolower($evNode['type'] ?? '');
            $evHandlerInfo = $this->getEventHandlerInfo($type, $evNode);

            if ($evHandlerInfo && !isset($registeredEvents[$evHandlerInfo['eventName']])) {
                $registeredEvents[$evHandlerInfo['eventName']] = true;
                $loadRegistrations[] = "        RegisterEventHandler<{$evHandlerInfo['eventName']}>(On{$evHandlerInfo['methodSuffix']});";

                // Compile downstream node logic for this event
                $downstreamCode = $this->compileDownstreamFlow($evNode['id'], $outgoingConns, $nodeMap);

                $handlersCode[] = $this->renderEventHandlerMethod(
                    $evHandlerInfo['eventName'],
                    $evHandlerInfo['methodSuffix'],
                    $evHandlerInfo['contextVar'],
                    $downstreamCode
                );
            }
        }

        // Fallback default events if no specific events were added
        if (empty($registeredEvents)) {
            $loadRegistrations[] = "        RegisterEventHandler<EventPlayerConnectFull>(OnPlayerConnectFull);";
            $loadRegistrations[] = "        RegisterEventHandler<EventPlayerSpawn>(OnPlayerSpawn);";
            $loadRegistrations[] = "        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);";
            $loadRegistrations[] = "        RegisterEventHandler<EventRoundStart>(OnRoundStart);";

            $handlersCode[] = $this->renderDefaultHandlers($otherNodes);
        }

        // 2. Process Command Nodes
        foreach ($commandNodes as $cmdNode) {
            $props = $cmdNode['properties'] ?? ($cmdNode['config'] ?? []);
            $cmdName = trim($props['command'] ?? ($props['name'] ?? 'css_menu'), ' !/');
            if (empty($cmdName)) $cmdName = 'menu';
            $cleanMethod = 'OnCommand_' . preg_replace('/[^a-zA-Z0-9_]/', '', $cmdName);

            $loadRegistrations[] = "        AddCommand(\"{$cmdName}\", \"Custom command {$cmdName}\", {$cleanMethod});";
            $downstreamCode = $this->compileDownstreamFlow($cmdNode['id'], $outgoingConns, $nodeMap);

            $handlersCode[] = <<<CSHARP
    [ConsoleCommand("{$cmdName}")]
    public void {$cleanMethod}(CCSPlayerController? player, CommandInfo info)
    {
        if (player == null || !player.IsValid) return;

{$downstreamCode}
    }
CSHARP;
        }

        $loadBody = implode("\n", $loadRegistrations);
        $handlersBody = implode("\n\n", $handlersCode);

        return <<<CSHARP
using System;
using System.Linq;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Entities;

namespace {$safeClassName};

[MinimumApiVersion(250)]
public class {$safeClassName}Plugin : BasePlugin
{
    public override string ModuleName => "{$moduleName}";
    public override string ModuleVersion => "{$moduleVersion}";
    public override string ModuleAuthor => "{$moduleAuthor}";
    public override string ModuleDescription => "{$moduleDesc}";

    public override void Load(bool hotReload)
    {
        Console.WriteLine("[{$safeClassName}] Initialized CounterStrikeSharp Visual Node Graph ({count($nodes)} nodes)...");

{$loadBody}
    }

{$handlersBody}
}
CSHARP;
    }

    protected function getEventHandlerInfo(string $type, array $node): ?array
    {
        if (str_contains($type, 'player_death')) {
            return ['eventName' => 'EventPlayerDeath', 'methodSuffix' => 'PlayerDeath', 'contextVar' => 'player'];
        }
        if (str_contains($type, 'player_spawn')) {
            return ['eventName' => 'EventPlayerSpawn', 'methodSuffix' => 'PlayerSpawn', 'contextVar' => 'player'];
        }
        if (str_contains($type, 'player_connect')) {
            return ['eventName' => 'EventPlayerConnectFull', 'methodSuffix' => 'PlayerConnectFull', 'contextVar' => 'player'];
        }
        if (str_contains($type, 'round_start')) {
            return ['eventName' => 'EventRoundStart', 'methodSuffix' => 'RoundStart', 'contextVar' => 'none'];
        }
        if (str_contains($type, 'round_end')) {
            return ['eventName' => 'EventRoundEnd', 'methodSuffix' => 'RoundEnd', 'contextVar' => 'none'];
        }
        if (str_contains($type, 'bomb_planted')) {
            return ['eventName' => 'EventBombPlanted', 'methodSuffix' => 'BombPlanted', 'contextVar' => 'player'];
        }
        return ['eventName' => 'EventPlayerSpawn', 'methodSuffix' => 'PlayerSpawn', 'contextVar' => 'player'];
    }

    protected function renderEventHandlerMethod(string $eventName, string $methodSuffix, string $contextVar, string $downstreamCode): string
    {
        $contextSetup = "";
        if ($eventName === 'EventPlayerDeath') {
            $contextSetup = <<<CSHARP
        var victim = @event.Userid;
        var attacker = @event.Attacker;
        var player = attacker ?? victim;
        if (player == null || !player.IsValid) return HookResult.Continue;
CSHARP;
        } elseif ($eventName === 'EventPlayerSpawn' || $eventName === 'EventPlayerConnectFull') {
            $contextSetup = <<<CSHARP
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot) return HookResult.Continue;
CSHARP;
        }

        if (empty($downstreamCode)) {
            $downstreamCode = "        // Triggered {$eventName}\n        Console.WriteLine(\"[Event] {$eventName} executed.\");";
        }

        return <<<CSHARP
    [GameEventHandler]
    public HookResult On{$methodSuffix}({$eventName} @event, GameEventInfo info)
    {
{$contextSetup}

{$downstreamCode}

        return HookResult.Continue;
    }
CSHARP;
    }

    protected function compileDownstreamFlow(string $startNodeId, array $outgoingConns, array $nodeMap, int $depth = 0): string
    {
        if ($depth > 12) return ""; // Prevent infinite cycles
        $lines = [];
        $indent = str_repeat("    ", max(2, 2 + $depth));

        $conns = $outgoingConns[$startNodeId] ?? [];
        foreach ($conns as $conn) {
            $targetNodeId = $conn['to'];
            $targetNode = $nodeMap[$targetNodeId] ?? null;
            if (!$targetNode) continue;

            $nodeType = strtolower($targetNode['type'] ?? '');
            $props = $targetNode['properties'] ?? ($targetNode['config'] ?? []);

            // 1. Condition / Branch Nodes
            if (str_contains($nodeType, 'condition') || str_contains($nodeType, 'branch')) {
                $condExpr = $this->compileConditionExpression($nodeType, $props);
                $trueFlow = $this->compileDownstreamFlowByPort($targetNodeId, 'flow_true', $outgoingConns, $nodeMap, $depth + 1);
                $falseFlow = $this->compileDownstreamFlowByPort($targetNodeId, 'flow_false', $outgoingConns, $nodeMap, $depth + 1);

                $lines[] = "{$indent}if ({$condExpr})";
                $lines[] = "{$indent}{";
                $lines[] = $trueFlow ?: "{$indent}    // Condition passed";
                $lines[] = "{$indent}}";
                if (!empty($falseFlow)) {
                    $lines[] = "{$indent}else";
                    $lines[] = "{$indent}{";
                    $lines[] = $falseFlow;
                    $lines[] = "{$indent}}";
                }
            }
            // 2. Action Nodes
            elseif (str_contains($nodeType, 'give_health') || str_contains($nodeType, 'player.give_health')) {
                $hp = intval($props['healthAmount'] ?? ($props['amount'] ?? 50));
                $armor = intval($props['armorAmount'] ?? 25);
                $lines[] = "{$indent}var pawn = player.PlayerPawn?.Value;";
                $lines[] = "{$indent}if (pawn != null && pawn.IsValid)";
                $lines[] = "{$indent}{";
                $lines[] = "{$indent}    pawn.Health = Math.Min(200, pawn.Health + {$hp});";
                if ($armor > 0) {
                    $lines[] = "{$indent}    pawn.ArmorValue = Math.Min(100, pawn.ArmorValue + {$armor});";
                }
                $lines[] = "{$indent}}";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
            elseif (str_contains($nodeType, 'give_weapon') || str_contains($nodeType, 'player.give_weapon')) {
                $weapon = addslashes($props['weapon_name'] ?? ($props['weapon'] ?? 'weapon_awp'));
                $lines[] = "{$indent}player.GiveNamedItem(\"{$weapon}\");";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
            elseif (str_contains($nodeType, 'print_center_html') || str_contains($nodeType, 'hud.print_center_html') || str_contains($nodeType, 'center_message')) {
                $rawMsg = $props['messageHtml'] ?? ($props['message'] ?? ($props['text'] ?? '<font color="lime">Plugin Executed!</font>'));
                $safeMsg = addslashes($rawMsg);
                $lines[] = "{$indent}player.PrintToCenterHtml(\"{$safeMsg}\");";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
            elseif (str_contains($nodeType, 'print_chat') || str_contains($nodeType, 'chat_message')) {
                $chatMsg = addslashes($props['message'] ?? ($props['text'] ?? '{Orange}[CS2Panel]{White} Action Executed!'));
                $lines[] = "{$indent}player.PrintToChat(\" {$chatMsg}\");";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
            elseif (str_contains($nodeType, 'add_money') || str_contains($nodeType, 'give_money')) {
                $amount = intval($props['amount'] ?? 500);
                $lines[] = "{$indent}var moneySvc = player.InGameMoneyServices;";
                $lines[] = "{$indent}if (moneySvc != null) moneySvc.Account += {$amount};";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
            elseif (str_contains($nodeType, 'set_speed')) {
                $speed = floatval($props['speed'] ?? 1.2);
                $lines[] = "{$indent}var pPawn = player.PlayerPawn?.Value;";
                $lines[] = "{$indent}if (pPawn != null && pPawn.IsValid) pPawn.VelocityModifier = {$speed}f;";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
            else {
                // Generic Action Node
                $title = addslashes($targetNode['title'] ?? 'Generic Block');
                $lines[] = "{$indent}// Node [{$title}] executed";
                $next = $this->compileDownstreamFlow($targetNodeId, $outgoingConns, $nodeMap, $depth);
                if ($next) $lines[] = $next;
            }
        }

        return implode("\n", $lines);
    }

    protected function compileDownstreamFlowByPort(string $nodeId, string $portId, array $outgoingConns, array $nodeMap, int $depth): string
    {
        $filteredConns = [];
        foreach ($outgoingConns[$nodeId] ?? [] as $conn) {
            if ($conn['fromPort'] === $portId) {
                $filteredConns[$nodeId][] = $conn;
            }
        }
        return $this->compileDownstreamFlow($nodeId, $filteredConns, $nodeMap, $depth);
    }

    protected function compileConditionExpression(string $nodeType, array $props): string
    {
        if (str_contains($nodeType, 'has_permission')) {
            $perm = addslashes($props['permission'] ?? '@css/vip');
            return "AdminManager.PlayerHasPermissions(player, \"{$perm}\")";
        }
        if (str_contains($nodeType, 'is_headshot')) {
            return "@event.Headshot";
        }
        if (str_contains($nodeType, 'is_bot')) {
            return "!player.IsBot";
        }
        return "true";
    }

    protected function renderDefaultHandlers(array $nodes): string
    {
        return <<<CSHARP
    [GameEventHandler]
    public HookResult OnPlayerConnectFull(EventPlayerConnectFull @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot) return HookResult.Continue;
        player.PrintToChat($" {ChatColors.Orange}[CS2Panel]{ChatColors.White} Visual Node Plugin Active!");
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerSpawn(EventPlayerSpawn @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid) return HookResult.Continue;
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        var attacker = @event.Attacker;
        var victim = @event.Userid;
        if (attacker != null && attacker.IsValid && attacker != victim)
        {
            var pawn = attacker.PlayerPawn?.Value;
            if (pawn != null && pawn.IsValid)
            {
                attacker.PrintToCenterHtml("<font color='lime'>+ KILL CONFIRMED</font>");
            }
        }
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        return HookResult.Continue;
    }
CSHARP;
    }
}
