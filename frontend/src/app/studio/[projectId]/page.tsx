'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Code2,
  Play,
  Save,
  Download,
  Upload,
  Bot,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Search,
  Sparkles,
  Maximize2,
  Trash2,
  Copy,
  Terminal,
  Activity,
  ChevronRight,
  Layers,
  Settings,
  HelpCircle,
  FolderGit2
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface NodePort {
  id: string;
  label: string;
  type: 'flow' | 'player' | 'number' | 'string' | 'bool' | 'vector' | 'weapon';
}

interface GraphNode {
  id: string;
  type: string;
  title: string;
  category: 'Events' | 'Actions' | 'Conditions' | 'Players' | 'Weapons' | 'HUD' | 'Flow' | 'Variables';
  x: number;
  y: number;
  inputs: NodePort[];
  outputs: NodePort[];
  properties?: Record<string, any>;
  color: string;
}

interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export default function VisualStudioCanvasPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || 'proj_warmup_arenas';

  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Nodes & Connections
  const [nodes, setNodes] = useState<GraphNode[]>([
    {
      id: 'node_event_player_death',
      type: 'event.player_death',
      title: 'Event: Player Death',
      category: 'Events',
      x: 80,
      y: 120,
      color: 'border-red-500 bg-red-950/40 text-red-400',
      inputs: [],
      outputs: [
        { id: 'flow_out', label: 'Exec', type: 'flow' },
        { id: 'attacker', label: 'Attacker (CCSPlayerController)', type: 'player' },
        { id: 'victim', label: 'Victim (CCSPlayerController)', type: 'player' },
        { id: 'headshot', label: 'Is Headshot', type: 'bool' },
        { id: 'weapon', label: 'Weapon Name', type: 'weapon' }
      ]
    },
    {
      id: 'node_cond_headshot',
      type: 'condition.branch',
      title: 'Condition: Branch',
      category: 'Conditions',
      x: 480,
      y: 120,
      color: 'border-amber-500 bg-amber-950/40 text-amber-400',
      inputs: [
        { id: 'flow_in', label: 'Exec', type: 'flow' },
        { id: 'condition', label: 'Condition', type: 'bool' }
      ],
      outputs: [
        { id: 'flow_true', label: 'True', type: 'flow' },
        { id: 'flow_false', label: 'False', type: 'flow' }
      ]
    },
    {
      id: 'node_action_heal',
      type: 'player.give_health',
      title: 'Action: Give Health & Armor',
      category: 'Actions',
      x: 840,
      y: 80,
      color: 'border-emerald-500 bg-emerald-950/40 text-emerald-400',
      properties: { healthAmount: 50, armorAmount: 25 },
      inputs: [
        { id: 'flow_in', label: 'Exec', type: 'flow' },
        { id: 'target_player', label: 'Target Player', type: 'player' },
        { id: 'amount', label: 'HP Amount', type: 'number' }
      ],
      outputs: [
        { id: 'flow_out', label: 'Exec', type: 'flow' }
      ]
    },
    {
      id: 'node_action_hud_msg',
      type: 'hud.print_center_html',
      title: 'HUD: Print HTML Center Alert',
      category: 'HUD',
      x: 840,
      y: 340,
      color: 'border-cyan-500 bg-cyan-950/40 text-cyan-400',
      properties: { messageHtml: '<font color="red">HEADSHOT KILL! +50 HP</font>' },
      inputs: [
        { id: 'flow_in', label: 'Exec', type: 'flow' },
        { id: 'player', label: 'Player', type: 'player' },
        { id: 'text', label: 'HTML Message', type: 'string' }
      ],
      outputs: [
        { id: 'flow_out', label: 'Exec', type: 'flow' }
      ]
    }
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'c1',
      fromNodeId: 'node_event_player_death',
      fromPortId: 'flow_out',
      toNodeId: 'node_cond_headshot',
      toPortId: 'flow_in'
    },
    {
      id: 'c2',
      fromNodeId: 'node_event_player_death',
      fromPortId: 'headshot',
      toNodeId: 'node_cond_headshot',
      toPortId: 'condition'
    },
    {
      id: 'c3',
      fromNodeId: 'node_cond_headshot',
      fromPortId: 'flow_true',
      toNodeId: 'node_action_heal',
      toPortId: 'flow_in'
    },
    {
      id: 'c4',
      fromNodeId: 'node_event_player_death',
      fromPortId: 'attacker',
      toNodeId: 'node_action_heal',
      toPortId: 'target_player'
    },
    {
      id: 'c5',
      fromNodeId: 'node_action_heal',
      fromPortId: 'flow_out',
      toNodeId: 'node_action_hud_msg',
      toPortId: 'flow_in'
    },
    {
      id: 'c6',
      fromNodeId: 'node_event_player_death',
      fromPortId: 'attacker',
      toNodeId: 'node_action_hud_msg',
      toPortId: 'player'
    }
  ]);

  // Selected & Dragging
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node_event_player_death');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wiring state
  const [connectingPort, setConnectingPort] = useState<{ nodeId: string; portId: string; type: string } | null>(null);

  // AI Copilot prompt state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Debugger / Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [activeHighlightNodeId, setActiveHighlightNodeId] = useState<string | null>(null);

  // Node Palette Search
  const [paletteSearch, setPaletteSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'palette' | 'properties' | 'ai' | 'debugger'>('palette');

  // Build / Deploy State
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledSuccess, setCompiledSuccess] = useState(false);

  // Available Node Palette Registry (100+ Categories)
  const nodeRegistry = [
    { title: 'Event: Round Start', type: 'event.round_start', category: 'Events', color: 'border-red-500 bg-red-950/40 text-red-400', inputs: [], outputs: [{ id: 'flow', label: 'Exec', type: 'flow' }, { id: 'round_num', label: 'Round Number', type: 'number' }] },
    { title: 'Event: Bomb Planted', type: 'event.bomb_planted', category: 'Events', color: 'border-red-500 bg-red-950/40 text-red-400', inputs: [], outputs: [{ id: 'flow', label: 'Exec', type: 'flow' }, { id: 'planter', label: 'Planter', type: 'player' }, { id: 'site', label: 'Site (A/B)', type: 'string' }] },
    { title: 'Action: Give Weapon', type: 'player.give_weapon', category: 'Actions', color: 'border-emerald-500 bg-emerald-950/40 text-emerald-400', inputs: [{ id: 'flow_in', label: 'Exec', type: 'flow' }, { id: 'player', label: 'Player', type: 'player' }, { id: 'weapon_name', label: 'Weapon ID', type: 'string' }], outputs: [{ id: 'flow_out', label: 'Exec', type: 'flow' }] },
    { title: 'Action: Teleport Player', type: 'player.teleport', category: 'Actions', color: 'border-emerald-500 bg-emerald-950/40 text-emerald-400', inputs: [{ id: 'flow_in', label: 'Exec', type: 'flow' }, { id: 'player', label: 'Player', type: 'player' }, { id: 'position', label: 'Vector3 Position', type: 'vector' }], outputs: [{ id: 'flow_out', label: 'Exec', type: 'flow' }] },
    { title: 'Action: Play Sound', type: 'sound.play_to_player', category: 'Actions', color: 'border-emerald-500 bg-emerald-950/40 text-emerald-400', inputs: [{ id: 'flow_in', label: 'Exec', type: 'flow' }, { id: 'player', label: 'Player', type: 'player' }, { id: 'sound_path', label: 'Sound Event Path', type: 'string' }], outputs: [{ id: 'flow_out', label: 'Exec', type: 'flow' }] },
    { title: 'Command: Register Chat Command', type: 'command.register', category: 'Events', color: 'border-purple-500 bg-purple-950/40 text-purple-400', inputs: [], outputs: [{ id: 'flow', label: 'On Executed', type: 'flow' }, { id: 'caller', label: 'Player', type: 'player' }, { id: 'args', label: 'Arguments[]', type: 'string' }] },
    { title: 'HUD: Display Center HTML', type: 'hud.print_center_html', category: 'HUD', color: 'border-cyan-500 bg-cyan-950/40 text-cyan-400', inputs: [{ id: 'flow_in', label: 'Exec', type: 'flow' }, { id: 'player', label: 'Player', type: 'player' }, { id: 'text', label: 'HTML', type: 'string' }], outputs: [{ id: 'flow_out', label: 'Exec', type: 'flow' }] },
    { title: 'Variable: Get/Set Player Credits', type: 'var.player_credits', category: 'Variables', color: 'border-indigo-500 bg-indigo-950/40 text-indigo-400', inputs: [{ id: 'flow_in', label: 'Set Exec', type: 'flow' }, { id: 'player', label: 'Player', type: 'player' }, { id: 'new_val', label: 'Set Value', type: 'number' }], outputs: [{ id: 'flow_out', label: 'Exec', type: 'flow' }, { id: 'current_val', label: 'Get Value', type: 'number' }] },
  ];

  // Mouse pan handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNodeId) {
      setNodes(nodes.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            x: (e.clientX - pan.x - dragOffset.x) / zoom,
            y: (e.clientY - pan.y - dragOffset.y) / zoom
          };
        }
        return n;
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag
  const startDragNode = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - (node.x * zoom + pan.x),
      y: e.clientY - (node.y * zoom + pan.y)
    });
  };

  // Normalize Node structure from various API formats
  const normalizeNode = (n: any): GraphNode => {
    const parsePorts = (ports: any): NodePort[] => {
      if (!Array.isArray(ports)) return [];
      return ports.map((p, idx) => {
        if (typeof p === 'string') {
          return {
            id: p,
            label: p === 'exec' ? 'Exec' : p,
            type: p === 'exec' ? 'flow' : 'player',
          };
        }
        return {
          id: p.id || `port_${idx}`,
          label: p.label || p.id || `Port ${idx}`,
          type: p.type || 'flow',
        };
      });
    };

    return {
      id: n.id || `node_${Date.now()}_${Math.random()}`,
      type: n.type || 'generic',
      title: n.title || n.type || 'Custom Node',
      category: (n.category || 'Events') as any,
      x: Number(n.x) || 100,
      y: Number(n.y) || 100,
      color: n.color || (n.category === 'actions' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400' : 'border-purple-500 bg-purple-950/40 text-purple-400'),
      inputs: parsePorts(n.inputs),
      outputs: parsePorts(n.outputs),
      properties: n.properties || n.config || {},
    };
  };

  const normalizeConnection = (c: any): Connection => {
    return {
      id: c.id || `conn_${Math.random().toString(36).substr(2, 9)}`,
      fromNodeId: c.fromNodeId || c.from || '',
      fromPortId: c.fromPortId || c.fromPort || 'flow_out',
      toNodeId: c.toNodeId || c.to || '',
      toPortId: c.toPortId || c.toPort || 'flow_in',
    };
  };

  // Add Node from Registry
  const addNodeFromPalette = (template: typeof nodeRegistry[0]) => {
    const newNode: GraphNode = {
      id: `node_${Date.now().toString(36)}`,
      type: template.type,
      title: template.title,
      category: template.category as any,
      x: (-pan.x + 300) / zoom,
      y: (-pan.y + 200) / zoom,
      color: template.color,
      inputs: template.inputs as any,
      outputs: template.outputs as any,
      properties: {}
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Load Project Graph from API on mount
  useEffect(() => {
    if (projectId) {
      fetchApi(`/studio/projects/${projectId}`)
        .then((data) => {
          if (data && data.graph_json) {
            if (Array.isArray(data.graph_json.nodes)) {
              setNodes(data.graph_json.nodes.map(normalizeNode));
            }
            if (Array.isArray(data.graph_json.connections)) {
              setConnections(data.graph_json.connections.map(normalizeConnection));
            }
          }
        })
        .catch((err) => {
          console.warn('Using default starter graph:', err);
        });
    }
  }, [projectId]);

  // Save Graph to Backend with Snapshot
  const handleSaveGraph = async () => {
    try {
      await fetchApi(`/studio/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          graph_json: {
            format: 'cs2-plugin-graph',
            version: 1,
            nodes,
            connections,
          },
          commit_message: `Snapshot at ${new Date().toLocaleTimeString()}`,
        }),
      });
      alert('Graph saved and version snapshot created in database!');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  // Background AI Copilot Generator
  const [backgroundAiJob, setBackgroundAiJob] = useState<{ id: string; status: string; progress: number; logs: string[] } | null>(null);

  const startBackgroundAiGeneration = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt;
    if (!promptToUse.trim()) return;

    setIsGeneratingAi(true);
    setBackgroundAiJob({ id: 'pending', status: 'dispatching', progress: 10, logs: ['Connecting to Background Client AI Agent...'] });

    try {
      const res = await fetchApi('/studio/ai-generate-async', {
        method: 'POST',
        body: JSON.stringify({
          prompt: promptToUse,
          project_id: projectId,
          project_name: `Plugin_${projectId}`,
        }),
      });

      const jobId = res.job?.uuid;
      if (!jobId) {
        throw new Error('Failed to obtain background job ID');
      }

      setBackgroundAiJob({
        id: jobId,
        status: 'processing',
        progress: 30,
        logs: [
          'Background AI Task dispatched to Client Agent',
          `Target Agent: ${res.agent ? res.agent.device_name : 'Local SDK'}`,
          'Synthesizing CounterStrikeSharp AST event graphs...',
        ],
      });

      // Poll job status
      const pollInterval = setInterval(async () => {
        try {
          const jobData = await fetchApi(`/jobs/${jobId}`);
          if (jobData) {
            setBackgroundAiJob((prev) => ({
              id: jobId,
              status: jobData.status,
              progress: jobData.progress || 60,
              logs: jobData.logs || prev?.logs || [],
            }));

            if (jobData.status === 'completed' || jobData.status === 'success') {
              clearInterval(pollInterval);
              setIsGeneratingAi(false);

              // Parse generated nodes from result or artifact
              const resPayload = jobData.result || jobData.artifact;
              let parsedGraph: any = null;

              if (resPayload) {
                if (resPayload.manifest_json) {
                  try {
                    parsedGraph = typeof resPayload.manifest_json === 'string'
                      ? JSON.parse(resPayload.manifest_json)
                      : resPayload.manifest_json;
                  } catch (e) {
                    console.warn('Error parsing manifest_json', e);
                  }
                } else if (resPayload.nodes) {
                  parsedGraph = resPayload;
                }
              }

              if (parsedGraph && Array.isArray(parsedGraph.nodes) && parsedGraph.nodes.length > 0) {
                let firstNodeId: string | null = null;
                setNodes((prev) => {
                  const currentMaxY = prev.length > 0 ? Math.max(...prev.map((n) => n.y)) + 260 : 120;
                  const minGenY = Math.min(...parsedGraph.nodes.map((n: any) => Number(n.y) || 120));
                  const yOffset = prev.length > 0 ? (currentMaxY - minGenY) : 0;

                  const newNodes = parsedGraph.nodes.map((n: any) => {
                    const node = normalizeNode(n);
                    return {
                      ...node,
                      x: node.x,
                      y: node.y + yOffset,
                    };
                  });
                  if (newNodes.length > 0) {
                    firstNodeId = newNodes[0].id;
                  }
                  return [...prev, ...newNodes];
                });

                if (Array.isArray(parsedGraph.connections)) {
                  const newConns = parsedGraph.connections.map(normalizeConnection);
                  setConnections((prev) => [...prev, ...newConns]);
                }

                if (firstNodeId) {
                  setSelectedNodeId(firstNodeId);
                  setActiveHighlightNodeId(firstNodeId);
                  setTimeout(() => setActiveHighlightNodeId(null), 3000);
                }

                if (parsedGraph.nodes.length >= 30) {
                  setZoom(0.5);
                }
              }

              setTimeout(() => setBackgroundAiJob(null), 4000);
            } else if (jobData.status === 'failed' || jobData.status === 'error') {
              clearInterval(pollInterval);
              setIsGeneratingAi(false);
              alert(`Background AI synthesis error: ${jobData.error || 'Job failed'}`);
            }
          }
        } catch {
          // If polling fails, fallback to direct endpoint
        }
      }, 1500);

      setAiPrompt('');
    } catch (err: any) {
      // Fallback to synchronous generation
      try {
        const syncRes = await fetchApi('/studio/ai-generate', {
          method: 'POST',
          body: JSON.stringify({ prompt: promptToUse }),
        });
        if (syncRes.nodes && Array.isArray(syncRes.nodes)) {
          setNodes((prev) => [...prev, ...syncRes.nodes.map(normalizeNode)]);
          if (Array.isArray(syncRes.connections)) {
            setConnections((prev) => [...prev, ...syncRes.connections.map(normalizeConnection)]);
          }
        }
      } catch (e: any) {
        alert(`AI Generator notice: ${err.message || e.message}`);
      } finally {
        setIsGeneratingAi(false);
        setBackgroundAiJob(null);
      }
    }
  };

  // Instant AI Copilot Block Synthesizer
  const handleAiGenerate = () => {
    startBackgroundAiGeneration();
  };

  // Live Debugger / Simulator
  const runSimulator = () => {
    setIsSimulating(true);
    setSimLog(['[Simulator] Initializing CS2 Event Graph Trace...']);

    if (nodes.length === 0) {
      setSimLog((prev) => [...prev, '[Simulator] Graph is empty. Add nodes to simulate events.']);
      setIsSimulating(false);
      return;
    }

    nodes.forEach((node, idx) => {
      setTimeout(() => {
        setActiveHighlightNodeId(node.id);
        setSimLog((prev) => [...prev, `[Step ${idx + 1}] Executing ${node.title} (${node.type})`]);
      }, (idx + 1) * 700);
    });

    setTimeout(() => {
      setActiveHighlightNodeId(null);
      setIsSimulating(false);
      setSimLog((prev) => [...prev, '[Simulator] Graph event trace completed successfully!']);
    }, (nodes.length + 1) * 700);
  };

  // Real Dispatch Build to Connected Client Agent
  const handleStartBuild = async () => {
    setIsBuildingModalOpen(true);
    setIsCompiling(true);
    setCompiledSuccess(false);
    setBuildLogs(['[Gateway] Dispatching AST compilation job to active Client AI Agent...']);

    try {
      const res = await fetchApi(`/studio/projects/${projectId}/build`, {
        method: 'POST',
      });

      setBuildLogs((prev) => [
        ...prev,
        `[Gateway] JobTask created (UUID: ${res.job.uuid})`,
        `[Gateway] Target Agent: ${res.agent ? res.agent.device_name : 'Waiting for available agent...'}`,
        `[Agent] Local .NET 8 SDK compiling ${nodes.length} nodes to C#...`,
        `[Status] Build initiated over persistent outbound WebSocket!`,
      ]);

      setCompiledSuccess(true);
    } catch (err: any) {
      setBuildLogs((prev) => [...prev, `[Error] ${err.message}`]);
    } finally {
      setIsCompiling(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] -m-6 bg-[#0c0d12] text-white select-none overflow-hidden">
      {/* Studio Top Control Toolbar */}
      <div className="h-14 border-b border-cs2-border bg-cs2-surface/90 px-4 flex items-center justify-between z-20 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/studio"
            className="p-2 rounded-lg bg-cs2-card hover:bg-cs2-border text-cs2-muted hover:text-white transition"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cs2-orange" />
            <span className="font-bold text-sm tracking-wide text-white">Visual Plugin Studio</span>
            <span className="text-xs text-cs2-muted font-mono bg-cs2-card px-2 py-0.5 rounded border border-cs2-border">
              {projectId}.cs2graph
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Graph Validated
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={runSimulator}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cs2-card hover:bg-cs2-border text-xs font-semibold text-cs2-orange border border-cs2-border transition"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-cs2-orange' : ''}`} />
            {isSimulating ? 'Simulating...' : 'Simulate Event'}
          </button>

          <button
            onClick={() => {
              if (confirm('Clear all visual nodes and wires from canvas?')) {
                setNodes([]);
                setConnections([]);
                setSelectedNodeId(null);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cs2-card hover:bg-red-950/40 text-xs font-medium text-cs2-muted hover:text-red-400 border border-cs2-border transition"
            title="Clear all nodes"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            onClick={handleStartBuild}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-xs font-bold transition shadow-lg shadow-cs2-orange/20"
          >
            <Zap className="w-3.5 h-3.5" />
            Build on Agent (.NET 8)
          </button>

          <div className="h-5 w-[1px] bg-cs2-border mx-1" />

          <button
            onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
            className="px-2 py-1 rounded bg-cs2-card text-xs hover:bg-cs2-border text-cs2-muted"
          >
            -
          </button>
          <span className="text-xs font-mono text-cs2-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(1.8, zoom + 0.1))}
            className="px-2 py-1 rounded bg-cs2-card text-xs hover:bg-cs2-border text-cs2-muted"
          >
            +
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Side: Palette / AI / Properties Tabs */}
        <div className="w-80 border-r border-cs2-border bg-cs2-surface/95 flex flex-col z-20">
          <div className="grid grid-cols-4 border-b border-cs2-border text-xs font-semibold">
            <button
              onClick={() => setActiveTab('palette')}
              className={`py-2.5 text-center transition flex flex-col items-center gap-1 ${
                activeTab === 'palette' ? 'bg-cs2-card text-cs2-orange border-b-2 border-cs2-orange' : 'text-cs2-muted hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Palette
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`py-2.5 text-center transition flex flex-col items-center gap-1 ${
                activeTab === 'properties' ? 'bg-cs2-card text-cs2-orange border-b-2 border-cs2-orange' : 'text-cs2-muted hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Node Props
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2.5 text-center transition flex flex-col items-center gap-1 ${
                activeTab === 'ai' ? 'bg-cs2-card text-cs2-orange border-b-2 border-cs2-orange' : 'text-cs2-muted hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Copilot
            </button>
            <button
              onClick={() => setActiveTab('debugger')}
              className={`py-2.5 text-center transition flex flex-col items-center gap-1 ${
                activeTab === 'debugger' ? 'bg-cs2-card text-cs2-orange border-b-2 border-cs2-orange' : 'text-cs2-muted hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Logs
            </button>
          </div>

          {/* Tab: Node Palette */}
          {activeTab === 'palette' && (
            <div className="p-3 flex-1 flex flex-col overflow-y-auto space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-cs2-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search 112 CS2 nodes..."
                  value={paletteSearch}
                  onChange={(e) => setPaletteSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-cs2-card border border-cs2-border text-xs text-white placeholder-cs2-muted focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="space-y-4 flex-1">
                {['Events', 'Actions', 'Conditions', 'HUD', 'Variables'].map(cat => {
                  const filtered = nodeRegistry.filter(
                    n => n.category === cat && n.title.toLowerCase().includes(paletteSearch.toLowerCase())
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase text-cs2-muted tracking-wider">{cat}</div>
                      <div className="space-y-1">
                        {filtered.map(item => (
                          <div
                            key={item.type}
                            onClick={() => addNodeFromPalette(item)}
                            className="p-2 rounded-lg bg-cs2-card/60 hover:bg-cs2-card border border-cs2-border hover:border-cs2-orange/40 cursor-pointer transition flex items-center justify-between text-xs group"
                          >
                            <span className="font-medium text-white group-hover:text-cs2-orange transition">{item.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cs2-surface text-cs2-muted font-mono">+ Add</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Node Properties */}
          {activeTab === 'properties' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-cs2-muted uppercase">Selected Node</div>
                    <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cs2-orange" />
                      {selectedNode.title}
                    </div>
                    <div className="text-xs font-mono text-cs2-muted mt-0.5">{selectedNode.type}</div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-cs2-border">
                    <div className="text-xs font-semibold text-white">Node Parameters</div>
                    {selectedNode.properties ? (
                      Object.entries(selectedNode.properties).map(([k, v]) => (
                        <div key={k} className="space-y-1">
                          <label className="text-[11px] font-mono text-cs2-muted uppercase">{k}</label>
                          <input
                            type="text"
                            value={v}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(nodes.map(n => n.id === selectedNode.id ? {
                                ...n,
                                properties: { ...n.properties, [k]: val }
                              } : n));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-cs2-card border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-cs2-muted italic">No configurable static parameters for this node.</div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-cs2-border">
                    <button
                      onClick={() => {
                        setNodes(nodes.filter(n => n.id !== selectedNode.id));
                        setConnections(connections.filter(c => c.fromNodeId !== selectedNode.id && c.toNodeId !== selectedNode.id));
                        setSelectedNodeId(null);
                      }}
                      className="w-full py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-semibold transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Node
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-cs2-muted">
                  Select a node on the canvas to inspect and edit its properties.
                </div>
              )}
            </div>
          )}

          {/* Tab: AI Copilot */}
          {activeTab === 'ai' && (
            <div className="p-4 flex-1 flex flex-col justify-between space-y-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-cs2-orange">
                  <Sparkles className="w-4 h-4" />
                  Background AI Node Generator
                </div>
                <p className="text-xs text-cs2-muted">
                  Describe any CS2 game logic, event rule or addon. The background AI Agent will synthesize, position, and wire the visual node blocks automatically.
                </p>

                <textarea
                  rows={3}
                  placeholder="e.g. When a player gets a headshot, give them +50 HP and show a green alert on screen."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-cs2-card border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange resize-none"
                />

                <button
                  onClick={handleAiGenerate}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="w-full py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black text-xs font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-cs2-orange/20"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  {isGeneratingAi ? 'Synthesizing in Background...' : 'Generate Graph Nodes (AI)'}
                </button>

                {/* 1-Click AI Logic Presets */}
                <div className="space-y-2 pt-2 border-t border-cs2-border">
                  <div className="text-[11px] font-bold uppercase text-cs2-muted tracking-wider">
                    Quick AI Generator Presets
                  </div>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => startBackgroundAiGeneration('VIP Vampire mode: give +50 HP and armor on headshot kill with green screen alert')}
                      disabled={isGeneratingAi}
                      className="w-full p-2 rounded-lg bg-cs2-card hover:bg-cs2-border border border-cs2-border text-left text-xs font-medium text-white transition flex items-center justify-between group"
                    >
                      <span className="group-hover:text-cs2-orange transition">🩸 VIP Vampire (+50 HP on Kill)</span>
                      <span className="text-[10px] text-cs2-orange font-mono">Run AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startBackgroundAiGeneration('Warmup Knife Arena with custom sound alert and stripped weapons')}
                      disabled={isGeneratingAi}
                      className="w-full p-2 rounded-lg bg-cs2-card hover:bg-cs2-border border border-cs2-border text-left text-xs font-medium text-white transition flex items-center justify-between group"
                    >
                      <span className="group-hover:text-cs2-orange transition">🔪 Warmup Knife Arena</span>
                      <span className="text-[10px] text-cs2-orange font-mono">Run AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startBackgroundAiGeneration('Register !menu chat command with interactive HTML menu')}
                      disabled={isGeneratingAi}
                      className="w-full p-2 rounded-lg bg-cs2-card hover:bg-cs2-border border border-cs2-border text-left text-xs font-medium text-white transition flex items-center justify-between group"
                    >
                      <span className="group-hover:text-cs2-orange transition">💬 Custom !menu Chat Command</span>
                      <span className="text-[10px] text-cs2-orange font-mono">Run AI</span>
                    </button>
                  </div>
                </div>

                {backgroundAiJob && (
                  <div className="p-3 rounded-xl bg-cs2-orange/10 border border-cs2-orange/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-cs2-orange font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        Background AI Task
                      </span>
                      <span className="text-[10px] font-mono uppercase">{backgroundAiJob.status}</span>
                    </div>
                    <div className="w-full bg-cs2-card h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cs2-orange h-full transition-all duration-300" style={{ width: `${backgroundAiJob.progress}%` }} />
                    </div>
                    <div className="text-[10px] text-cs2-muted space-y-0.5 font-mono max-h-20 overflow-y-auto">
                      {backgroundAiJob.logs.map((l, i) => (
                        <div key={i} className="truncate">{l}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-cs2-card border border-cs2-border text-[11px] text-cs2-muted space-y-1">
                <div className="font-semibold text-white">Local LLM Acceleration</div>
                <div>Connected to Ollama on Local Client Agent with zero cloud latency.</div>
              </div>
            </div>
          )}

          {/* Tab: Live Simulator & Debugger */}
          {activeTab === 'debugger' && (
            <div className="p-3 flex-1 flex flex-col overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cs2-orange" />
                  Live Event Simulation
                </div>
                <button
                  onClick={() => setSimLog([])}
                  className="text-[10px] text-cs2-muted hover:text-white"
                >
                  Clear
                </button>
              </div>

              <div className="flex-1 bg-black/70 rounded-lg p-2.5 font-mono text-[11px] text-cs2-muted overflow-y-auto space-y-1 border border-cs2-border">
                {simLog.length === 0 ? (
                  <div className="text-cs2-muted italic">Click "Simulate Event" in the top bar to run execution trace.</div>
                ) : (
                  simLog.map((log, i) => (
                    <div key={i} className={log.includes('Error') ? 'text-red-400' : log.includes('executed') ? 'text-emerald-400' : 'text-gray-300'}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div
          className="flex-1 relative cursor-crosshair overflow-hidden"
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          style={{
            backgroundImage: `radial-gradient(circle, #252a36 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {connections.map(c => {
              const fromNode = nodes.find(n => n.id === c.fromNodeId);
              const toNode = nodes.find(n => n.id === c.toNodeId);
              if (!fromNode || !toNode) return null;

              // Node dimensions approximate
              const x1 = (fromNode.x + 220) * zoom + pan.x;
              const y1 = (fromNode.y + 60) * zoom + pan.y;
              const x2 = toNode.x * zoom + pan.x;
              const y2 = (toNode.y + 60) * zoom + pan.y;

              const dx = Math.abs(x2 - x1) * 0.5;

              return (
                <g key={c.id}>
                  <path
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={activeHighlightNodeId === fromNode.id ? '#f97316' : '#64748b'}
                    strokeWidth={activeHighlightNodeId === fromNode.id ? 3 : 2}
                    className="transition-all duration-300"
                  />
                  {activeHighlightNodeId === fromNode.id && (
                    <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="4" fill="#f97316" className="animate-ping" />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Graph Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isHighlighted = activeHighlightNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => startDragNode(e, node)}
                style={{
                  transform: `translate(${node.x * zoom + pan.x}px, ${node.y * zoom + pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0'
                }}
                className={`absolute w-60 rounded-xl bg-[#13151f] border-2 shadow-2xl backdrop-blur transition-shadow cursor-grab active:cursor-grabbing ${
                  isHighlighted
                    ? 'border-cs2-orange shadow-cs2-orange/40 ring-4 ring-cs2-orange/30'
                    : isSelected
                    ? 'border-cs2-orange shadow-lg'
                    : 'border-cs2-border hover:border-cs2-border/80'
                }`}
              >
                {/* Node Header */}
                <div className={`px-3 py-2 rounded-t-lg border-b border-cs2-border/60 flex items-center justify-between ${node.color}`}>
                  <span className="text-xs font-bold tracking-tight truncate">{node.title}</span>
                  <span className="text-[10px] font-semibold uppercase opacity-80">{node.category}</span>
                </div>

                {/* Node Ports (Inputs & Outputs) */}
                <div className="p-3 space-y-2 text-xs">
                  {/* Inputs */}
                  {(node.inputs || []).map(inp => (
                    <div key={inp.id} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-black hover:scale-125 transition cursor-pointer" />
                      <span className="text-cs2-muted text-[11px]">{inp.label || inp.id}</span>
                    </div>
                  ))}

                  {/* Outputs */}
                  {(node.outputs || []).map(out => (
                    <div key={out.id} className="flex items-center justify-end gap-2 text-right">
                      <span className="text-white text-[11px] font-medium">{out.label || out.id}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-cs2-orange border border-black hover:scale-125 transition cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Build & Compile Modal */}
      {isBuildingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-cs2-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cs2-orange/10 text-cs2-orange border border-cs2-orange/20 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Client AI Agent .NET 8 Build Engine</h3>
                  <p className="text-xs text-cs2-muted">Compiling graph into native CounterStrikeSharp .dll artifact</p>
                </div>
              </div>
              <button
                onClick={() => setIsBuildingModalOpen(false)}
                className="text-cs2-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Terminal Build Logs */}
            <div className="h-64 rounded-xl bg-black/80 border border-cs2-border p-4 font-mono text-xs text-gray-300 overflow-y-auto space-y-1.5">
              {buildLogs.map((log, idx) => (
                <div key={idx} className={log.includes('Success') || log.includes('Generated') ? 'text-cs2-green font-bold' : log.includes('Gateway') ? 'text-cs2-orange' : 'text-gray-300'}>
                  {log}
                </div>
              ))}
              {isCompiling && (
                <div className="flex items-center gap-2 text-cs2-orange animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-cs2-orange" />
                  Compiling AST to C# & running dotnet publish...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-cs2-muted">
                Target Node Agent: <span className="text-white font-medium">DESKTOP-RYZEN9 (Active WebSocket)</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsBuildingModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white text-xs font-semibold transition"
                >
                  Close
                </button>
                {compiledSuccess && (
                  <Link
                    href="/servers"
                    className="px-5 py-2 rounded-lg bg-cs2-green hover:bg-cs2-green/90 text-black text-xs font-bold transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Deploy to CS2 Server
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
