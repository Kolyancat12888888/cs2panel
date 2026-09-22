package installer

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	MetamodLinuxURL = "https://mms.alliedmods.net/mmsdrop/2.0/mmsource-2.0.0-git1411-linux.tar.gz"
	CSSLatestURL    = "https://github.com/roflmuffin/CounterStrikeSharp/releases/latest/download/counterstrikesharp-with-runtime-build-latest-linux.zip"
)

type ModInstaller struct{}

func NewModInstaller() *ModInstaller {
	return &ModInstaller{}
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

	// 2. Download and extract CounterStrikeSharp Latest
	if err := m.downloadAndExtractZip(CSSLatestURL, csgoDir); err != nil {
		return fmt.Errorf("failed to install CounterStrikeSharp: %w", err)
	}

	// 3. Patch gameinfo.gi for Metamod injection
	if err := m.patchGameInfo(filepath.Join(csgoDir, "gameinfo.gi")); err != nil {
		return fmt.Errorf("failed to patch gameinfo.gi: %w", err)
	}

	return nil
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
	resp, err := http.Get(url)
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

	resp, err := http.Get(url)
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
