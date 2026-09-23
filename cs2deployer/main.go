package main

import (
	"archive/zip"
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
)

var DefaultVersion = "v1.0.0"

// Configuration for CS2 Deployer
type Config struct {
	GitHubRepo    string `json:"github_repo"`
	BackendDir    string `json:"backend_dir"`
	FrontendDir   string `json:"frontend_dir"`
	DaemonDir     string `json:"daemon_dir"`
	BackendPort   string `json:"backend_port"`
	FrontendPort  string `json:"frontend_port"`
	CheckInterval int    `json:"check_interval_seconds"`
	AutoUpdate    bool   `json:"auto_update"`
	RunDaemon     bool   `json:"run_daemon"`
	BackupDir     string `json:"backup_dir"`
	TargetDir     string `json:"target_dir"`
}

type GitHubReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

type GitHubRelease struct {
	TagName     string               `json:"tag_name"`
	Name        string               `json:"name"`
	Draft       bool                 `json:"draft"`
	Prerelease  bool                 `json:"prerelease"`
	PublishedAt string               `json:"published_at"`
	Body        string               `json:"body"`
	Assets      []GitHubReleaseAsset `json:"assets"`
}

type ProcessManager struct {
	config      *Config
	backendCmd  *exec.Cmd
	frontendCmd *exec.Cmd
	daemonCmd   *exec.Cmd
	mu          sync.Mutex
	ctx         context.Context
	cancel      context.CancelFunc
	running     bool
}

func main() {
	repoFlag := flag.String("repo", "Kolyancat12888888/cs2panel", "GitHub repository in format owner/repo")
	targetDirFlag := flag.String("dir", ".", "Application root directory")
	backendPortFlag := flag.String("backend-port", "8005", "Laravel backend port")
	frontendPortFlag := flag.String("frontend-port", "3002", "Next.js frontend port")
	checkIntervalFlag := flag.Int("interval", 60, "Auto-update polling interval in seconds")
	runOnlyFlag := flag.Bool("run-only", false, "Run services without checking for GitHub updates")
	updateOnlyFlag := flag.Bool("update-only", false, "Check and download update, then exit")
	forceUpdateFlag := flag.Bool("force-update", false, "Force download and reinstall latest release")
	withDaemonFlag := flag.Bool("daemon", true, "Automatically run Node Daemon if daemon/ folder exists")
	installServiceFlag := flag.Bool("install-service", false, "Install and start as background systemd service on Linux")
	versionFlag := flag.Bool("version", false, "Print deployer version and exit")
	flag.Parse()

	if *versionFlag {
		fmt.Printf("CS2Panel Auto-Deployer %s (%s/%s)\n", DefaultVersion, runtime.GOOS, runtime.GOARCH)
		return
	}

	printBanner()

	absTarget, err := filepath.Abs(*targetDirFlag)
	if err != nil {
		absTarget = *targetDirFlag
	}

	cfg := &Config{
		GitHubRepo:    *repoFlag,
		TargetDir:     absTarget,
		BackendDir:    filepath.Join(absTarget, "backend"),
		FrontendDir:   filepath.Join(absTarget, "frontend"),
		DaemonDir:     filepath.Join(absTarget, "daemon"),
		BackendPort:   *backendPortFlag,
		FrontendPort:  *frontendPortFlag,
		CheckInterval: *checkIntervalFlag,
		AutoUpdate:    !*runOnlyFlag,
		RunDaemon:     *withDaemonFlag,
		BackupDir:     filepath.Join(absTarget, "_backup"),
	}

	// Load override from deployer_config.json if present
	configFile := filepath.Join(absTarget, "deployer_config.json")
	if data, err := os.ReadFile(configFile); err == nil {
		_ = json.Unmarshal(data, cfg)
		log.Printf("[DEPLOYER] Loaded configuration from %s", configFile)
	}

	if *installServiceFlag {
		if err := installSystemdService(cfg); err != nil {
			log.Fatalf("[SYSTEMD] Error installing service: %v", err)
		}
		return
	}

	log.Printf("[DEPLOYER] Target Directory: %s", cfg.TargetDir)
	log.Printf("[DEPLOYER] Backend Directory: %s", cfg.BackendDir)
	log.Printf("[DEPLOYER] Frontend Directory: %s", cfg.FrontendDir)
	if cfg.RunDaemon {
		log.Printf("[DEPLOYER] Node Daemon Directory: %s", cfg.DaemonDir)
	}
	log.Printf("[DEPLOYER] GitHub Repository: https://github.com/%s", cfg.GitHubRepo)
	log.Printf("[DEPLOYER] Services to manage: Backend (artisan :%s) + Frontend (npm :%s) + Node Daemon (auto)", cfg.BackendPort, cfg.FrontendPort)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pm := &ProcessManager{
		config: cfg,
	}

	// Handle system interrupt signals (Ctrl+C, SIGTERM)
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("\n[DEPLOYER] Received shutdown signal. Gracefully stopping all services...")
		pm.StopAll()
		cancel()
		os.Exit(0)
	}()

	// 1. Initial Update Check
	if !*runOnlyFlag {
		log.Println("[DEPLOYER] Checking for latest GitHub release...")
		updated, err := checkAndApplyUpdate(pm, cfg, *forceUpdateFlag)
		if err != nil {
			log.Printf("[DEPLOYER] Notice during update check: %v", err)
		} else if updated {
			log.Println("[DEPLOYER] ✓ Update applied successfully.")
		} else {
			log.Println("[DEPLOYER] Application is up to date.")
		}

		if *updateOnlyFlag {
			log.Println("[DEPLOYER] Update-only mode completed. Exiting.")
			return
		}
	}

	// 2. Start Services (Backend + Frontend)
	pm.StartAll(ctx)

	// 3. Periodic Update Polling Loop
	if cfg.AutoUpdate && cfg.CheckInterval > 0 {
		ticker := time.NewTicker(time.Duration(cfg.CheckInterval) * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				updated, err := checkAndApplyUpdate(pm, cfg, false)
				if err != nil {
					log.Printf("[DEPLOYER] Background update check error: %v", err)
				} else if updated {
					log.Println("[DEPLOYER] 🚀 New release detected and installed! Restarting services...")
					pm.RestartAll(ctx)
				}
			}
		}
	} else {
		// Wait indefinitely
		select {
		case <-ctx.Done():
		}
	}
}

func printBanner() {
	fmt.Println("==================================================================")
	fmt.Println("            CS2Panel Server Auto-Deployer & Supervisor            ")
	fmt.Println("       Automated Releases • Zero-Downtime • Process Manager       ")
	fmt.Println("==================================================================")
}

func getLocalVersion(targetDir string) string {
	versionFile := filepath.Join(targetDir, "version.txt")
	if data, err := os.ReadFile(versionFile); err == nil {
		return strings.TrimSpace(string(data))
	}
	return ""
}

func setLocalVersion(targetDir string, version string) {
	versionFile := filepath.Join(targetDir, "version.txt")
	_ = os.WriteFile(versionFile, []byte(version+"\n"), 0644)
}

func checkAndApplyUpdate(pm *ProcessManager, cfg *Config, force bool) (bool, error) {
	currentVer := getLocalVersion(cfg.TargetDir)
	log.Printf("[DEPLOYER] Current local version: %s", func() string {
		if currentVer == "" {
			return "(none/initial)"
		}
		return currentVer
	}())

	release, err := fetchLatestRelease(cfg.GitHubRepo)
	if err != nil {
		return false, fmt.Errorf("failed to fetch latest release: %w", err)
	}

	if release == nil {
		return false, fmt.Errorf("no release found on GitHub repo %s", cfg.GitHubRepo)
	}

	log.Printf("[DEPLOYER] Latest GitHub release: %s (%s)", release.TagName, release.Name)

	if !force && currentVer != "" && (currentVer == release.TagName || strings.TrimPrefix(currentVer, "v") == strings.TrimPrefix(release.TagName, "v")) {
		return false, nil // Already up to date
	}

	log.Printf("[DEPLOYER] 🚀 Installing update %s -> %s...", currentVer, release.TagName)

	// Stop running child processes before replacing files to release locks
	if pm != nil {
		log.Println("[DEPLOYER] Stopping supervised services for clean update...")
		pm.StopAll()
		time.Sleep(1 * time.Second)
	}

	// Find the zip asset
	var zipAsset *GitHubReleaseAsset
	for i, asset := range release.Assets {
		if strings.HasSuffix(asset.Name, ".zip") && (strings.Contains(asset.Name, "cs2panel") || strings.Contains(asset.Name, "server")) {
			zipAsset = &release.Assets[i]
			break
		}
	}
	if zipAsset == nil && len(release.Assets) > 0 {
		// Fallback to first zip asset
		for i, asset := range release.Assets {
			if strings.HasSuffix(asset.Name, ".zip") {
				zipAsset = &release.Assets[i]
				break
			}
		}
	}

	if zipAsset == nil {
		return false, fmt.Errorf("no suitable .zip release asset found in release %s", release.TagName)
	}

	// 1. Backup critical files before unpack
	backupCriticalFiles(cfg)

	// 2. Download release zip
	tempZip := filepath.Join(os.TempDir(), fmt.Sprintf("cs2panel_%s.zip", release.TagName))
	log.Printf("[DEPLOYER] Downloading %s (%d MB)...", zipAsset.Name, zipAsset.Size/1024/1024)
	if err := downloadFile(zipAsset.BrowserDownloadURL, tempZip); err != nil {
		return false, fmt.Errorf("download failed: %w", err)
	}
	defer os.Remove(tempZip)

	// 3. Extract release zip
	log.Printf("[DEPLOYER] Extracting archive to %s...", cfg.TargetDir)
	if err := unzipArchive(tempZip, cfg.TargetDir); err != nil {
		return false, fmt.Errorf("extraction failed: %w", err)
	}

	// 4. Restore critical files
	restoreCriticalFiles(cfg)

	// 5. Update standalone daemon binary if available in release assets
	if runtime.GOOS != "windows" {
		for _, asset := range release.Assets {
			if asset.Name == "cs2daemon-linux-amd64" {
				targetBin := filepath.Join(cfg.DaemonDir, "cs2daemon-linux-amd64")
				_ = os.MkdirAll(cfg.DaemonDir, 0755)
				if err := downloadFile(asset.BrowserDownloadURL, targetBin); err == nil {
					_ = os.Chmod(targetBin, 0755)
					log.Printf("[DEPLOYER] Updated %s directly from release assets", asset.Name)
				}
				break
			}
		}
	}

	// 6. Run post-update migrations and optimizations
	runPostUpdateHooks(cfg)

	// 7. Save new version
	setLocalVersion(cfg.TargetDir, release.TagName)

	return true, nil
}

func fetchLatestRelease(repo string) (*GitHubRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repo)
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "CS2Panel-AutoDeployer")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// If GITHUB_TOKEN environment variable exists, use it to bypass rate limits
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var rel GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, err
	}
	return &rel, nil
}

func downloadFile(url string, dest string) error {
	client := &http.Client{Timeout: 10 * time.Minute}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "CS2Panel-AutoDeployer")
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned HTTP %d", resp.StatusCode)
	}

	tmpDest := dest + ".tmp"
	_ = os.Remove(tmpDest)

	out, err := os.Create(tmpDest)
	if err != nil {
		return err
	}

	_, err = io.Copy(out, resp.Body)
	out.Close()
	if err != nil {
		_ = os.Remove(tmpDest)
		return err
	}

	_ = os.Remove(dest)
	return os.Rename(tmpDest, dest)
}

func unzipArchive(src, dest string) error {
	destAbs, err := filepath.Abs(dest)
	if err != nil {
		destAbs = dest
	}

	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	count := 0
	for _, f := range r.File {
		fpath := filepath.Join(destAbs, f.Name)

		// Security: Prevent ZipSlip vulnerability
		rel, err := filepath.Rel(destAbs, fpath)
		if err != nil || strings.HasPrefix(rel, "..") {
			continue
		}

		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(fpath, 0755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), 0755); err != nil {
			return err
		}

		// Unlink file first to avoid ETXTBSY (text file busy) on running executables
		_ = os.Remove(fpath)

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			// Fallback: write to temp file and atomically rename
			tmpPath := fpath + ".tmp"
			_ = os.Remove(tmpPath)
			outFile, err = os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
			if err != nil {
				return err
			}
			rc, err := f.Open()
			if err != nil {
				outFile.Close()
				return err
			}
			_, err = io.Copy(outFile, rc)
			outFile.Close()
			rc.Close()
			if err != nil {
				_ = os.Remove(tmpPath)
				return err
			}
			_ = os.Remove(fpath)
			_ = os.Rename(tmpPath, fpath)
			count++
			continue
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		if err != nil {
			return err
		}
		count++
	}
	log.Printf("[DEPLOYER] Unpacked %d files into %s", count, destAbs)
	return nil
}

func installSystemdService(cfg *Config) error {
	if runtime.GOOS == "windows" {
		return fmt.Errorf("systemd service installation is only supported on Linux")
	}

	execPath, err := os.Executable()
	if err != nil {
		execPath = filepath.Join(cfg.TargetDir, "cs2deployer-linux-amd64")
	}

	serviceContent := fmt.Sprintf(`[Unit]
Description=CS2Panel Server Auto-Deployer & Supervisor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=%s
ExecStart=%s
Restart=always
RestartSec=5s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
`, cfg.TargetDir, execPath)

	servicePath := "/etc/systemd/system/cs2panel.service"
	if err := os.WriteFile(servicePath, []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w (are you running as root/sudo?)", servicePath, err)
	}

	log.Printf("[SYSTEMD] Written service file to %s", servicePath)
	runCmd(cfg.TargetDir, "systemctl", "daemon-reload")
	runCmd(cfg.TargetDir, "systemctl", "enable", "cs2panel")
	runCmd(cfg.TargetDir, "systemctl", "restart", "cs2panel")
	log.Printf("[SYSTEMD] ✓ CS2Panel service installed, enabled and started successfully!")
	log.Printf("[SYSTEMD] Check live logs at any time with: journalctl -u cs2panel -f")
	return nil
}

func backupCriticalFiles(cfg *Config) {
	_ = os.MkdirAll(cfg.BackupDir, 0755)

	filesToBackup := []string{
		filepath.Join(cfg.BackendDir, ".env"),
		filepath.Join(cfg.BackendDir, "database", "database.sqlite"),
		filepath.Join(cfg.FrontendDir, ".env.local"),
	}

	for _, file := range filesToBackup {
		if _, err := os.Stat(file); err == nil {
			rel, _ := filepath.Rel(cfg.TargetDir, file)
			dest := filepath.Join(cfg.BackupDir, rel)
			_ = os.MkdirAll(filepath.Dir(dest), 0755)
			copyFile(file, dest)
		}
	}
}

func restoreCriticalFiles(cfg *Config) {
	filesToRestore := []string{
		filepath.Join(cfg.BackendDir, ".env"),
		filepath.Join(cfg.BackendDir, "database", "database.sqlite"),
		filepath.Join(cfg.FrontendDir, ".env.local"),
	}

	for _, file := range filesToRestore {
		rel, _ := filepath.Rel(cfg.TargetDir, file)
		src := filepath.Join(cfg.BackupDir, rel)
		if _, err := os.Stat(src); err == nil {
			_ = os.MkdirAll(filepath.Dir(file), 0755)
			copyFile(src, file)
		}
	}

	// Create default .env if missing from .env.example
	backendEnv := filepath.Join(cfg.BackendDir, ".env")
	if _, err := os.Stat(backendEnv); os.IsNotExist(err) {
		exampleEnv := filepath.Join(cfg.BackendDir, ".env.example")
		if _, err := os.Stat(exampleEnv); err == nil {
			copyFile(exampleEnv, backendEnv)
			runCmd(cfg.BackendDir, "php", "artisan", "key:generate", "--force")
		}
	}
}

func copyFile(src, dst string) {
	in, err := os.Open(src)
	if err != nil {
		return
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return
	}
	defer out.Close()

	_, _ = io.Copy(out, in)
}

func runPostUpdateHooks(cfg *Config) {
	log.Println("[DEPLOYER] Running post-update maintenance hooks...")

	if _, err := os.Stat(cfg.BackendDir); err == nil {
		// Run migrations
		log.Println("[DEPLOYER] Executing database migrations...")
		runCmd(cfg.BackendDir, "php", "artisan", "migrate", "--force")

		// Clear cached views/routes/config
		runCmd(cfg.BackendDir, "php", "artisan", "optimize:clear")
	}

	if _, err := os.Stat(cfg.FrontendDir); err == nil {
		log.Println("[DEPLOYER] Installing frontend dependencies (npm install)...")
		if runtime.GOOS == "windows" {
			runCmd(cfg.FrontendDir, "cmd", "/c", "npm", "install")
		} else {
			runCmd(cfg.FrontendDir, "npm", "install")
		}

		nextDir := filepath.Join(cfg.FrontendDir, ".next")
		if _, err := os.Stat(nextDir); os.IsNotExist(err) {
			log.Println("[DEPLOYER] Building Next.js production frontend assets...")
			if runtime.GOOS == "windows" {
				runCmd(cfg.FrontendDir, "cmd", "/c", "npm", "run", "build")
			} else {
				runCmd(cfg.FrontendDir, "npm", "run", "build")
			}
		}
	}
}

func runCmd(dir string, name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	_ = cmd.Run()
}

// ---------------- Process Management (Supervisor) ----------------

func (pm *ProcessManager) StartAll(ctx context.Context) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.ctx, pm.cancel = context.WithCancel(ctx)
	pm.running = true

	log.Println("[DEPLOYER] Starting CS2Panel Services (Backend + Frontend + Node Daemon)...")

	// 1. Start Backend (Laravel)
	go pm.superviseBackend(pm.ctx)

	// 2. Start Frontend (Next.js)
	go pm.superviseFrontend(pm.ctx)

	// 3. Start Node Daemon (if enabled and exists)
	if pm.config.RunDaemon {
		go pm.superviseDaemon(pm.ctx)
	}
}

func (pm *ProcessManager) StopAll() {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.running = false
	if pm.cancel != nil {
		pm.cancel()
	}

	if pm.backendCmd != nil && pm.backendCmd.Process != nil {
		log.Println("[DEPLOYER] Stopping Backend process...")
		_ = killProcessTree(pm.backendCmd.Process.Pid)
		pm.backendCmd = nil
	}

	if pm.frontendCmd != nil && pm.frontendCmd.Process != nil {
		log.Println("[DEPLOYER] Stopping Frontend process...")
		_ = killProcessTree(pm.frontendCmd.Process.Pid)
		pm.frontendCmd = nil
	}

	if pm.daemonCmd != nil && pm.daemonCmd.Process != nil {
		log.Println("[DEPLOYER] Stopping Node Daemon process...")
		_ = killProcessTree(pm.daemonCmd.Process.Pid)
		pm.daemonCmd = nil
	}
}

func (pm *ProcessManager) RestartAll(ctx context.Context) {
	pm.StopAll()
	time.Sleep(1 * time.Second)
	pm.StartAll(ctx)
}

func (pm *ProcessManager) superviseDaemon(ctx context.Context) {
	daemonDir := pm.config.DaemonDir
	if _, err := os.Stat(daemonDir); os.IsNotExist(err) {
		log.Printf("[NODE-DAEMON] Directory %s not found. Skipping daemon.", daemonDir)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		var cmd *exec.Cmd
		linuxBin := filepath.Join(daemonDir, "cs2daemon-linux-amd64")
		winBin := filepath.Join(daemonDir, "cs2-daemon.exe")

		if runtime.GOOS == "windows" && fileExists(winBin) {
			cmd = exec.Command(winBin)
		} else if runtime.GOOS != "windows" && fileExists(linuxBin) {
			_ = os.Chmod(linuxBin, 0755)
			cmd = exec.Command(linuxBin)
		} else if fileExists(filepath.Join(daemonDir, "main.go")) {
			log.Printf("[NODE-DAEMON] Pre-compiled binary not found. Running via 'go run main.go'...")
			cmd = exec.Command("go", "run", "main.go")
		} else {
			log.Printf("[NODE-DAEMON] No executable or main.go found in %s. Skipping.", daemonDir)
			return
		}

		cmd.Dir = daemonDir

		pm.mu.Lock()
		pm.daemonCmd = cmd
		pm.mu.Unlock()

		log.Printf("[NODE-DAEMON] 🚀 Launching Node Daemon (CS2 Game Manager & SFTP) ...")
		streamOutput(cmd, "[NODE-DAEMON]")

		if err := cmd.Start(); err != nil {
			log.Printf("[NODE-DAEMON] Error starting Node Daemon: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		_ = cmd.Wait()

		select {
		case <-ctx.Done():
			return
		default:
			log.Println("[NODE-DAEMON] Process exited. Auto-restarting in 2s...")
			time.Sleep(2 * time.Second)
		}
	}
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func (pm *ProcessManager) superviseBackend(ctx context.Context) {
	backendDir := pm.config.BackendDir
	if _, err := os.Stat(backendDir); os.IsNotExist(err) {
		log.Printf("[BACKEND] Directory %s not found. Skipping backend.", backendDir)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		log.Printf("[BACKEND] 🚀 Launching Laravel on http://0.0.0.0:%s ...", pm.config.BackendPort)
		cmd := exec.Command("php", "artisan", "serve", "--host=0.0.0.0", "--port="+pm.config.BackendPort)
		cmd.Dir = backendDir

		pm.mu.Lock()
		pm.backendCmd = cmd
		pm.mu.Unlock()

		streamOutput(cmd, "[BACKEND]")

		if err := cmd.Start(); err != nil {
			log.Printf("[BACKEND] Error starting php artisan serve: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		_ = cmd.Wait()

		select {
		case <-ctx.Done():
			return
		default:
			log.Println("[BACKEND] Process exited. Auto-restarting in 2s...")
			time.Sleep(2 * time.Second)
		}
	}
}

func (pm *ProcessManager) superviseFrontend(ctx context.Context) {
	frontendDir := pm.config.FrontendDir
	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		log.Printf("[FRONTEND] Directory %s not found. Skipping frontend.", frontendDir)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		log.Printf("[FRONTEND] 🚀 Launching Next.js on http://localhost:%s ...", pm.config.FrontendPort)

		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("cmd", "/c", "npm", "run", "start")
		} else {
			cmd = exec.Command("npm", "run", "start")
		}
		cmd.Dir = frontendDir

		pm.mu.Lock()
		pm.frontendCmd = cmd
		pm.mu.Unlock()

		streamOutput(cmd, "[FRONTEND]")

		if err := cmd.Start(); err != nil {
			log.Printf("[FRONTEND] Error starting npm run start: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		_ = cmd.Wait()

		select {
		case <-ctx.Done():
			return
		default:
			log.Println("[FRONTEND] Process exited. Auto-restarting in 2s...")
			time.Sleep(2 * time.Second)
		}
	}
}

func streamOutput(cmd *exec.Cmd, prefix string) {
	stdout, err := cmd.StdoutPipe()
	if err == nil {
		go func() {
			scanner := bufio.NewScanner(stdout)
			for scanner.Scan() {
				fmt.Printf("%s %s\n", prefix, scanner.Text())
			}
		}()
	}

	stderr, err := cmd.StderrPipe()
	if err == nil {
		go func() {
			scanner := bufio.NewScanner(stderr)
			for scanner.Scan() {
				fmt.Printf("%s %s\n", prefix, scanner.Text())
			}
		}()
	}
}

func killProcessTree(pid int) error {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", pid))
		return cmd.Run()
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	return proc.Signal(syscall.SIGKILL)
}
