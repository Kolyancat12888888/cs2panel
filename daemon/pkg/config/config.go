package config

import (
	"os"
)

type Config struct {
	NodeID          string
	SecretToken     string
	HTTPPort        string
	SFTPPort        string
	MasterCS2Path   string
	ServersRootPath string
	SteamCMDPath    string
	FastDLRootPath  string
}

func LoadConfig() *Config {
	return &Config{
		NodeID:          getEnv("NODE_ID", "node-1"),
		SecretToken:     getEnv("DAEMON_SECRET_TOKEN", "cs2panel-daemon-secret-key"),
		HTTPPort:        getEnv("DAEMON_HTTP_PORT", "8080"),
		SFTPPort:        getEnv("DAEMON_SFTP_PORT", "2022"),
		MasterCS2Path:   getEnv("MASTER_CS2_PATH", "/opt/cs2panel/master_cs2"),
		ServersRootPath: getEnv("SERVERS_ROOT_PATH", "/opt/cs2panel/servers"),
		SteamCMDPath:    getEnv("STEAMCMD_PATH", "/usr/games/steamcmd"),
		FastDLRootPath:  getEnv("FASTDL_ROOT_PATH", "/opt/cs2panel/fastdl"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
