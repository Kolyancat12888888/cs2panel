//go:build windows

package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

const TaskSchedulerName = "CS2PanelAgent"

func installService() error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	cleanExePath := filepath.Clean(exePath)
	configPath := filepath.Join(filepath.Dir(cleanExePath), "..", "agent_config.json")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		homeDir, _ := os.UserHomeDir()
		configPath = filepath.Join(homeDir, ".cs2panel", "agent_config.json")
	}

	taskCmd := fmt.Sprintf(`"%s" -config "%s" -headless`, cleanExePath, configPath)

	log.Printf("[SERVICE] Registering silent background task in Windows Task Scheduler: '%s'...", TaskSchedulerName)

	// Create highest privilege silent logon task
	cmd := exec.Command("schtasks", "/create", "/tn", TaskSchedulerName, "/tr", taskCmd, "/sc", "onlogon", "/rl", "highest", "/f")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("schtasks creation failed: %s (err: %w)", string(out), err)
	}

	log.Printf("[SERVICE] ✓ Successfully installed '%s' into Windows Task Scheduler!", TaskSchedulerName)
	log.Printf("[SERVICE] Running task immediately in background...")

	_ = exec.Command("schtasks", "/run", "/tn", TaskSchedulerName).Run()
	return nil
}

func uninstallService() error {
	log.Printf("[SERVICE] Unregistering task '%s' from Windows Task Scheduler...", TaskSchedulerName)
	cmd := exec.Command("schtasks", "/delete", "/tn", TaskSchedulerName, "/f")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("schtasks delete failed: %s (err: %w)", string(out), err)
	}
	log.Printf("[SERVICE] ✓ Successfully removed '%s' from Task Scheduler.", TaskSchedulerName)
	return nil
}
