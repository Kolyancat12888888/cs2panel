package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"

	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/config"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/installer"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/master"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/runner"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/symlinks"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type APIServer struct {
	cfg          *config.Config
	masterMgr    *master.MasterManager
	symlinkEng   *symlinks.SymlinkEngine
	modInstaller *installer.ModInstaller
	procMgr      *runner.ProcessManager
	router       *gin.Engine
}

func NewAPIServer(
	cfg *config.Config,
	masterMgr *master.MasterManager,
	symlinkEng *symlinks.SymlinkEngine,
	modInstaller *installer.ModInstaller,
	procMgr *runner.ProcessManager,
) *APIServer {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	s := &APIServer{
		cfg:          cfg,
		masterMgr:    masterMgr,
		symlinkEng:   symlinkEng,
		modInstaller: modInstaller,
		procMgr:      procMgr,
		router:       r,
	}

	s.setupRoutes()
	return s
}

func (s *APIServer) setupRoutes() {
	// Public Root & Health endpoints (No 404 / 401 when health polling)
	s.router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"daemon":  "CS2Panel Node Daemon",
			"version": "1.0.0",
			"status":  "online",
			"node_id": s.cfg.NodeID,
		})
	})

	s.router.GET("/health", s.handleHealth)
	s.router.GET("/api/v1/health", s.handleHealth)

	// Authentication Middleware for API
	auth := func(c *gin.Context) {
		token := c.GetHeader("X-Node-Token")
		if token == "" {
			token = c.Query("token")
		}
		// Accept configured secret, default key, or if secret token is empty
		if s.cfg.SecretToken != "" && token != s.cfg.SecretToken && token != "cs2panel-daemon-secret-key" {
			clientIP := c.ClientIP()
			if clientIP != "127.0.0.1" && clientIP != "::1" && clientIP != "localhost" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized node token"})
				return
			}
		}
		c.Next()
	}

	v1 := s.router.Group("/api/v1")
	{
		// Node & Master CS2 Health
		v1.POST("/master/update", auth, s.handleMasterUpdate)
		v1.GET("/master/status", s.handleMasterStatus)

		// Server Instances Lifecycle
		v1.POST("/servers/provision", auth, s.handleProvision)
		v1.POST("/servers/:uuid/start", auth, s.handleStart)
		v1.POST("/servers/:uuid/stop", auth, s.handleStop)
		v1.POST("/servers/:uuid/restart", auth, s.handleRestart)
		v1.POST("/servers/:uuid/kill", auth, s.handleKill)
		v1.GET("/servers/:uuid/status", s.handleStatus)

		// RCON & Console Logs
		v1.POST("/servers/:uuid/rcon", auth, s.handleRCON)
		v1.GET("/servers/:uuid/logs/ws", s.handleLogWS)
		v1.GET("/servers/:uuid/logs/recent", s.handleRecentLogs)

		// Mods & Plugins
		v1.POST("/servers/:uuid/mods/install-css", auth, s.handleInstallCSS)
		v1.POST("/servers/:uuid/repair-symlinks", auth, s.handleRepairSymlinks)

		// Files & Configs
		v1.GET("/servers/:uuid/files/list", auth, s.handleListFiles)
		v1.POST("/servers/:uuid/files/write", auth, s.handleWriteFile)
		v1.GET("/servers/:uuid/files/read", auth, s.handleReadFile)
	}
}

func (s *APIServer) Start() error {
	return s.router.Run("0.0.0.0:" + s.cfg.HTTPPort)
}

func (s *APIServer) handleHealth(c *gin.Context) {
	ok, msg := s.masterMgr.CheckMasterHealth()

	// Real CPU Usage
	cpuPercent, _ := cpu.Percent(0, false)
	cpuUsage := 0.0
	if len(cpuPercent) > 0 {
		cpuUsage = cpuPercent[0]
	}

	// Real RAM
	vMem, _ := mem.VirtualMemory()
	totalRamMB := uint64(0)
	usedRamMB := uint64(0)
	ramPercent := 0.0
	if vMem != nil {
		totalRamMB = vMem.Total / 1024 / 1024
		usedRamMB = vMem.Used / 1024 / 1024
		ramPercent = vMem.UsedPercent
	}

	// Real Disk Usage with robust fallback
	diskPath := s.cfg.ServersRootPath
	if _, err := os.Stat(diskPath); os.IsNotExist(err) {
		diskPath = s.cfg.MasterCS2Path
		if _, err := os.Stat(diskPath); os.IsNotExist(err) {
			diskPath = "/"
		}
	}
	dStat, err := disk.Usage(diskPath)
	if err != nil || dStat == nil {
		dStat, _ = disk.Usage("/")
	}

	totalDiskGB := uint64(0)
	freeDiskGB := uint64(0)
	diskPercent := 0.0
	if dStat != nil {
		totalDiskGB = dStat.Total / 1024 / 1024 / 1024
		freeDiskGB = dStat.Free / 1024 / 1024 / 1024
		diskPercent = dStat.UsedPercent
	}

	// Real Host & Full Multi-Core CPU Model
	cpuInfo, _ := cpu.Info()
	cpuModel := "Unknown Processor"
	if len(cpuInfo) > 0 {
		cpuModel = cpuInfo[0].ModelName
	}

	cpuCores := runtime.NumCPU()
	if cCount, err := cpu.Counts(true); err == nil && cCount > 0 {
		cpuCores = cCount
	}

	hInfo, _ := host.Info()
	osName := "Linux"
	uptimeSec := uint64(0)
	if hInfo != nil {
		osName = fmt.Sprintf("%s %s (%s)", hInfo.Platform, hInfo.PlatformVersion, hInfo.KernelVersion)
		uptimeSec = hInfo.Uptime
	}

	c.JSON(http.StatusOK, gin.H{
		"status":         "online",
		"node_id":        s.cfg.NodeID,
		"master_healthy": ok,
		"master_message": msg,
		"hardware": gin.H{
			"cpu_model":        cpuModel,
			"cpu_cores":        cpuCores,
			"cpu_usage_pct":    cpuUsage,
			"ram_total_mb":     totalRamMB,
			"ram_used_mb":      usedRamMB,
			"ram_usage_pct":    ramPercent,
			"disk_total_gb":    totalDiskGB,
			"disk_free_gb":     freeDiskGB,
			"disk_usage_pct":   diskPercent,
			"os":               osName,
			"uptime_seconds":   uptimeSec,
		},
	})
}

func (s *APIServer) handleMasterUpdate(c *gin.Context) {
	go func() {
		_ = s.masterMgr.UpdateMaster(true)
	}()
	c.JSON(http.StatusAccepted, gin.H{"message": "Master CS2 update initiated via SteamCMD"})
}

func (s *APIServer) handleMasterStatus(c *gin.Context) {
	ok, msg := s.masterMgr.CheckMasterHealth()
	c.JSON(http.StatusOK, gin.H{
		"is_updating":  s.masterMgr.IsUpdating,
		"last_update":  s.masterMgr.LastUpdate,
		"last_error":   s.masterMgr.LastError,
		"healthy":      ok,
		"message":      msg,
	})
}

type ProvisionReq struct {
	UUID       string `json:"uuid" binding:"required"`
	InstallCSS bool   `json:"install_css"`
}

func (s *APIServer) handleProvision(c *gin.Context) {
	var req ProvisionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := s.symlinkEng.ProvisionServerInstance(req.UUID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.InstallCSS {
		instanceRoot := s.symlinkEng.InstancePath(req.UUID)
		_ = s.modInstaller.InstallMetamodAndCSS(instanceRoot)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "provisioned",
		"uuid":    req.UUID,
		"message": "Instance created with shared master symlinks and isolated addons/cfg",
	})
}

type ServerStartReq struct {
	Port       int    `json:"port"`
	RconPort   int    `json:"rcon_port"`
	RconPass   string `json:"rcon_pass"`
	GSLT       string `json:"gslt"`
	DefaultMap string `json:"default_map"`
	GameType   int    `json:"game_type"`
	GameMode   int    `json:"game_mode"`
	MaxPlayers int    `json:"max_players"`
}

func (s *APIServer) handleStart(c *gin.Context) {
	uuid := c.Param("uuid")
	var req ServerStartReq
	_ = c.ShouldBindJSON(&req)

	if req.Port == 0 {
		req.Port = 27015
	}
	if req.RconPort == 0 {
		req.RconPort = 27015
	}
	if req.DefaultMap == "" {
		req.DefaultMap = "de_dust2"
	}
	if req.MaxPlayers == 0 {
		req.MaxPlayers = 16
	}

	instanceDir := s.symlinkEng.InstancePath(uuid)
	proc := s.procMgr.GetOrCreateServer(uuid, instanceDir, req.Port, req.RconPort, req.RconPass, req.GSLT, req.DefaultMap, req.GameType, req.GameMode, req.MaxPlayers)

	if err := proc.Start(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "starting", "uuid": uuid})
}

func (s *APIServer) handleStop(c *gin.Context) {
	uuid := c.Param("uuid")
	if proc, exists := s.procMgr.Servers[uuid]; exists {
		_ = proc.StopGraceful(5)
		c.JSON(http.StatusOK, gin.H{"status": "stopped", "uuid": uuid})
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Server not running"})
}

func (s *APIServer) handleRestart(c *gin.Context) {
	uuid := c.Param("uuid")
	if proc, exists := s.procMgr.Servers[uuid]; exists {
		_ = proc.StopGraceful(3)
		_ = proc.Start()
		c.JSON(http.StatusOK, gin.H{"status": "restarted", "uuid": uuid})
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
}

func (s *APIServer) handleKill(c *gin.Context) {
	uuid := c.Param("uuid")
	if proc, exists := s.procMgr.Servers[uuid]; exists {
		_ = proc.Kill()
		c.JSON(http.StatusOK, gin.H{"status": "killed", "uuid": uuid})
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Server not running"})
}

func (s *APIServer) handleStatus(c *gin.Context) {
	uuid := c.Param("uuid")
	if proc, exists := s.procMgr.Servers[uuid]; exists {
		c.JSON(http.StatusOK, gin.H{
			"uuid":        uuid,
			"status":      proc.Status,
			"crash_count": proc.CrashCount,
			"last_crash":  proc.LastCrash,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"uuid": uuid, "status": "offline"})
}

type RconReq struct {
	Command string `json:"command" binding:"required"`
}

func (s *APIServer) handleRCON(c *gin.Context) {
	uuid := c.Param("uuid")
	var req RconReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if proc, exists := s.procMgr.Servers[uuid]; exists {
		res, err := proc.ExecuteRCON(req.Command)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"response": res})
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Server process not found"})
}

func (s *APIServer) handleLogWS(c *gin.Context) {
	uuid := c.Param("uuid")
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	proc, exists := s.procMgr.Servers[uuid]
	if !exists {
		_ = ws.WriteJSON(gin.H{"error": "server process not running"})
		return
	}

	ch, cancel := proc.SubscribeLogs()
	defer cancel()

	for line := range ch {
		if err := ws.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			break
		}
	}
}

func (s *APIServer) handleRecentLogs(c *gin.Context) {
	uuid := c.Param("uuid")
	if proc, exists := s.procMgr.Servers[uuid]; exists {
		c.JSON(http.StatusOK, gin.H{"logs": proc.GetRecentLogs()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": []string{}})
}

func (s *APIServer) handleInstallCSS(c *gin.Context) {
	uuid := c.Param("uuid")
	instanceRoot := s.symlinkEng.InstancePath(uuid)
	if err := s.modInstaller.InstallMetamodAndCSS(instanceRoot); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Metamod 2-git1411 and CounterStrikeSharp installed successfully"})
}

func (s *APIServer) handleRepairSymlinks(c *gin.Context) {
	uuid := c.Param("uuid")
	count, err := s.symlinkEng.RepairSymlinks(uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"repaired_count": count})
}

func (s *APIServer) handleListFiles(c *gin.Context) {
	uuid := c.Param("uuid")
	relPath := c.DefaultQuery("path", "game/csgo/cfg")
	target := filepath.Join(s.symlinkEng.InstancePath(uuid), relPath)

	entries, err := os.ReadDir(target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type FileItem struct {
		Name  string `json:"name"`
		IsDir bool   `json:"is_dir"`
		Size  int64  `json:"size"`
	}

	var list []FileItem
	for _, e := range entries {
		info, _ := e.Info()
		sz := int64(0)
		if info != nil {
			sz = info.Size()
		}
		list = append(list, FileItem{
			Name:  e.Name(),
			IsDir: e.IsDir(),
			Size:  sz,
		})
	}
	c.JSON(http.StatusOK, gin.H{"files": list})
}

type WriteFileReq struct {
	Path    string `json:"path" binding:"required"`
	Content string `json:"content"`
}

func (s *APIServer) handleWriteFile(c *gin.Context) {
	uuid := c.Param("uuid")
	var req WriteFileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fullPath := filepath.Join(s.symlinkEng.InstancePath(uuid), req.Path)
	_ = os.MkdirAll(filepath.Dir(fullPath), 0755)

	if err := os.WriteFile(fullPath, []byte(req.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File written successfully"})
}

func (s *APIServer) handleReadFile(c *gin.Context) {
	uuid := c.Param("uuid")
	relPath := c.Query("path")
	fullPath := filepath.Join(s.symlinkEng.InstancePath(uuid), relPath)

	content, err := os.ReadFile(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": string(content)})
}
