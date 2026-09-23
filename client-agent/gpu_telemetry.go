package main

import (
	"os/exec"
	"strconv"
	"strings"
)

type GpuTelemetry struct {
	HasGPU            bool    `json:"has_gpu"`
	Model             string  `json:"model"`
	VRAMTotalMB       uint64  `json:"vram_total_mb"`
	VRAMUsedMB        uint64  `json:"vram_used_mb"`
	VRAMFreeMB        uint64  `json:"vram_free_mb"`
	GpuUtilizationPct float64 `json:"gpu_utilization_pct"`
	TemperatureC      int     `json:"temperature_c"`
}

func detectGpuTelemetry() GpuTelemetry {
	res := GpuTelemetry{
		HasGPU: false,
		Model:  "CPU Compute Only",
	}

	// 1. Try nvidia-smi
	cmd := exec.Command("nvidia-smi", "--query-gpu=gpu_name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits")
	out, err := cmd.Output()
	if err == nil && len(out) > 0 {
		lines := strings.Split(strings.TrimSpace(string(out)), "\n")
		if len(lines) > 0 {
			parts := strings.Split(lines[0], ",")
			if len(parts) >= 6 {
				res.HasGPU = true
				res.Model = strings.TrimSpace(parts[0])
				total, _ := strconv.ParseUint(strings.TrimSpace(parts[1]), 10, 64)
				used, _ := strconv.ParseUint(strings.TrimSpace(parts[2]), 10, 64)
				free, _ := strconv.ParseUint(strings.TrimSpace(parts[3]), 10, 64)
				util, _ := strconv.ParseFloat(strings.TrimSpace(parts[4]), 64)
				temp, _ := strconv.Atoi(strings.TrimSpace(parts[5]))

				res.VRAMTotalMB = total
				res.VRAMUsedMB = used
				res.VRAMFreeMB = free
				res.GpuUtilizationPct = util
				res.TemperatureC = temp
				return res
			}
		}
	}

	return res
}
