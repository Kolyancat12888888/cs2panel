package sftp

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type SFTPServer struct {
	Port        string
	ServersRoot string
	AuthFunc    func(username, password string) (serverUUID string, ok bool)
	listener    net.Listener
}

func NewSFTPServer(port, serversRoot string, authFunc func(u, p string) (string, bool)) *SFTPServer {
	return &SFTPServer{
		Port:        port,
		ServersRoot: serversRoot,
		AuthFunc:    authFunc,
	}
}

func (s *SFTPServer) Start() error {
	config := &ssh.ServerConfig{
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			serverUUID, ok := s.AuthFunc(c.User(), string(pass))
			if !ok {
				return nil, fmt.Errorf("password rejected for %q", c.User())
			}
			return &ssh.Permissions{
				Extensions: map[string]string{
					"server_uuid": serverUUID,
				},
			}, nil
		},
	}

	// Generate dynamic RSA 2048 host key
	key, err := generateHostKey()
	if err != nil {
		return fmt.Errorf("failed to generate host key: %w", err)
	}
	config.AddHostKey(key)

	listener, err := net.Listen("tcp", "0.0.0.0:"+s.Port)
	if err != nil {
		return err
	}
	s.listener = listener
	log.Printf("[SFTP] Server listening on port %s", s.Port)

	go func() {
		for {
			nConn, err := listener.Accept()
			if err != nil {
				return
			}

			go s.handleConn(nConn, config)
		}
	}()

	return nil
}

func (s *SFTPServer) Stop() {
	if s.listener != nil {
		_ = s.listener.Close()
	}
}

func (s *SFTPServer) handleConn(nConn net.Conn, config *ssh.ServerConfig) {
	conn, chans, reqs, err := ssh.NewServerConn(nConn, config)
	if err != nil {
		return
	}
	defer conn.Close()

	go ssh.DiscardRequests(reqs)

	serverUUID := conn.Permissions.Extensions["server_uuid"]
	userRoot := filepath.Join(s.ServersRoot, serverUUID)
	_ = os.MkdirAll(userRoot, 0755)

	for newChannel := range chans {
		if newChannel.ChannelType() != "session" {
			_ = newChannel.Reject(ssh.UnknownChannelType, "unknown channel type")
			continue
		}

		channel, requests, err := newChannel.Accept()
		if err != nil {
			continue
		}

		go func(in <-chan *ssh.Request) {
			for req := range in {
				ok := false
				switch req.Type {
				case "subsystem":
					if string(req.Payload[4:]) == "sftp" {
						ok = true
					}
				}
				_ = req.Reply(ok, nil)
			}
		}(requests)

		server, err := sftp.NewServer(
			channel,
			sftp.WithDebug(io.Discard),
			sftp.ReadOnly(),
		)
		if err != nil {
			log.Printf("[SFTP] server init error: %v", err)
			return
		}
		if err := server.Serve(); err == io.EOF {
			_ = server.Close()
		}
	}
}

func generateHostKey() (ssh.Signer, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	privateKeyPEM := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	}
	pemBytes := pem.EncodeToMemory(privateKeyPEM)

	return ssh.ParsePrivateKey(pemBytes)
}
