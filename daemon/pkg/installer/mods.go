package installer

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	MetamodLinuxURL = "https://mms.alliedmods.net/mmsdrop/2.0/mmsource-2.0.0-git1411-linux.tar.gz"
	CSSFallbackURL  = "https://github.com/roflmuffin/CounterStrikeSharp/releases/download/v1.0.374/counterstrikesharp-with-runtime-linux-1.0.374.zip"
)

type ModInstaller struct {
	client *http.Client
}

func NewModInstaller() *ModInstaller {
	return &ModInstaller{
		client: &http.Client{Timeout: 90 * time.Second},
	}
}

// InstallMetamodAndCSS downloads and unpacks Metamod 2-git1411 and CounterStrikeSharp Latest into instance
func (m *ModInstaller) InstallMetamodAndCSS(instanceRoot string) error {
	csgoDir := filepath.Join(instanceRoot, "game", "csgo")
	addonsDir := filepath.Join(csgoDir, "addons")
	_ = os.MkdirAll(addonsDir, 0755)

	// 1. Download and extract Metamod:Source git1411
	if err := m.downloadAndExtractTarGz(MetamodLinuxURL, csgoDir); err != nil {
		return fmt.Errorf("failed to install metamod: %w", err)
	}

	// 2. Discover dynamic latest CounterStrikeSharp download URL
	cssURL := m.getLatestCSSUrl()

	// Download and extract CounterStrikeSharp Latest
	if err := m.downloadAndExtractZip(cssURL, csgoDir); err != nil {
		// Try fallback URL if dynamic failed
		if cssURL != CSSFallbackURL {
			if fallbackErr := m.downloadAndExtractZip(CSSFallbackURL, csgoDir); fallbackErr == nil {
				goto Patched
			}
		}
		return fmt.Errorf("failed to install CounterStrikeSharp: %w", err)
	}

Patched:
	// 3. Patch gameinfo.gi for Metamod injection
	if err := m.patchGameInfo(filepath.Join(csgoDir, "gameinfo.gi")); err != nil {
		return fmt.Errorf("failed to patch gameinfo.gi: %w", err)
	}

	return nil
}

func (m *ModInstaller) getLatestCSSUrl() string {
	req, err := http.NewRequest("GET", "https://api.github.com/repos/roflmuffin/CounterStrikeSharp/releases/latest", nil)
	if err != nil {
		return CSSFallbackURL
	}
	req.Header.Set("User-Agent", "CS2Panel-Installer/1.0")

	resp, err := m.client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return CSSFallbackURL
	}
	defer resp.Body.Close()

	var rel struct {
		Assets []struct {
			Name               string `json:"name"`
			BrowserDownloadURL string `json:"browser_download_url"`
		} `json:"assets"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return CSSFallbackURL
	}

	for _, a := range rel.Assets {
		if strings.Contains(a.Name, "with-runtime") && strings.Contains(a.Name, "linux") && strings.HasSuffix(a.Name, ".zip") {
			return a.BrowserDownloadURL
		}
	}

	return CSSFallbackURL
}

func (m *ModInstaller) patchGameInfo(gameInfoPath string) error {
	content, err := os.ReadFile(gameInfoPath)
	if err != nil {
		return err
	}

	strContent := string(content)
	if strings.Contains(strContent, "csgo/addons/metamod") {
		return nil // Already patched
	}

	target := "GameSearchPaths"
	idx := strings.Index(strContent, target)
	if idx == -1 {
		return fmt.Errorf("could not find GameSearchPaths in gameinfo.gi")
	}

	braceIdx := strings.Index(strContent[idx:], "{")
	if braceIdx == -1 {
		return fmt.Errorf("malformed gameinfo.gi")
	}

	insertionPoint := idx + braceIdx + 1
	patched := strContent[:insertionPoint] + "\n\t\t\tGame_LowViolence\tcsgo/addons/metamod\n\t\t\tGame\tcsgo/addons/metamod" + strContent[insertionPoint:]

	return os.WriteFile(gameInfoPath, []byte(patched), 0644)
}

func (m *ModInstaller) downloadAndExtractTarGz(url, destDir string) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "CS2Panel-Installer/1.0")

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("http download failed: status %d", resp.StatusCode)
	}

	gzReader, err := gzip.NewReader(resp.Body)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		target := filepath.Join(destDir, header.Name)
		switch header.Typeflag {
		case tar.TypeDir:
			_ = os.MkdirAll(target, 0755)
		case tar.TypeReg:
			_ = os.MkdirAll(filepath.Dir(target), 0755)
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}
			_, _ = io.Copy(outFile, tarReader)
			outFile.Close()
		}
	}
	return nil
}

func (m *ModInstaller) downloadAndExtractZip(url, destDir string) error {
	tmpZip, err := os.CreateTemp("", "css-*.zip")
	if err != nil {
		return err
	}
	defer os.Remove(tmpZip.Name())
	defer tmpZip.Close()

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "CS2Panel-Installer/1.0")

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("http download failed: status %d", resp.StatusCode)
	}

	if _, err := io.Copy(tmpZip, resp.Body); err != nil {
		return err
	}

	zipReader, err := zip.OpenReader(tmpZip.Name())
	if err != nil {
		return err
	}
	defer zipReader.Close()

	for _, file := range zipReader.File {
		target := filepath.Join(destDir, file.Name)
		if file.FileInfo().IsDir() {
			_ = os.MkdirAll(target, 0755)
			continue
		}

		_ = os.MkdirAll(filepath.Dir(target), 0755)
		outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, file.Mode())
		if err != nil {
			return err
		}

		rc, err := file.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, _ = io.Copy(outFile, rc)
		rc.Close()
		outFile.Close()
	}

	return nil
}
