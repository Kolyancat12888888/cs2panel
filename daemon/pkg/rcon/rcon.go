package rcon

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"sync"
	"time"
)

const (
	ServerDataAuth           = 3
	ServerDataAuthResponse   = 2
	ServerDataExecCommand    = 2
	ServerDataResponseValue  = 0
	DefaultTimeout           = 5 * time.Second
)

type Client struct {
	addr     string
	password string
	conn     net.Conn
	reqID    int32
	mu       sync.Mutex
}

func NewClient(addr, password string) *Client {
	return &Client{
		addr:     addr,
		password: password,
		reqID:    100,
	}
}

func (c *Client) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		_ = c.conn.Close()
	}

	conn, err := net.DialTimeout("tcp", c.addr, DefaultTimeout)
	if err != nil {
		return fmt.Errorf("rcon connect failed to %s: %w", c.addr, err)
	}
	c.conn = conn

	// Send auth packet
	c.reqID++
	if err := c.sendPacket(c.reqID, ServerDataAuth, c.password); err != nil {
		_ = c.conn.Close()
		c.conn = nil
		return err
	}

	// Read auth response
	resID, resType, _, err := c.readPacket()
	if err != nil {
		_ = c.conn.Close()
		c.conn = nil
		return fmt.Errorf("failed to read auth response: %w", err)
	}

	if resType == ServerDataResponseValue {
		// Some Source servers send empty SERVERDATA_RESPONSE_VALUE first, read next
		resID, _, _, err = c.readPacket()
		if err != nil {
			_ = c.conn.Close()
			c.conn = nil
			return fmt.Errorf("failed to read second auth packet: %w", err)
		}
	}

	if resID == -1 {
		_ = c.conn.Close()
		c.conn = nil
		return fmt.Errorf("rcon authentication failed (bad password)")
	}

	return nil
}

func (c *Client) Execute(command string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		conn, err := net.DialTimeout("tcp", c.addr, DefaultTimeout)
		if err != nil {
			return "", err
		}
		c.conn = conn
		c.reqID++
		if err := c.sendPacket(c.reqID, ServerDataAuth, c.password); err != nil {
			_ = c.conn.Close()
			c.conn = nil
			return "", err
		}
		_, _, _, _ = c.readPacket()
	}

	_ = c.conn.SetDeadline(time.Now().Add(DefaultTimeout))

	c.reqID++
	if err := c.sendPacket(c.reqID, ServerDataExecCommand, command); err != nil {
		_ = c.conn.Close()
		c.conn = nil
		return "", err
	}

	_, _, body, err := c.readPacket()
	if err != nil {
		_ = c.conn.Close()
		c.conn = nil
		return "", err
	}

	return body, nil
}

func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

func (c *Client) sendPacket(id, pktType int32, body string) error {
	buf := new(bytes.Buffer)
	bodyBytes := append([]byte(body), 0, 0)
	size := int32(4 + 4 + len(bodyBytes))

	_ = binary.Write(buf, binary.LittleEndian, size)
	_ = binary.Write(buf, binary.LittleEndian, id)
	_ = binary.Write(buf, binary.LittleEndian, pktType)
	buf.Write(bodyBytes)

	_, err := c.conn.Write(buf.Bytes())
	return err
}

func (c *Client) readPacket() (int32, int32, string, error) {
	var size int32
	if err := binary.Read(c.conn, binary.LittleEndian, &size); err != nil {
		return 0, 0, "", err
	}

	if size < 8 || size > 65535 {
		return 0, 0, "", fmt.Errorf("invalid packet size: %d", size)
	}

	data := make([]byte, size)
	if _, err := io.ReadFull(c.conn, data); err != nil {
		return 0, 0, "", err
	}

	id := int32(binary.LittleEndian.Uint32(data[0:4]))
	pktType := int32(binary.LittleEndian.Uint32(data[4:8]))
	body := string(bytes.TrimRight(data[8:], "\x00"))

	return id, pktType, body, nil
}
