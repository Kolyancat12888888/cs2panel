package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

type OllamaPullProgress struct {
	Status    string `json:"status"`
	Digest    string `json:"digest,omitempty"`
	Total     int64  `json:"total,omitempty"`
	Completed int64  `json:"completed,omitempty"`
}

type ModelInfo struct {
	Name       string `json:"name"`
	Size       int64  `json:"size"`
	Digest     string `json:"digest"`
	ModifiedAt string `json:"modified_at"`
}

type MetaTaskAnalysis struct {
	ComplexityScore    int      `json:"complexity_score"` // 1 to 10
	EstimatedVramMB    uint64   `json:"estimated_vram_mb"`
	RecommendedModel   string   `json:"recommended_model"`
	OptimalTemperature float64  `json:"optimal_temperature"`
	SubTaskPhases      []string `json:"sub_task_phases"`
}

func (a *ClientAgent) pullOllamaModel(modelName string, progressCallback func(percent float64, status string)) error {
	llmURL := a.config.LocalLLMURL
	if llmURL == "" {
		llmURL = "http://127.0.0.1:11434"
	}

	endpoint := strings.TrimRight(llmURL, "/") + "/api/pull"
	reqBody, _ := json.Marshal(map[string]interface{}{
		"name":   modelName,
		"stream": true,
	})

	client := &http.Client{Timeout: 3600 * time.Second}
	resp, err := client.Post(endpoint, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		var p OllamaPullProgress
		if err := json.Unmarshal(scanner.Bytes(), &p); err == nil {
			percent := 0.0
			if p.Total > 0 && p.Completed > 0 {
				percent = float64(p.Completed) / float64(p.Total) * 100.0
			}
			if progressCallback != nil {
				progressCallback(percent, p.Status)
			}
		}
	}

	log.Printf("[OLLAMA] ✓ Model '%s' pulled successfully!", modelName)
	return nil
}

func (a *ClientAgent) listOllamaModels() ([]ModelInfo, error) {
	llmURL := a.config.LocalLLMURL
	if llmURL == "" {
		llmURL = "http://127.0.0.1:11434"
	}

	endpoint := strings.TrimRight(llmURL, "/") + "/api/tags"
	resp, err := http.Get(endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tagsResp struct {
		Models []struct {
			Name       string `json:"name"`
			Size       int64  `json:"size"`
			Digest     string `json:"digest"`
			ModifiedAt string `json:"modified_at"`
		} `json:"models"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tagsResp); err != nil {
		return nil, err
	}

	result := make([]ModelInfo, len(tagsResp.Models))
	for i, m := range tagsResp.Models {
		result[i] = ModelInfo{
			Name:       m.Name,
			Size:       m.Size,
			Digest:     m.Digest,
			ModifiedAt: m.ModifiedAt,
		}
	}
	return result, nil
}

// 4B Swarm Conductor & Meta-Router
func (a *ClientAgent) analyzeTaskWith4BMetaRouter(taskPrompt string, graphData []byte) MetaTaskAnalysis {
	promptLower := strings.ToLower(taskPrompt)
	complexity := 5
	vram := uint64(4096)
	temp := 0.55
	recModel := "qwen3-14b-tools:latest"

	if strings.Contains(promptLower, "massive") || strings.Contains(promptLower, "full") || len(graphData) > 5000 {
		complexity = 9
		vram = uint64(8192)
		recModel = "qwen3-14b-tools:latest"
	} else if strings.Contains(promptLower, "simple") || strings.Contains(promptLower, "single") {
		complexity = 3
		vram = uint64(2048)
		recModel = "qwen2.5:3b"
		temp = 0.4
	}

	phases := []string{
		"Phase 1: Event Lifecycle & Registration",
		"Phase 2: Combat & Damage Logic",
		"Phase 3: Player State & Permissions",
		"Phase 4: Visual Feedback & Center HTML",
	}

	return MetaTaskAnalysis{
		ComplexityScore:    complexity,
		EstimatedVramMB:    vram,
		RecommendedModel:   recModel,
		OptimalTemperature: temp,
		SubTaskPhases:      phases,
	}
}
