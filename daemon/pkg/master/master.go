package master

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

type MasterManager struct {
	MasterPath   string
	SteamCMDPath string
	mu           sync.RWMutex
	IsUpdating   bool
	LastUpdate   time.Time
	LastError    string
}

func NewMasterManager(masterPath, steamcmdPath string) *MasterManager {
	return &MasterManager{
		MasterPath:   masterPath,
		SteamCMDPath: steamcmdPath,
	}
}

// UpdateMaster runs SteamCMD to download/update CS2 Dedicated Server (App ID 730)
func (m *MasterManager) UpdateMaster(validate bool) error {
	m.mu.Lock()
	if m.IsUpdating {
		m.mu.Unlock()
		return fmt.Errorf("master instance update is already in progress")
	}
	m.IsUpdating = true
	m.mu.Unlock()

	defer func() {
		m.mu.Lock()
		m.IsUpdating = false
		m.mu.Unlock()
	}()

	if err := os.MkdirAll(m.MasterPath, 0755); err != nil {
		m.LastError = err.Error()
		return err
	}

	args := []string{
		"+force_install_dir", m.MasterPath,
		"+login", "anonymous",
		"+app_update", "730",
	}

	if validate {
		args = append(args, "validate")
	}
	args = append(args, "+quit")

	cmd := exec.Command(m.SteamCMDPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		m.LastError = fmt.Sprintf("SteamCMD error: %v, output: %s", err, string(output))
		return fmt.Errorf("steamcmd failed: %w (output: %s)", err, string(output))
	}

	m.mu.Lock()
	m.LastUpdate = time.Now()
	m.LastError = ""
	m.mu.Unlock()

	return nil
}

// CheckMasterHealth validates if essential CS2 engine and game directories exist in master
func (m *MasterManager) CheckMasterHealth() (bool, string) {
	requiredPaths := []string{
		"game/bin/linuxsteamrt64/cs2",
		"game/csgo/steam.inf",
		"game/csgo/pak01_dir.vpk",
	}

	for _, p := range requiredPaths {
		fullPath := filepath.Join(m.MasterPath, p)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			return false, fmt.Sprintf("Missing required master file: %s", p)
		}
	}

	return true, "Master CS2 installation is healthy and complete"
}
