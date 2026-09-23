//go:build !windows

package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

const ServiceFilePath = "/etc/systemd/system/cs2agent.service"

func installService() error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	cleanExePath, _ := filepath.Abs(exePath)
	configPath := "/etc/cs2panel/agent_config.json"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		homeDir, _ := os.UserHomeDir()
		configPath = filepath.Join(homeDir, ".cs2panel", "agent_config.json")
	}

	serviceUnit := fmt.Sprintf(`[Unit]
Description=CS2Panel Autonomous AI Swarm Agent
After=network.target

[Service]
Type=simple
ExecStart=%s -config %s -headless
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
`, cleanExePath, configPath)

	log.Printf("[SERVICE] Writing systemd unit to %s...", ServiceFilePath)
	if err := os.WriteFile(ServiceFilePath, []byte(serviceUnit), 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w (are you running as root/sudo?)", ServiceFilePath, err)
	}

	_ = exec.Command("systemctl", "daemon-reload").Run()
	_ = exec.Command("systemctl", "enable", "--now", "cs2agent").Run()

	log.Printf("[SERVICE] ✓ Successfully installed and started cs2agent.service via systemd!")
	return nil
}

func uninstallService() error {
	log.Printf("[SERVICE] Stopping and disabling cs2agent.service...")
	_ = exec.Command("systemctl", "stop", "cs2agent").Run()
	_ = exec.Command("systemctl", "disable", "cs2agent").Run()
	_ = os.Remove(ServiceFilePath)
	_ = exec.Command("systemctl", "daemon-reload").Run()
	log.Printf("[SERVICE] ✓ Removed cs2agent systemd service.")
	return nil
}
