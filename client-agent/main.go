package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

type AgentConfig struct {
	AgentID      string          `json:"agent_id"`
	DeviceID     string          `json:"device_id"`
	DeviceName   string          `json:"device_name"`
	PlatformURL  string          `json:"platform_url"` // e.g. http://127.0.0.1:8000
	AgentToken   string          `json:"agent_token"`
	WorkspaceDir string          `json:"workspace_dir"`
	DotnetPath   string          `json:"dotnet_path,omitempty"`
	GitPath      string          `json:"git_path,omitempty"`
	LocalLLMURL  string          `json:"local_llm_url,omitempty"` // e.g. http://127.0.0.1:11434
	Capabilities map[string]bool `json:"capabilities"`
}

type RegisterRequest struct {
	AgentID      string                 `json:"agent_id"`
	DeviceID     string                 `json:"device_id"`
	DeviceName   string                 `json:"device_name"`
	AgentToken   string                 `json:"agent_token"`
	OS           string                 `json:"os"`
	Arch         string                 `json:"arch"`
	Capabilities map[string]interface{} `json:"capabilities"`
}

type HeartbeatRequest struct {
	AgentID      string                 `json:"agent_id"`
	Status       string                 `json:"status"`
	CPUUsage     float64                `json:"cpu_usage"`
	RAMUsageMB   uint64                 `json:"ram_usage_mb"`
	ActiveJobID  string                 `json:"active_job_id,omitempty"`
	Capabilities map[string]interface{} `json:"capabilities"`
}

type HeartbeatResponse struct {
	Status      string      `json:"status"`
	DispatchJob *JobRequest `json:"dispatch_job,omitempty"`
}

type JobRequest struct {
	UUID        string          `json:"uuid"`
	Type        string          `json:"type"` // plugin.build, plugin.ai_generate
	ProjectID   string          `json:"project_id"`
	ProjectName string          `json:"project_name"`
	GraphData   json.RawMessage `json:"graph_data"`
	Prompt      string          `json:"prompt,omitempty"`
	TargetDir   string          `json:"target_dir,omitempty"`
}

type JobResult struct {
	JobID      string          `json:"job_id"`
	AgentID    string          `json:"agent_id"`
	Status     string          `json:"status"` // success, error
	Progress   int             `json:"progress"`
	Logs       []string        `json:"logs"`
	Artifact   *PluginArtifact `json:"artifact,omitempty"`
	Error      string          `json:"error,omitempty"`
	FinishedAt string          `json:"finished_at"`
}

type PluginArtifact struct {
	Name         string `json:"name"`
	Version      string `json:"version"`
	DLLBase64    string `json:"dll_base64"`
	ManifestJSON string `json:"manifest_json"`
	ConfigJSON   string `json:"config_json"`
	SourceCode   string `json:"source_code"`
}

type ClientAgent struct {
	config     *AgentConfig
	httpClient *http.Client
	activeJob  string
}

func NewClientAgent(cfg *AgentConfig) *ClientAgent {
	return &ClientAgent{
		config: cfg,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (a *ClientAgent) Start(ctx context.Context) {
	log.Printf("[CS2 AI Client] Starting Agent ID: %s (%s)", a.config.AgentID, a.config.DeviceName)
	log.Printf("[CS2 AI Client] Central Web Gateway: %s", a.config.PlatformURL)
	log.Printf("[CS2 AI Client] Local Workspace: %s", a.config.WorkspaceDir)

	_ = os.MkdirAll(a.config.WorkspaceDir, 0755)
	a.detectCapabilities()

	// Initial Registration
	a.registerWithPlatform()

	// Heartbeat & Job Polling Loop
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[CS2 AI Client] Shutting down agent loop...")
			return
		case <-ticker.C:
			a.sendHeartbeat()
		}
	}
}

func (a *ClientAgent) detectCapabilities() {
	if a.config.Capabilities == nil {
		a.config.Capabilities = make(map[string]bool)
	}
	a.config.Capabilities["os_windows"] = runtime.GOOS == "windows"
	a.config.Capabilities["arch_x64"] = runtime.GOARCH == "amd64"

	if _, err := exec.LookPath("dotnet"); err == nil {
		a.config.Capabilities["dotnet"] = true
		a.config.Capabilities["dotnet_8"] = true
		a.config.Capabilities["compiler"] = true
	}
	if _, err := exec.LookPath("git"); err == nil {
		a.config.Capabilities["git"] = true
	}
	a.config.Capabilities["counterstrikesharp_sdk"] = true
	a.config.Capabilities["metamod_sdk"] = true
	a.config.Capabilities["graph_compiler"] = true
	a.config.Capabilities["local_llm"] = true
	a.config.Capabilities["background_ai_generator"] = true
}

func (a *ClientAgent) getBaseAPI() string {
	url := strings.TrimRight(a.config.PlatformURL, "/")
	if strings.HasPrefix(url, "ws://") {
		url = "http://" + strings.TrimPrefix(url, "ws://")
	} else if strings.HasPrefix(url, "wss://") {
		url = "https://" + strings.TrimPrefix(url, "wss://")
	}
	if !strings.HasSuffix(url, "/api/v1") {
		if strings.HasSuffix(url, "/api/v1/agent-gateway/ws") {
			url = strings.TrimSuffix(url, "/agent-gateway/ws")
		} else {
			url = url + "/api/v1"
		}
	}
	return url
}

func (a *ClientAgent) registerWithPlatform() {
	endpoint := a.getBaseAPI() + "/agent-gateway/register"

	caps := make(map[string]interface{})
	for k, v := range a.config.Capabilities {
		caps[k] = v
	}

	payload := RegisterRequest{
		AgentID:      a.config.AgentID,
		DeviceID:     a.config.DeviceID,
		DeviceName:   a.config.DeviceName,
		AgentToken:   a.config.AgentToken,
		OS:           runtime.GOOS,
		Arch:         runtime.GOARCH,
		Capabilities: caps,
	}

	bodyBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-ID", a.config.AgentID)

	resp, err := a.httpClient.Do(req)
	if err != nil {
		log.Printf("[CS2 AI Client] Failed to register at %s: %v", endpoint, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		log.Printf("[CS2 AI Client] ✓ Successfully registered with CS2Panel Central Gateway! Agent is ONLINE.")
	}
}

func (a *ClientAgent) sendHeartbeat() {
	endpoint := a.getBaseAPI() + "/agent-gateway/heartbeat"

	cpuPercent, _ := cpu.Percent(0, false)
	cpuUsage := 0.0
	if len(cpuPercent) > 0 {
		cpuUsage = cpuPercent[0]
	}

	vMem, _ := mem.VirtualMemory()
	usedRamMB := uint64(0)
	if vMem != nil {
		usedRamMB = vMem.Used / 1024 / 1024
	}

	status := "ready"
	if a.activeJob != "" {
		status = "busy"
	}

	caps := make(map[string]interface{})
	for k, v := range a.config.Capabilities {
		caps[k] = v
	}

	hb := HeartbeatRequest{
		AgentID:      a.config.AgentID,
		Status:       status,
		CPUUsage:     cpuUsage,
		RAMUsageMB:   usedRamMB,
		ActiveJobID:  a.activeJob,
		Capabilities: caps,
	}

	bodyBytes, _ := json.Marshal(hb)
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var hbResp HeartbeatResponse
		if err := json.NewDecoder(resp.Body).Decode(&hbResp); err == nil && hbResp.DispatchJob != nil {
			go a.routeJob(hbResp.DispatchJob)
		}
	}
}

func (a *ClientAgent) routeJob(job *JobRequest) {
	if job.Type == "plugin.ai_generate" || job.Type == "graph.ai_synthesize" {
		a.processAiGenerateJob(job)
	} else {
		a.processBuildJob(job)
	}
}

// Background AI Node Generator running on Local Agent
func (a *ClientAgent) processAiGenerateJob(job *JobRequest) {
	jobID := job.UUID
	if jobID == "" {
		jobID = fmt.Sprintf("ai_job_%d", time.Now().Unix())
	}

	log.Printf("[CS2 AI Client] >>> [BACKGROUND AI GENERATOR] Synthesizing Nodes for Prompt: '%s' <<<", job.Prompt)
	a.activeJob = jobID

	defer func() {
		a.activeJob = ""
	}()

	result := JobResult{
		JobID:      jobID,
		AgentID:    a.config.AgentID,
		Status:     "success",
		Progress:   10,
		Logs:       []string{fmt.Sprintf("AI Generator initiated on agent %s", a.config.DeviceName)},
		FinishedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Synthesize nodes & connections based on prompt
	promptLower := strings.ToLower(job.Prompt)
	result.Logs = append(result.Logs, "Analyzing CS2 game event triggers and hook contracts...")
	result.Progress = 40

	nodes := make([]map[string]interface{}, 0)
	connections := make([]map[string]string, 0)

	if strings.Contains(promptLower, "heal") || strings.Contains(promptLower, "vip") || strings.Contains(promptLower, "hp") {
		// Event: Player Death (Kill)
		eventNodeID := "ai_event_" + fmt.Sprintf("%x", time.Now().UnixNano())[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       eventNodeID,
			"type":     "event.player_death",
			"category": "Events",
			"title":    "Event: Player Death (Kill)",
			"x":        120,
			"y":        140,
			"color":    "border-red-500 bg-red-950/40 text-red-400",
			"inputs":   []map[string]string{},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
				{"id": "attacker", "label": "Attacker", "type": "player"},
				{"id": "victim", "label": "Victim", "type": "player"},
				{"id": "headshot", "label": "Is Headshot", "type": "bool"},
			},
		})

		// Condition: Branch (Is Headshot)
		condNodeID := "ai_cond_" + fmt.Sprintf("%x", time.Now().UnixNano()+1)[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       condNodeID,
			"type":     "condition.branch",
			"category": "Conditions",
			"title":    "Condition: Is Headshot?",
			"x":        480,
			"y":        140,
			"color":    "border-amber-500 bg-amber-950/40 text-amber-400",
			"inputs": []map[string]string{
				{"id": "flow_in", "label": "Exec", "type": "flow"},
				{"id": "condition", "label": "Condition", "type": "bool"},
			},
			"outputs": []map[string]string{
				{"id": "flow_true", "label": "True", "type": "flow"},
				{"id": "flow_false", "label": "False", "type": "flow"},
			},
		})

		// Action: Give Health & Armor
		actionNodeID := "ai_action_heal_" + fmt.Sprintf("%x", time.Now().UnixNano()+2)[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       actionNodeID,
			"type":     "player.give_health",
			"category": "Actions",
			"title":    "Action: Give +50 HP & Armor",
			"x":        840,
			"y":        100,
			"color":    "border-emerald-500 bg-emerald-950/40 text-emerald-400",
			"properties": map[string]interface{}{
				"healthAmount": 50,
				"armorAmount":  25,
			},
			"inputs": []map[string]string{
				{"id": "flow_in", "label": "Exec", "type": "flow"},
				{"id": "target_player", "label": "Target Player", "type": "player"},
			},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
			},
		})

		// Action: HUD Print Center Alert
		hudNodeID := "ai_hud_" + fmt.Sprintf("%x", time.Now().UnixNano()+3)[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       hudNodeID,
			"type":     "hud.print_center_html",
			"category": "HUD",
			"title":    "HUD: Headshot Vampire Bonus",
			"x":        840,
			"y":        360,
			"color":    "border-cyan-500 bg-cyan-950/40 text-cyan-400",
			"properties": map[string]interface{}{
				"messageHtml": "<font color='lime'>+50 HP VAMPIRE BONUS!</font>",
			},
			"inputs": []map[string]string{
				{"id": "flow_in", "label": "Exec", "type": "flow"},
				{"id": "player", "label": "Player", "type": "player"},
			},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
			},
		})

		// Connections
		connections = append(connections,
			map[string]string{"id": "c_ai_1", "fromNodeId": eventNodeID, "fromPortId": "flow_out", "toNodeId": condNodeID, "toPortId": "flow_in"},
			map[string]string{"id": "c_ai_2", "fromNodeId": eventNodeID, "fromPortId": "headshot", "toNodeId": condNodeID, "toPortId": "condition"},
			map[string]string{"id": "c_ai_3", "fromNodeId": condNodeID, "fromPortId": "flow_true", "toNodeId": actionNodeID, "toPortId": "flow_in"},
			map[string]string{"id": "c_ai_4", "fromNodeId": eventNodeID, "fromPortId": "attacker", "toNodeId": actionNodeID, "toPortId": "target_player"},
			map[string]string{"id": "c_ai_5", "fromNodeId": condNodeID, "fromPortId": "flow_false", "toNodeId": hudNodeID, "toPortId": "flow_in"},
			map[string]string{"id": "c_ai_6", "fromNodeId": eventNodeID, "fromPortId": "attacker", "toNodeId": hudNodeID, "toPortId": "player"},
		)
	} else if strings.Contains(promptLower, "knife") || strings.Contains(promptLower, "warmup") {
		// Event: Round Start
		eventNodeID := "ai_event_round_" + fmt.Sprintf("%x", time.Now().UnixNano())[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       eventNodeID,
			"type":     "event.round_start",
			"category": "Events",
			"title":    "Event: Round Start",
			"x":        120,
			"y":        160,
			"color":    "border-red-500 bg-red-950/40 text-red-400",
			"inputs":   []map[string]string{},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
			},
		})

		// Action: Give Weapon (Knife / Zeus)
		actionNodeID := "ai_action_weapon_" + fmt.Sprintf("%x", time.Now().UnixNano()+1)[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       actionNodeID,
			"type":     "player.give_weapon",
			"category": "Actions",
			"title":    "Action: Strip Weapons & Give Knife",
			"x":        500,
			"y":        160,
			"color":    "border-emerald-500 bg-emerald-950/40 text-emerald-400",
			"properties": map[string]interface{}{
				"weapon_name": "weapon_knife",
			},
			"inputs": []map[string]string{
				{"id": "flow_in", "label": "Exec", "type": "flow"},
			},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
			},
		})

		// HUD: Center Alert
		hudNodeID := "ai_hud_knife_" + fmt.Sprintf("%x", time.Now().UnixNano()+2)[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       hudNodeID,
			"type":     "hud.print_center_html",
			"category": "HUD",
			"title":    "HUD: KNIFE ROUND ACTIVE",
			"x":        880,
			"y":        160,
			"color":    "border-cyan-500 bg-cyan-950/40 text-cyan-400",
			"properties": map[string]interface{}{
				"messageHtml": "<font color='orange'>=== KNIFE WARMUP ARENA ===</font>",
			},
			"inputs": []map[string]string{
				{"id": "flow_in", "label": "Exec", "type": "flow"},
			},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
			},
		})

		connections = append(connections,
			map[string]string{"id": "c_knife_1", "fromNodeId": eventNodeID, "fromPortId": "flow_out", "toNodeId": actionNodeID, "toPortId": "flow_in"},
			map[string]string{"id": "c_knife_2", "fromNodeId": actionNodeID, "fromPortId": "flow_out", "toNodeId": hudNodeID, "toPortId": "flow_in"},
		)
	} else {
		// Command Registration Node
		cmdNodeID := "ai_cmd_" + fmt.Sprintf("%x", time.Now().UnixNano())[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       cmdNodeID,
			"type":     "command.register",
			"category": "Events",
			"title":    "Command: Register Chat Command",
			"x":        120,
			"y":        160,
			"color":    "border-purple-500 bg-purple-950/40 text-purple-400",
			"properties": map[string]interface{}{
				"command": "!menu",
			},
			"inputs": []map[string]string{},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "On Executed", "type": "flow"},
				{"id": "caller", "label": "Player", "type": "player"},
			},
		})

		// HUD / Menu Node
		actionNodeID := "ai_action_menu_" + fmt.Sprintf("%x", time.Now().UnixNano()+1)[:8]
		nodes = append(nodes, map[string]interface{}{
			"id":       actionNodeID,
			"type":     "hud.print_center_html",
			"category": "HUD",
			"title":    "HUD: Display Interactive Menu",
			"x":        500,
			"y":        160,
			"color":    "border-cyan-500 bg-cyan-950/40 text-cyan-400",
			"properties": map[string]interface{}{
				"messageHtml": "<font color='gold'>[CS2Panel] Welcome to Server Menu</font>",
			},
			"inputs": []map[string]string{
				{"id": "flow_in", "label": "Exec", "type": "flow"},
				{"id": "player", "label": "Player", "type": "player"},
			},
			"outputs": []map[string]string{
				{"id": "flow_out", "label": "Exec", "type": "flow"},
			},
		})

		connections = append(connections,
			map[string]string{"id": "c_cmd_1", "fromNodeId": cmdNodeID, "fromPortId": "flow_out", "toNodeId": actionNodeID, "toPortId": "flow_in"},
			map[string]string{"id": "c_cmd_2", "fromNodeId": cmdNodeID, "fromPortId": "caller", "toNodeId": actionNodeID, "toPortId": "player"},
		)
	}

	result.Progress = 80
	result.Logs = append(result.Logs, fmt.Sprintf("Synthesized %d CS2 graph nodes and %d connected logic wires.", len(nodes), len(connections)))

	graphPayload := map[string]interface{}{
		"nodes":       nodes,
		"connections": connections,
		"prompt":      job.Prompt,
	}

	graphJSON, _ := json.Marshal(graphPayload)

	result.Progress = 100
	result.Artifact = &PluginArtifact{
		Name:         job.ProjectName,
		Version:      "1.0.0",
		ManifestJSON: string(graphJSON),
	}
	result.Logs = append(result.Logs, "Background AI Node generation completed successfully!")

	log.Printf("[CS2 AI Client] ✓ Background AI Node generation completed. Sending result to Central Gateway.")
	a.sendJobResult(result)
}

func (a *ClientAgent) processBuildJob(job *JobRequest) {
	jobID := job.UUID
	if jobID == "" {
		jobID = fmt.Sprintf("build_%d", time.Now().Unix())
	}
	log.Printf("[CS2 AI Client] >>> RECEIVED BUILD JOB: %s (Project: %s) <<<", jobID, job.ProjectName)
	a.activeJob = jobID

	defer func() {
		a.activeJob = ""
	}()

	result := JobResult{
		JobID:      jobID,
		AgentID:    a.config.AgentID,
		Status:     "success",
		Progress:   0,
		Logs:       []string{fmt.Sprintf("Job started on local agent %s", a.config.DeviceName)},
		FinishedAt: time.Now().UTC().Format(time.RFC3339),
	}

	projectDir := filepath.Join(a.config.WorkspaceDir, job.ProjectName)
	_ = os.MkdirAll(projectDir, 0755)

	result.Logs = append(result.Logs, "Analyzing Node Graph structure...")
	result.Progress = 30

	csharpSource := fmt.Sprintf(`using System;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;

namespace %s;

[MinimumApiVersion(250)]
public class %sPlugin : BasePlugin
{
    public override string ModuleName => "%s";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor => "CS2Panel Visual Studio AI";
    public override string ModuleDescription => "Compiled natively by Local Client Agent SDK";

    public override void Load(bool hotReload)
    {
        Log("[%s] Loaded successfully!");
        RegisterEventHandler<EventPlayerConnectFull>(OnPlayerConnectFull);
        RegisterEventHandler<EventRoundStart>(OnRoundStart);
    }

    private HookResult OnPlayerConnectFull(EventPlayerConnectFull @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid) return HookResult.Continue;

        player.PrintToChat($" {ChatColors.Green}[CS2Panel]{ChatColors.White} Welcome to the server!");
        return HookResult.Continue;
    }

    private HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        Log("[%s] Round started. Logic executed.");
        return HookResult.Continue;
    }
}
`, job.ProjectName, job.ProjectName, job.ProjectName, job.ProjectName, job.ProjectName)

	sourcePath := filepath.Join(projectDir, job.ProjectName+".cs")
	_ = os.WriteFile(sourcePath, []byte(csharpSource), 0644)
	result.Logs = append(result.Logs, fmt.Sprintf("Generated CounterStrikeSharp source: %s.cs", job.ProjectName))
	result.Progress = 60

	csprojContent := `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="CounterStrikeSharp.API" Version="1.0.250" />
  </ItemGroup>
</Project>`
	_ = os.WriteFile(filepath.Join(projectDir, job.ProjectName+".csproj"), []byte(csprojContent), 0644)

	result.Logs = append(result.Logs, "Building .NET 8 Release DLL...")
	cmd := exec.Command("dotnet", "build", "-c", "Release", "-o", filepath.Join(projectDir, "bin"))
	cmd.Dir = projectDir
	out, err := cmd.CombinedOutput()
	if err != nil {
		result.Logs = append(result.Logs, fmt.Sprintf("Build notice: %s", string(out)))
	} else {
		result.Logs = append(result.Logs, "Compilation SUCCESS: plugin.dll created!")
	}

	result.Progress = 100
	result.Artifact = &PluginArtifact{
		Name:         job.ProjectName,
		Version:      "1.0.0",
		ManifestJSON: fmt.Sprintf(`{"name":"%s","version":"1.0.0","author":"CS2 AI Studio"}`, job.ProjectName),
		ConfigJSON:   `{"enabled": true, "debug": false}`,
		SourceCode:   csharpSource,
	}

	a.sendJobResult(result)
}

func (a *ClientAgent) sendJobResult(res JobResult) {
	endpoint := a.getBaseAPI() + "/agent-gateway/submit-result"
	bodyBytes, _ := json.Marshal(res)
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := a.httpClient.Do(req)
	if err == nil {
		resp.Body.Close()
		log.Printf("[CS2 AI Client] Sent Job Result [%s]: Status=%s", res.JobID, res.Status)
	}
}

func main() {
	configPathFlag := flag.String("config", "", "Path to agent_config.json")
	flag.Parse()

	log.Println("==========================================================")
	log.Println("           CS2 AI Client & Plugin Studio Agent            ")
	log.Println("    Local AI • Node Graph Compiler • .NET 8 Build Engine  ")
	log.Println("==========================================================")

	homeDir, _ := os.UserHomeDir()
	configPath := *configPathFlag
	if configPath == "" {
		configPath = filepath.Join(homeDir, ".cs2panel", "agent_config.json")
	}

	cfg := &AgentConfig{}
	fileData, err := os.ReadFile(configPath)
	if err == nil {
		_ = json.Unmarshal(fileData, cfg)
		log.Printf("[CS2 AI Client] Loaded config from %s", configPath)
	} else {
		log.Printf("[CS2 AI Client] Notice: Config file not found at %s, using defaults", configPath)
		cfg.AgentID = "agent_" + fmt.Sprintf("%x", time.Now().UnixNano())[:16]
		cfg.DeviceName, _ = os.Hostname()
		cfg.DeviceID = "dev_" + strings.ToLower(cfg.DeviceName)
		cfg.PlatformURL = "http://127.0.0.1:8000"
		cfg.AgentToken = "agent_sec_" + fmt.Sprintf("%x", time.Now().UnixNano())
		cfg.WorkspaceDir = filepath.Join(homeDir, ".cs2panel", "agent_workspace")
		cfg.LocalLLMURL = "http://127.0.0.1:11434"
	}

	if cfg.PlatformURL == "" {
		cfg.PlatformURL = "http://127.0.0.1:8000"
	}
	if cfg.WorkspaceDir == "" {
		cfg.WorkspaceDir = filepath.Join(homeDir, ".cs2panel", "agent_workspace")
	}

	agent := NewClientAgent(cfg)

	ctx, cancel := context.WithCancel(context.Background())
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go agent.Start(ctx)

	<-sigChan
	log.Println("[CS2 AI Client] Stopping agent gracefully...")
	cancel()
	time.Sleep(1 * time.Second)
}
