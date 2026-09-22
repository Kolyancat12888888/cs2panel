package symlinks

import (
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// IsolatedDirs lists directories that must NOT be symlinked to master, but must be private to the instance
var IsolatedDirs = []string{
	"game/csgo/addons",
	"game/csgo/cfg",
	"game/csgo/maps",
	"game/csgo/sound",
	"game/csgo/resource/flash",
	"game/csgo/logs",
	"game/csgo/demos",
}

type SymlinkEngine struct {
	MasterPath  string
	ServersRoot string
}

func NewSymlinkEngine(masterPath, serversRoot string) *SymlinkEngine {
	return &SymlinkEngine{
		MasterPath:  masterPath,
		ServersRoot: serversRoot,
	}
}

// InstancePath returns the root filesystem directory for a specific server instance
func (e *SymlinkEngine) InstancePath(serverUUID string) string {
	return filepath.Join(e.ServersRoot, serverUUID)
}

// ProvisionServerInstance creates isolated directories and symlinks from master CS2
func (e *SymlinkEngine) ProvisionServerInstance(serverUUID string) error {
	instanceRoot := e.InstancePath(serverUUID)

	if err := os.MkdirAll(instanceRoot, 0755); err != nil {
		return fmt.Errorf("failed to create instance root: %w", err)
	}

	// 1. Create all isolated directories inside instance
	for _, isolated := range IsolatedDirs {
		dir := filepath.Join(instanceRoot, isolated)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create isolated dir %s: %w", isolated, err)
		}
	}

	// 2. Walk master and link everything else
	err := filepath.WalkDir(e.MasterPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(e.MasterPath, path)
		if err != nil || relPath == "." {
			return nil
		}

		// Normalize to forward slashes for comparison
		normRel := filepath.ToSlash(relPath)

		// Check if this path falls inside an isolated directory
		for _, isolated := range IsolatedDirs {
			if normRel == isolated || strings.HasPrefix(normRel, isolated+"/") {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		targetInInstance := filepath.Join(instanceRoot, relPath)

		if d.IsDir() {
			// For general directories, create corresponding directory in instance
			return os.MkdirAll(targetInInstance, 0755)
		}

		// For files, if link or file already exists, don't recreate
		if _, statErr := os.Lstat(targetInInstance); statErr == nil {
			return nil
		}

		// Create symbolic link to master file
		if err := os.Symlink(path, targetInInstance); err != nil {
			// Fallback to copy small config files if symlink fails, otherwise error
			return fmt.Errorf("failed to symlink %s -> %s: %w", targetInInstance, path, err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("symlink provisioning failed: %w", err)
	}

	// 3. Populate default initial configs if empty
	e.populateDefaultConfigs(instanceRoot)

	return nil
}

func (e *SymlinkEngine) populateDefaultConfigs(instanceRoot string) {
	serverCfgPath := filepath.Join(instanceRoot, "game/csgo/cfg/server.cfg")
	if _, err := os.Stat(serverCfgPath); os.IsNotExist(err) {
		defaultCfg := `// CS2Panel Auto-generated server.cfg
hostname "CS2 Dedicated Server powered by CS2Panel"
sv_cheats 0
sv_lan 0
sv_pure 0
mp_autoteambalance 1
mp_limitteams 1
mp_roundtime 1.92
mp_freezetime 5
mp_warmuptime 60
mp_buytime 20
mp_c4timer 40
mp_maxrounds 24
sv_talk_enemy_living 0
sv_talk_enemy_dead 0
sv_deadtalk 1
sv_full_alltalk 0

// FastDL
// sv_downloadurl "http://YOUR_FASTDL_URL/fastdl/"
// sv_allowdownload 1
// sv_allowupload 1

// Logging
log on
sv_log_onefile 0
sv_logbans 1
sv_logecho 1
sv_logfile 1
`
		_ = os.WriteFile(serverCfgPath, []byte(defaultCfg), 0644)
	}

	gameInfoPath := filepath.Join(instanceRoot, "game/csgo/gameinfo.gi")
	masterGameInfo := filepath.Join(e.MasterPath, "game/csgo/gameinfo.gi")
	// If gameinfo.gi exists in master, copy it so Metamod can safely patch it
	if _, err := os.Stat(masterGameInfo); err == nil {
		if _, err := os.Stat(gameInfoPath); os.IsNotExist(err) {
			_ = copyFile(masterGameInfo, gameInfoPath)
		}
	}
}

// RepairSymlinks checks and repairs broken symlinks for an instance
func (e *SymlinkEngine) RepairSymlinks(serverUUID string) (int, error) {
	instanceRoot := e.InstancePath(serverUUID)
	repairedCount := 0

	err := filepath.WalkDir(instanceRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		relPath, err := filepath.Rel(instanceRoot, path)
		if err != nil || relPath == "." {
			return nil
		}

		normRel := filepath.ToSlash(relPath)
		for _, isolated := range IsolatedDirs {
			if normRel == isolated || strings.HasPrefix(normRel, isolated+"/") {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		info, err := os.Lstat(path)
		if err != nil {
			return nil
		}

		if info.Mode()&os.ModeSymlink != 0 {
			target, err := os.Readlink(path)
			if err != nil || target == "" {
				masterTarget := filepath.Join(e.MasterPath, relPath)
				_ = os.Remove(path)
				if err := os.Symlink(masterTarget, path); err == nil {
					repairedCount++
				}
			}
		}

		return nil
	})

	return repairedCount, err
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
