package config

import (
	"encoding/json"
	"flag"
	"log"
	"os"
)

type Config struct {
	NodeID          string `json:"node_name"`
	SecretToken     string `json:"secret_token"`
	HTTPPort        string `json:"api_port"`
	SFTPPort        string `json:"sftp_port"`
	MasterCS2Path   string `json:"master_cs2_path"`
	ServersRootPath string `json:"instances_path"`
	SteamCMDPath    string `json:"steamcmd_path"`
	FastDLRootPath  string `json:"fastdl_root_path"`
}

type FileConfig struct {
	NodeName        string `json:"node_name"`
	SecretToken     string `json:"secret_token"`
	APIPort         int    `json:"api_port"`
	SFTPPort        int    `json:"sftp_port"`
	MasterCS2Path   string `json:"master_cs2_path"`
	InstancesPath   string `json:"instances_path"`
	SteamCMDPath    string `json:"steamcmd_path"`
	FastDLRootPath  string `json:"fastdl_root_path"`
}

func LoadConfig() *Config {
	var configPath string
	flag.StringVar(&configPath, "config", "", "Path to daemon.json config file")
	flag.Parse()

	cfg := &Config{
		NodeID:          getEnv("NODE_ID", "node-1"),
		SecretToken:     getEnv("DAEMON_SECRET_TOKEN", "cs2panel-daemon-secret-key"),
		HTTPPort:        getEnv("DAEMON_HTTP_PORT", "8888"),
		SFTPPort:        getEnv("DAEMON_SFTP_PORT", "2222"),
		MasterCS2Path:   getEnv("MASTER_CS2_PATH", "/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112"),
		ServersRootPath: getEnv("SERVERS_ROOT_PATH", "/opt/cs2panel/instances"),
		SteamCMDPath:    getEnv("STEAMCMD_PATH", "/usr/games/steamcmd"),
		FastDLRootPath:  getEnv("FASTDL_ROOT_PATH", "/opt/cs2panel/fastdl"),
	}

	// Try reading JSON file if specified
	if configPath != "" {
		fileBytes, err := os.ReadFile(configPath)
		if err == nil {
			var fCfg map[string]interface{}
			if err := json.Unmarshal(fileBytes, &fCfg); err == nil {
				log.Printf("[CONFIG] Successfully loaded JSON config from: %s", configPath)
				if val, ok := fCfg["node_name"].(string); ok && val != "" {
					cfg.NodeID = val
				}
				if val, ok := fCfg["secret_token"].(string); ok && val != "" {
					cfg.SecretToken = val
				}
				if val, ok := fCfg["api_port"].(float64); ok && val > 0 {
					cfg.HTTPPort = string(rune(int(val))) // converted
					cfg.HTTPPort = itoa(int(val))
				}
				if val, ok := fCfg["sftp_port"].(float64); ok && val > 0 {
					cfg.SFTPPort = itoa(int(val))
				}
				if val, ok := fCfg["master_cs2_path"].(string); ok && val != "" {
					cfg.MasterCS2Path = val
				}
				if val, ok := fCfg["instances_path"].(string); ok && val != "" {
					cfg.ServersRootPath = val
				}
			}
		}
	}

	return cfg
}

func itoa(i int) string {
	bytes := []byte{}
	if i == 0 {
		return "0"
	}
	for i > 0 {
		rem := i % 10
		bytes = append([]byte{byte('0' + rem)}, bytes...)
		i /= 10
	}
	return string(bytes)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
