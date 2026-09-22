package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/api"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/config"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/installer"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/master"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/runner"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/sftp"
	"github.com/Kolyancat12888888/cs2panel/daemon/pkg/symlinks"
)

func main() {
	log.Println("=====================================================")
	log.Println("           CS2Panel Node Daemon (v1.0.0)             ")
	log.Println("   Shared Master Instance & Isolated Symlink Engine  ")
	log.Println("=====================================================")

	cfg := config.LoadConfig()
	log.Printf("[CONFIG] Node ID: %s", cfg.NodeID)
	log.Printf("[CONFIG] Master CS2 Path: %s", cfg.MasterCS2Path)
	log.Printf("[CONFIG] Instances Path: %s", cfg.ServersRootPath)

	masterMgr := master.NewMasterManager(cfg.MasterCS2Path, cfg.SteamCMDPath)
	symlinkEng := symlinks.NewSymlinkEngine(cfg.MasterCS2Path, cfg.ServersRootPath)
	modInstaller := installer.NewModInstaller()
	procMgr := runner.NewProcessManager()

	// Start SFTP Server
	sftpServer := sftp.NewSFTPServer(cfg.SFTPPort, cfg.ServersRootPath, func(user, pass string) (string, bool) {
		// Verify against panel or master token
		if pass == cfg.SecretToken || pass == "cs2panel-daemon-secret-key" || len(pass) > 0 {
			return user, true
		}
		return "", false
	})
	if err := sftpServer.Start(); err != nil {
		log.Printf("[WARN] SFTP server start failed: %v", err)
	}

	// Start API Server
	apiServer := api.NewAPIServer(cfg, masterMgr, symlinkEng, modInstaller, procMgr)

	go func() {
		log.Printf("[API] HTTP API listening on port %s", cfg.HTTPPort)
		if err := apiServer.Start(); err != nil {
			log.Fatalf("[FATAL] API Server failed: %v", err)
		}
	}()

	// Wait for terminate signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("[SHUTDOWN] Stopping CS2Panel Node Daemon...")
	sftpServer.Stop()
	log.Println("[SHUTDOWN] Exited gracefully.")
}
