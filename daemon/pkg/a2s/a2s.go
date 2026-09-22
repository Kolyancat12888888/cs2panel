package a2s

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"net"
	"time"
)

type ServerInfo struct {
	Name       string        `json:"name"`
	Map        string        `json:"map"`
	Folder     string        `json:"folder"`
	Game       string        `json:"game"`
	AppID      uint16        `json:"app_id"`
	Players    uint8         `json:"players"`
	MaxPlayers uint8         `json:"max_players"`
	Bots       uint8         `json:"bots"`
	ServerType string        `json:"server_type"`
	Environment string       `json:"environment"`
	Visibility uint8         `json:"visibility"`
	VAC        uint8         `json:"vac"`
	Version    string        `json:"version"`
	Ping       time.Duration `json:"ping_ms"`
	Online     bool          `json:"online"`
}

type PlayerInfo struct {
	Index    uint8   `json:"index"`
	Name     string  `json:"name"`
	Score    int32   `json:"score"`
	Duration float32 `json:"duration_seconds"`
}

// QueryInfo performs Valve A2S_INFO query over UDP
func QueryInfo(addr string, timeout time.Duration) (*ServerInfo, error) {
	conn, err := net.DialTimeout("udp", addr, timeout)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(timeout))

	start := time.Now()
	// A2S_INFO request: 0xFFFFFFFF, 0x54, "Source Engine Query\0"
	req := append([]byte{0xFF, 0xFF, 0xFF, 0xFF, 0x54}, []byte("Source Engine Query\x00")...)
	if _, err := conn.Write(req); err != nil {
		return nil, err
	}

	buf := make([]byte, 1400)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, err
	}

	rtt := time.Since(start)

	// Check for challenge response (0x41)
	if n >= 9 && buf[4] == 0x41 {
		challenge := buf[5:9]
		reqWithChallenge := append(req, challenge...)
		start = time.Now()
		if _, err := conn.Write(reqWithChallenge); err != nil {
			return nil, err
		}
		n, err = conn.Read(buf)
		if err != nil {
			return nil, err
		}
		rtt = time.Since(start)
	}

	if n < 5 || buf[4] != 0x49 { // 0x49 is A2S_INFO payload response header
		return nil, fmt.Errorf("invalid A2S_INFO response header")
	}

	reader := bytes.NewReader(buf[5:n])
	var protocol byte
	_ = binary.Read(reader, binary.LittleEndian, &protocol)

	name, _ := readNullString(reader)
	mapName, _ := readNullString(reader)
	folder, _ := readNullString(reader)
	game, _ := readNullString(reader)

	var appID uint16
	_ = binary.Read(reader, binary.LittleEndian, &appID)

	var players, maxPlayers, bots byte
	_ = binary.Read(reader, binary.LittleEndian, &players)
	_ = binary.Read(reader, binary.LittleEndian, &maxPlayers)
	_ = binary.Read(reader, binary.LittleEndian, &bots)

	var serverType, env, vis, vac byte
	_ = binary.Read(reader, binary.LittleEndian, &serverType)
	_ = binary.Read(reader, binary.LittleEndian, &env)
	_ = binary.Read(reader, binary.LittleEndian, &vis)
	_ = binary.Read(reader, binary.LittleEndian, &vac)

	version, _ := readNullString(reader)

	return &ServerInfo{
		Name:        name,
		Map:         mapName,
		Folder:      folder,
		Game:        game,
		AppID:       appID,
		Players:     players,
		MaxPlayers:  maxPlayers,
		Bots:        bots,
		ServerType:  string(serverType),
		Environment: string(env),
		Visibility:  vis,
		VAC:         vac,
		Version:     version,
		Ping:        rtt / time.Millisecond,
		Online:      true,
	}, nil
}

func readNullString(r *bytes.Reader) (string, error) {
	var result []byte
	for {
		b, err := r.ReadByte()
		if err != nil {
			return string(result), err
		}
		if b == 0x00 {
			break
		}
		result = append(result, b)
	}
	return string(result), nil
}
