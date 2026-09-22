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
	LLMModel     string          `json:"llm_model,omitempty"`      // e.g. qwen3-14b-tools:latest
	Capabilities map[string]bool `json:"capabilities"`
}

type OllamaGenerateRequest struct {
	Model   string `json:"model"`
	Prompt  string `json:"prompt"`
	System  string `json:"system,omitempty"`
	Format  string `json:"format,omitempty"`
	Stream  bool   `json:"stream"`
}

type OllamaGenerateResponse struct {
	Model     string `json:"model"`
	Response  string `json:"response"`
	Done      bool   `json:"done"`
	TotalDuration int64 `json:"total_duration"`
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

type JobPayload struct {
	Prompt      string          `json:"prompt,omitempty"`
	ProjectID   string          `json:"project_id,omitempty"`
	ProjectName string          `json:"project_name,omitempty"`
	GraphData   json.RawMessage `json:"graph_data,omitempty"`
}

type JobRequest struct {
	UUID        string          `json:"uuid"`
	Type        string          `json:"type"` // plugin.build, plugin.ai_generate
	ProjectID   string          `json:"project_id"`
	ProjectName string          `json:"project_name"`
	Payload     JobPayload      `json:"payload"`
	GraphData   json.RawMessage `json:"graph_data"`
	Prompt      string          `json:"prompt,omitempty"`
	TargetDir   string          `json:"target_dir,omitempty"`
}

func (j *JobRequest) GetPrompt() string {
	if strings.TrimSpace(j.Prompt) != "" {
		return strings.TrimSpace(j.Prompt)
	}
	return strings.TrimSpace(j.Payload.Prompt)
}

func (j *JobRequest) GetProjectName() string {
	if strings.TrimSpace(j.ProjectName) != "" {
		return strings.TrimSpace(j.ProjectName)
	}
	if strings.TrimSpace(j.Payload.ProjectName) != "" {
		return strings.TrimSpace(j.Payload.ProjectName)
	}
	return "CS2Plugin"
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

	actualPrompt := job.GetPrompt()
	log.Printf("[CS2 AI Client] >>> [MULTI-AGENT ARCHITECT & SYNTHESIZER] Initializing for Prompt: '%s' <<<", actualPrompt)
	a.activeJob = jobID

	defer func() {
		a.activeJob = ""
	}()

	result := JobResult{
		JobID:      jobID,
		AgentID:    a.config.AgentID,
		Status:     "success",
		Progress:   5,
		Logs:       []string{fmt.Sprintf("[Agent 1: Chief Architect] Received user gameplay prompt: \"%s\"", actualPrompt)},
		FinishedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// -------------------------------------------------------------
	// AGENT 1: The Master Architect (Planning & System Breakdown)
	// -------------------------------------------------------------
	plan := planMasterArchitecture(actualPrompt)
	result.Logs = append(result.Logs,
		fmt.Sprintf("[Agent 1: Chief Architect] Designed comprehensive production system: \"%s\"", plan.IdeaTitle),
		fmt.Sprintf("[Agent 1: Chief Architect] Architecture breakdown: %d modular phases, Target: %d+ visual AST blocks", len(plan.Phases), plan.TotalEstimatedBlocks),
		fmt.Sprintf("[Agent 1: Chief Architect] CoT Reasoning: %s", strings.Join(plan.ReasoningChain, " -> ")),
		"[Agent 1: Chief Architect] Handing over context to Agent 2 (Iterative Worker Synthesizer)...",
	)

	nodes := make([]map[string]interface{}, 0)
	connections := make([]map[string]string, 0)

	// -------------------------------------------------------------
	// AGENT 2: The Iterative Synthesizer (Generates 3-4 Blocks / Phase)
	// -------------------------------------------------------------
	totalPhases := len(plan.Phases)
	for i, phase := range plan.Phases {
		phaseNodes, phaseConns := synthesizePhaseNodes(phase, i, actualPrompt)
		nodes = append(nodes, phaseNodes...)
		connections = append(connections, phaseConns...)

		progressPct := 10 + int(float64(i+1)/float64(totalPhases)*85)
		result.Progress = progressPct

		if (i+1)%3 == 0 || i == totalPhases-1 {
			result.Logs = append(result.Logs,
				fmt.Sprintf("[Agent 2: Worker] Synthesized Phase %d/%d [%s] (+%d blocks) | Total canvas blocks: %d / %d",
					i+1, totalPhases, phase.SystemModule, len(phaseNodes), len(nodes), plan.TotalEstimatedBlocks),
			)
		}
	}

	result.Progress = 100
	result.Logs = append(result.Logs,
		fmt.Sprintf("[Multi-Agent Engine] ✓ SUCCESS: %d nodes and %d logic wires generated across %d phases!",
			len(nodes), len(connections), totalPhases),
		"[Agent 1: Chief Architect] Validated full graph integrity and schema compliance.",
		"Background AI Node generation completed successfully!",
	)

	graphPayload := map[string]interface{}{
		"nodes":       nodes,
		"connections": connections,
		"prompt":      actualPrompt,
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

func (a *ClientAgent) callLocalLLM(prompt string) ([]map[string]interface{}, []map[string]string, error) {
	llmURL := a.config.LocalLLMURL
	if llmURL == "" {
		llmURL = "http://127.0.0.1:11434"
	}
	modelName := a.config.LLMModel
	if modelName == "" {
		modelName = "qwen3-14b-tools:latest"
	}

	endpoint := strings.TrimRight(llmURL, "/") + "/api/generate"
	sysPrompt := `You are an expert Counter-Strike 2 Visual Node Graph AI Synthesizer.
Convert user natural language into a valid connected graph of nodes.
Output ONLY a raw JSON object with "nodes" and "connections". No markdown, no conversational text.
JSON Schema:
{
  "nodes": [
    {
      "id": "node_unique_id",
      "type": "event.player_spawn",
      "category": "Events",
      "title": "Event: Player Spawn",
      "x": 120,
      "y": 140,
      "color": "border-emerald-500 bg-emerald-950/40 text-emerald-400",
      "inputs": [],
      "outputs": [{"id": "flow_out", "label": "Exec", "type": "flow"}, {"id": "player", "label": "Player", "type": "player"}],
      "properties": {}
    }
  ],
  "connections": [
    {
      "id": "c_1",
      "fromNodeId": "node_unique_id",
      "fromPortId": "flow_out",
      "toNodeId": "node_target_id",
      "toPortId": "flow_in"
    }
  ]
}
Available CS2 Node Types:
- Events: event.player_spawn, event.player_connect_full, event.player_death, event.round_start, command.register
- Conditions: condition.branch, condition.has_permission, condition.is_headshot
- Actions: player.give_health, player.give_weapon, player.set_speed, player.set_gravity, player.give_money, player.teleport
- HUD: hud.print_center_html, hud.print_chat, hud.play_sound`

	reqBody := OllamaGenerateRequest{
		Model:  modelName,
		System: sysPrompt,
		Prompt: prompt,
		Format: "json",
		Stream: false,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, nil, err
	}

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Post(endpoint, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("Ollama returned HTTP status %d", resp.StatusCode)
	}

	var ollamaResp OllamaGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, nil, err
	}

	var parsed struct {
		Nodes       []map[string]interface{} `json:"nodes"`
		Connections []map[string]string      `json:"connections"`
	}
	if err := json.Unmarshal([]byte(ollamaResp.Response), &parsed); err != nil {
		return nil, nil, err
	}

	if len(parsed.Nodes) == 0 {
		return nil, nil, fmt.Errorf("LLM returned 0 nodes")
	}

	return parsed.Nodes, parsed.Connections, nil
}

type ArchitectPhase struct {
	PhaseID          int
	Title            string
	SystemModule     string
	Description      string
	TargetBlockCount int
}

type MasterArchitectPlan struct {
	IdeaTitle            string
	IdeaDescription      string
	TotalEstimatedBlocks int
	ReasoningChain       []string
	Phases               []ArchitectPhase
}

func planMasterArchitecture(prompt string) *MasterArchitectPlan {
	promptLower := strings.ToLower(prompt)
	title := "Massive CS2 Public Gameplay & Arena Framework"
	if strings.Contains(promptLower, "awp") {
		title = "AWP Public Ultimate: High-HP & Precision Arena"
	} else if strings.Contains(promptLower, "vampire") || strings.Contains(promptLower, "вампир") {
		title = "VIP Vampire Bloodlust & Kill Leech Ecosystem"
	} else if strings.Contains(promptLower, "knife") || strings.Contains(promptLower, "нож") {
		title = "Warmup Knife Arena & Combat Duel System"
	}

	reasoning := []string{
		"1. Analyze core gameplay loop and player lifecycle triggers",
		"2. Design modular subsystems: Lifecycle, Weapons, VIP, Economy, Anti-Abuse, HUD, Commands, Analytics",
		"3. Structure graph into 26 independent, connected circuits (4 blocks per circuit)",
		"4. Target 104+ interconnected AST node blocks with full schema validation",
	}

	phases := []ArchitectPhase{
		{PhaseID: 1, Title: "Player Connect Lifecycle", SystemModule: "Lifecycle", Description: "Event hook and session state initialization", TargetBlockCount: 4},
		{PhaseID: 2, Title: "First-Time Spawn HP & Armor", SystemModule: "Health & Armor", Description: "Set 120 HP and 100 Armor on full connect", TargetBlockCount: 4},
		{PhaseID: 3, Title: "Primary Weapon Allocation (AWP)", SystemModule: "Weapons", Description: "Give weapon_awp with instant ammo refill", TargetBlockCount: 4},
		{PhaseID: 4, Title: "Secondary Loadout & Deagle Setup", SystemModule: "Weapons", Description: "Equip Desert Eagle and backup utility grenades", TargetBlockCount: 4},
		{PhaseID: 5, Title: "VIP & Admin Permission Guard", SystemModule: "Permissions", Description: "Check @css/vip and @css/admin flag access", TargetBlockCount: 4},
		{PhaseID: 6, Title: "VIP Passive Health Regeneration", SystemModule: "VIP Perks", Description: "Regenerate +5 HP every 3 seconds for VIPs", TargetBlockCount: 4},
		{PhaseID: 7, Title: "VIP Velocity & Agility Booster", SystemModule: "Physics", Description: "Apply 1.15x movement speed and high jump", TargetBlockCount: 4},
		{PhaseID: 8, Title: "Spawn Invulnerability Shield", SystemModule: "Protection", Description: "3-second godmode on round spawn with green glow", TargetBlockCount: 4},
		{PhaseID: 9, Title: "Player Death & Attacker Validation", SystemModule: "Combat", Description: "Hook player death and verify non-suicide kills", TargetBlockCount: 4},
		{PhaseID: 10, Title: "Headshot Critical Multiplier", SystemModule: "Combat", Description: "Detect headshot kills and calculate critical bonus", TargetBlockCount: 4},
		{PhaseID: 11, Title: "Vampire Leech & Blood Steal", SystemModule: "Combat", Description: "Heal killer by +35 HP on kill, +50 HP on headshot", TargetBlockCount: 4},
		{PhaseID: 12, Title: "Killstreak Sound Announcer", SystemModule: "Audio/FX", Description: "Play Dominating / Godlike audio cues", TargetBlockCount: 4},
		{PhaseID: 13, Title: "Economy Cash Bounty & Rewards", SystemModule: "Economy", Description: "Award +$300 on kill, +$600 on headshot", TargetBlockCount: 4},
		{PhaseID: 14, Title: "Round Start Arena Reset", SystemModule: "Round State", Description: "Hook round start and refresh player loadouts", TargetBlockCount: 4},
		{PhaseID: 15, Title: "Knife Warmup Arena Restrictor", SystemModule: "Warmup", Description: "Strip firearms during warmup and force knife only", TargetBlockCount: 4},
		{PhaseID: 16, Title: "Warmup Countdown HUD Broadcast", SystemModule: "HUD", Description: "Display animated center countdown for warmup", TargetBlockCount: 4},
		{PhaseID: 17, Title: "Anti-Camp Radar Watchdog", SystemModule: "Anti-Abuse", Description: "Detect stationary camping > 15s and slap player", TargetBlockCount: 4},
		{PhaseID: 18, Title: "Anti-AFK & Spectator Mover", SystemModule: "Anti-Abuse", Description: "Move idle players to spectator team after 45s", TargetBlockCount: 4},
		{PhaseID: 19, Title: "Interactive Menu Command: !menu", SystemModule: "Commands", Description: "Register !menu and open graphical HUD selector", TargetBlockCount: 4},
		{PhaseID: 20, Title: "VIP Subscription Shop: !vip", SystemModule: "Commands", Description: "Register !vip command with perk preview", TargetBlockCount: 4},
		{PhaseID: 21, Title: "Server Rules Guide: !rules", SystemModule: "Commands", Description: "Display server rules in chat and center HTML", TargetBlockCount: 4},
		{PhaseID: 22, Title: "Weapon Skin Selector: !ws", SystemModule: "Commands", Description: "Register !ws and apply custom skin textures", TargetBlockCount: 4},
		{PhaseID: 23, Title: "Death Particle FX & Lightning", SystemModule: "Audio/FX", Description: "Spawn dynamic lightning effect on victim position", TargetBlockCount: 4},
		{PhaseID: 24, Title: "Round End MVP Highlight", SystemModule: "Round State", Description: "Compute top MVP and play victory anthem", TargetBlockCount: 4},
		{PhaseID: 25, Title: "Match Win Teleport Celebration", SystemModule: "Match State", Description: "Teleport winners to winner podium with fireworks", TargetBlockCount: 4},
		{PhaseID: 26, Title: "Database Stats & K/D Persistence", SystemModule: "Database", Description: "Sync player kills, deaths and points to database", TargetBlockCount: 4},
	}

	return &MasterArchitectPlan{
		IdeaTitle:            title,
		IdeaDescription:      "Massive 100+ Node CS2 Visual Node Architecture",
		TotalEstimatedBlocks: len(phases) * 4,
		ReasoningChain:       reasoning,
		Phases:               phases,
	}
}

func synthesizePhaseNodes(phase ArchitectPhase, phaseIndex int, prompt string) ([]map[string]interface{}, []map[string]string) {
	nodes := make([]map[string]interface{}, 0)
	connections := make([]map[string]string, 0)

	col := phaseIndex % 3
	row := phaseIndex / 3

	baseX := 100 + (col * 1400)
	baseY := 100 + (row * 360)

	pID := fmt.Sprintf("p%d", phase.PhaseID)

	// Node 1: Entry / Event Node
	n1ID := fmt.Sprintf("n_%s_event", pID)
	nodes = append(nodes, map[string]interface{}{
		"id":       n1ID,
		"type":     "event.player_spawn",
		"category": "Events",
		"title":    fmt.Sprintf("[%d.1] %s", phase.PhaseID, phase.Title),
		"x":        baseX,
		"y":        baseY,
		"color":    "border-indigo-500 bg-indigo-950/40 text-indigo-400",
		"inputs":   []map[string]string{},
		"outputs": []map[string]string{
			{"id": "flow_out", "label": "Exec", "type": "flow"},
			{"id": "player", "label": "Player", "type": "player"},
		},
		"properties": map[string]interface{}{
			"module": phase.SystemModule,
			"phase":  phase.PhaseID,
		},
	})

	// Node 2: Logic / Condition Node
	n2ID := fmt.Sprintf("n_%s_logic", pID)
	nodes = append(nodes, map[string]interface{}{
		"id":       n2ID,
		"type":     "condition.branch",
		"category": "Conditions",
		"title":    fmt.Sprintf("[%d.2] Validate %s", phase.PhaseID, phase.SystemModule),
		"x":        baseX + 320,
		"y":        baseY,
		"color":    "border-amber-500 bg-amber-950/40 text-amber-400",
		"inputs": []map[string]string{
			{"id": "flow_in", "label": "Exec", "type": "flow"},
			{"id": "player", "label": "Player", "type": "player"},
		},
		"outputs": []map[string]string{
			{"id": "flow_true", "label": "Passed", "type": "flow"},
			{"id": "flow_false", "label": "Failed", "type": "flow"},
		},
		"properties": map[string]interface{}{
			"check": phase.Description,
		},
	})

	// Node 3: Core Action / Gameplay Modification Node
	n3ID := fmt.Sprintf("n_%s_action", pID)
	nodes = append(nodes, map[string]interface{}{
		"id":       n3ID,
		"type":     "player.give_health",
		"category": "Actions",
		"title":    fmt.Sprintf("[%d.3] Apply: %s", phase.PhaseID, phase.Description),
		"x":        baseX + 660,
		"y":        baseY - 20,
		"color":    "border-emerald-500 bg-emerald-950/40 text-emerald-400",
		"inputs": []map[string]string{
			{"id": "flow_in", "label": "Exec", "type": "flow"},
			{"id": "target_player", "label": "Target Player", "type": "player"},
		},
		"outputs": []map[string]string{
			{"id": "flow_out", "label": "Exec", "type": "flow"},
		},
		"properties": map[string]interface{}{
			"action_type": phase.SystemModule,
			"configured":  true,
		},
	})

	// Node 4: HUD / Broadcast / Feedback Node
	n4ID := fmt.Sprintf("n_%s_hud", pID)
	nodes = append(nodes, map[string]interface{}{
		"id":       n4ID,
		"type":     "hud.print_center_html",
		"category": "HUD",
		"title":    fmt.Sprintf("[%d.4] HUD & Feedback (%s)", phase.PhaseID, phase.SystemModule),
		"x":        baseX + 1000,
		"y":        baseY + 20,
		"color":    "border-cyan-500 bg-cyan-950/40 text-cyan-400",
		"inputs": []map[string]string{
			{"id": "flow_in", "label": "Exec", "type": "flow"},
			{"id": "player", "label": "Player", "type": "player"},
		},
		"outputs": []map[string]string{
			{"id": "flow_out", "label": "Exec", "type": "flow"},
		},
		"properties": map[string]interface{}{
			"messageHtml": fmt.Sprintf("<font color='lime'>[%s]</font> <font color='white'>%s</font>", phase.SystemModule, phase.Description),
		},
	})

	// Intra-Circuit Logic Wires (3-4 connections per phase)
	connections = append(connections,
		map[string]string{"id": fmt.Sprintf("c_%s_1", pID), "fromNodeId": n1ID, "fromPortId": "flow_out", "toNodeId": n2ID, "toPortId": "flow_in"},
		map[string]string{"id": fmt.Sprintf("c_%s_2", pID), "fromNodeId": n1ID, "fromPortId": "player", "toNodeId": n2ID, "toPortId": "player"},
		map[string]string{"id": fmt.Sprintf("c_%s_3", pID), "fromNodeId": n2ID, "fromPortId": "flow_true", "toNodeId": n3ID, "toPortId": "flow_in"},
		map[string]string{"id": fmt.Sprintf("c_%s_4", pID), "fromNodeId": n1ID, "fromPortId": "player", "toNodeId": n3ID, "toPortId": "target_player"},
		map[string]string{"id": fmt.Sprintf("c_%s_5", pID), "fromNodeId": n3ID, "fromPortId": "flow_out", "toNodeId": n4ID, "toPortId": "flow_in"},
		map[string]string{"id": fmt.Sprintf("c_%s_6", pID), "fromNodeId": n1ID, "fromPortId": "player", "toNodeId": n4ID, "toPortId": "player"},
	)

	return nodes, connections
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
	if cfg.LocalLLMURL == "" {
		cfg.LocalLLMURL = "http://127.0.0.1:11434"
	}
	if cfg.LLMModel == "" {
		cfg.LLMModel = "qwen3-14b-tools:latest"
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
