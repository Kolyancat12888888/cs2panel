//go:build windows

package main

import (
	"fmt"
	"os/exec"
)

func setProcessGroup(cmd *exec.Cmd) {
	// No-op or Windows specific process attributes if needed
}

func killProcessTree(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	pid := cmd.Process.Pid
	cmdKill := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", pid))
	return cmdKill.Run()
}
