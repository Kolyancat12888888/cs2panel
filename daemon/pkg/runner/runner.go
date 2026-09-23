package runner

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/rcon"
)

type ServerStatus string

const (
	StatusOffline  ServerStatus = "offline"
	StatusStarting ServerStatus = "starting"
	StatusRunning  ServerStatus = "running"
	StatusStopping ServerStatus = "stopping"
	StatusCrashed  ServerStatus = "crashed"
)

type ServerProcess struct {
	UUID        string
	InstanceDir string
	Port        int
	RconPort    int
	RconPass    string
	GSLT        string
	DefaultMap  string
	GameType    int
	GameMode    int
	MaxPlayers  int

	Status      ServerStatus
	cmd         *exec.Cmd
	stdin       io.WriteCloser
	stdout      io.ReadCloser
	logs        []string
	logSubs     []chan string
	mu          sync.RWMutex
	rconClient  *rcon.Client
	CrashCount  int
	LastCrash   time.Time
}

type ProcessManager struct {
	Servers map[string]*ServerProcess
	mu      sync.RWMutex
}

func NewProcessManager() *ProcessManager {
	return &ProcessManager{
		Servers: make(map[string]*ServerProcess),
	}
}

func (pm *ProcessManager) GetOrCreateServer(uuid, instanceDir string, port, rconPort int, rconPass, gslt, defaultMap string, gameType, gameMode, maxPlayers int) *ServerProcess {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if s, exists := pm.Servers[uuid]; exists {
		return s
	}

	s := &ServerProcess{
		UUID:        uuid,
		InstanceDir: instanceDir,
		Port:        port,
		RconPort:    rconPort,
		RconPass:    rconPass,
		GSLT:        gslt,
		DefaultMap:  defaultMap,
		GameType:    gameType,
		GameMode:    gameMode,
		MaxPlayers:  maxPlayers,
		Status:      StatusOffline,
		logs:        make([]string, 0, 1000),
		logSubs:     make([]chan string, 0),
		rconClient:  rcon.NewClient(fmt.Sprintf("127.0.0.1:%d", rconPort), rconPass),
	}
	pm.Servers[uuid] = s
	return s
}

func (s *ServerProcess) Start() error {
	s.mu.Lock()
	if s.Status == StatusRunning || s.Status == StatusStarting {
		s.mu.Unlock()
		return fmt.Errorf("server is already active (status: %s)", s.Status)
	}
	s.Status = StatusStarting
	s.mu.Unlock()

	mapName := s.DefaultMap
	if mapName == "" {
		mapName = "de_dust2"
	}
	port := s.Port
	if port <= 0 {
		port = 27015
	}
	maxPlayers := s.MaxPlayers
	if maxPlayers <= 0 {
		maxPlayers = 16
	}

	cs2Script := filepath.Join(s.InstanceDir, "game", "cs2.sh")
	cs2Binary := filepath.Join(s.InstanceDir, "game", "bin", "linuxsteamrt64", "cs2")
	linuxBinDir := filepath.Join(s.InstanceDir, "game", "bin", "linuxsteamrt64")

	// Ensure ~/.steam/sdk64/steamclient.so and sdk32 exist (required by Steamworks SDK on Linux)
	if runtime.GOOS != "windows" {
		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			sdk64Dir := filepath.Join(homeDir, ".steam", "sdk64")
			_ = os.MkdirAll(sdk64Dir, 0755)
			targetSymlink64 := filepath.Join(sdk64Dir, "steamclient.so")

			candidates64 := []string{
				filepath.Join(s.InstanceDir, ".steam", "sdk64", "steamclient.so"),
				filepath.Join(s.InstanceDir, "steamcmd", "linux64", "steamclient.so"),
				filepath.Join(s.InstanceDir, "game", "bin", "linuxsteamrt64", "steamclient.so"),
				"/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112/.steam/sdk64/steamclient.so",
				"/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112/steamcmd/linux64/steamclient.so",
			}
			for _, cand := range candidates64 {
				if _, err := os.Stat(cand); err == nil {
					_ = os.Remove(targetSymlink64)
					_ = os.Symlink(cand, targetSymlink64)
					break
				}
			}
		}
	}

	args := []string{
		"-dedicated",
		"-port", fmt.Sprintf("%d", port),
		"+rcon_password", s.RconPass,
		"+game_type", fmt.Sprintf("%d", s.GameType),
		"+game_mode", fmt.Sprintf("%d", s.GameMode),
		"+map", mapName,
		"-maxplayers", fmt.Sprintf("%d", maxPlayers),
		"-console",
		"-usercon",
	}

	if s.GSLT != "" {
		args = append(args, "+sv_setsteamaccount", s.GSLT)
	}

	var cmd *exec.Cmd

	// On Linux, use stdbuf to disable stdout/stderr block buffering for instant line-by-line streaming
	if runtime.GOOS != "windows" {
		if stdbufPath, err := exec.LookPath("stdbuf"); err == nil {
			if _, err := os.Stat(cs2Script); err == nil {
				_ = os.Chmod(cs2Script, 0755)
				stdbufArgs := append([]string{"-oL", "-eL", cs2Script}, args...)
				cmd = exec.Command(stdbufPath, stdbufArgs...)
				cmd.Dir = filepath.Join(s.InstanceDir, "game")
			} else if _, err := os.Stat(cs2Binary); err == nil {
				_ = os.Chmod(cs2Binary, 0755)
				stdbufArgs := append([]string{"-oL", "-eL", cs2Binary}, args...)
				cmd = exec.Command(stdbufPath, stdbufArgs...)
				cmd.Dir = linuxBinDir
			}
		}
	}

	if cmd == nil {
		if _, err := os.Stat(cs2Script); err == nil {
			_ = os.Chmod(cs2Script, 0755)
			cmd = exec.Command(cs2Script, args...)
			cmd.Dir = filepath.Join(s.InstanceDir, "game")
		} else if _, err := os.Stat(cs2Binary); err == nil {
			_ = os.Chmod(cs2Binary, 0755)
			cmd = exec.Command(cs2Binary, args...)
			cmd.Dir = linuxBinDir
		} else {
			// Fallback for Windows or direct binary
			winBin := filepath.Join(s.InstanceDir, "game", "bin", "win64", "cs2.exe")
			cmd = exec.Command(winBin, args...)
			cmd.Dir = filepath.Join(s.InstanceDir, "game", "bin", "win64")
		}
	}

	cmd.Env = append(os.Environ(),
		fmt.Sprintf("LD_LIBRARY_PATH=%s:%s", linuxBinDir, os.Getenv("LD_LIBRARY_PATH")),
		"SteamAppId=730",
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.setStatus(StatusOffline)
		return err
	}
	s.stdout = stdout

	stderr, err := cmd.StderrPipe()
	if err == nil {
		go s.pipeLogs(stderr)
	}

	stdin, err := cmd.StdinPipe()
	if err != nil {
		s.setStatus(StatusOffline)
		return err
	}
	s.stdin = stdin

	if err := cmd.Start(); err != nil {
		s.setStatus(StatusOffline)
		return fmt.Errorf("failed to start cs2 process: %w", err)
	}

	s.cmd = cmd
	s.setStatus(StatusRunning)
	s.broadcastLog(fmt.Sprintf(">>> [CS2Panel] Process started with PID %d on port %d <<<", cmd.Process.Pid, port))

	// Stream stdout
	go s.pipeLogs(stdout)

	// Wait for process exit & auto-crash recovery
	go s.waitForExit()

	return nil
}

func (s *ServerProcess) StopGraceful(timeoutSec int) error {
	s.setStatus(StatusStopping)

	// Attempt warning in game via RCON
	if s.rconClient != nil {
		_, _ = s.rconClient.Execute("say [CS2Panel] Server restarting in 5 seconds...")
		time.Sleep(2 * time.Second)
		_, _ = s.rconClient.Execute("quit")
	}

	done := make(chan error, 1)
	go func() {
		if s.cmd != nil && s.cmd.Process != nil {
			_, err := s.cmd.Process.Wait()
			done <- err
		} else {
			done <- nil
		}
	}()

	select {
	case <-time.After(time.Duration(timeoutSec) * time.Second):
		return s.Kill()
	case <-done:
		s.setStatus(StatusOffline)
		return nil
	}
}

func (s *ServerProcess) Kill() error {
	s.setStatus(StatusStopping)
	if s.cmd != nil && s.cmd.Process != nil {
		_ = s.cmd.Process.Signal(syscall.SIGKILL)
	}
	s.setStatus(StatusOffline)
	return nil
}

func (s *ServerProcess) ExecuteRCON(cmd string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Direct interactive STDIN pipe (Native Source 2 dedicated console)
	if s.stdin != nil {
		_, err := fmt.Fprintln(s.stdin, cmd)
		if err == nil {
			return fmt.Sprintf("[RCON] Dispatched command: %s", cmd), nil
		}
	}

	// 2. Secondary fallback: TCP RCON
	if s.rconClient != nil {
		return s.rconClient.Execute(cmd)
	}

	return "", fmt.Errorf("server process is not running or stdin pipe closed")
}

func (s *ServerProcess) pipeLogs(r io.Reader) {
	reader := bufio.NewReader(r)
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			cleanLine := strings.TrimRight(line, "\r\n")
			s.broadcastLog(cleanLine)
		}
		if err != nil {
			break
		}
	}
}

func (s *ServerProcess) broadcastLog(line string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.logs = append(s.logs, line)
	if len(s.logs) > 2000 {
		s.logs = s.logs[len(s.logs)-1000:]
	}

	for _, sub := range s.logSubs {
		select {
		case sub <- line:
		default:
		}
	}
}

func (s *ServerProcess) SubscribeLogs() (chan string, func()) {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := make(chan string, 100)
	s.logSubs = append(s.logSubs, ch)

	cancel := func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		for i, sub := range s.logSubs {
			if sub == ch {
				s.logSubs = append(s.logSubs[:i], s.logSubs[i+1:]...)
				close(ch)
				break
			}
		}
	}

	return ch, cancel
}

func (s *ServerProcess) GetRecentLogs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]string, len(s.logs))
	copy(res, s.logs)
	return res
}

func (s *ServerProcess) waitForExit() {
	if s.cmd == nil {
		return
	}
	err := s.cmd.Wait()

	s.mu.Lock()
	wasStopping := s.Status == StatusStopping
	s.cmd = nil
	s.mu.Unlock()

	if !wasStopping {
		s.setStatus(StatusCrashed)
		s.CrashCount++
		s.LastCrash = time.Now()
		s.broadcastLog(fmt.Sprintf(">>> [CS2Panel CRASH ALERT] Server exited unexpectedly with error: %v <<<", err))
		log.Printf("[CRASH] Server %s crashed: %v", s.UUID, err)
	} else {
		s.setStatus(StatusOffline)
	}
}

func (s *ServerProcess) setStatus(st ServerStatus) {
	s.mu.Lock()
	s.Status = st
	s.mu.Unlock()
}
