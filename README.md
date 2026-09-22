# 🎮 CS2Panel — Next-Generation Counter-Strike 2 Server Management Platform

<div align="center">

![CS2Panel Banner](https://img.shields.io/badge/CS2-Dedicated%20Server-de6e16?style=for-the-badge&logo=counter-strike&logoColor=white)
![Architecture](https://img.shields.io/badge/Architecture-Shared%20Master%20Symlinks-00d26a?style=for-the-badge)
![Go Daemon](https://img.shields.io/badge/Daemon-Go%201.22-2b7fff?style=for-the-badge&logo=go&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-Laravel%2011%20%2F%20PHP%208.3-f83a3a?style=for-the-badge&logo=laravel&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20%2F%20Tailwind-black?style=for-the-badge&logo=next.js&logoColor=white)

**High-performance, resource-efficient CS2 game server orchestration with Pterodactyl-like node sharing and single Master Instance (~40 GB shared storage).**

</div>

---

## ⚡ Key Innovations & Features

### 🚀 1. Shared Master Instance & Symlink Engine
- **Zero Storage Waste**: All game instances share a single immutable SteamCMD CS2 installation (~40 GB VPKs and binaries).
- **Isolated User Directories**: Each server gets private directories for:
  - `game/csgo/addons` (CounterStrikeSharp + Metamod plugins)
  - `game/csgo/cfg` (`server.cfg`, `gamemode_*.cfg`, `autoexec.cfg`)
  - `game/csgo/maps` (Custom & workshop maps)
  - `game/csgo/sound` & `game/csgo/resource`
  - `game/csgo/logs` & GOTV `.dem` demos
- **Instant Deployment**: Spin up new CS2 servers in under 2 seconds.

### 🛡️ 2. Modern Modding Ecosystem
- **Metamod:Source `2.0.0-git1411`**: Pre-configured and auto-injected into `gameinfo.gi`.
- **CounterStrikeSharp (.NET 8 Runtime)**: Pre-installed for fast C# plugin development and execution.
- **1-Click Marketplace**: Install MatchZy, Weapon Paints (WS/Knife), VIP Core, Retakes, RockTheVote (RTV), and Kento-RankMe with zero manual editing.

### 💻 3. High Performance Go Daemon (`cs2-daemon`)
- **Embedded SFTP Server**: Secure chroot access per server instance.
- **Source RCON Connector**: High-speed command execution with WebSocket live streaming and Valve color formatting.
- **A2S Server Monitor**: Sub-millisecond UDP ping, player score, and tickrate monitoring.
- **Crash Detection & Auto-Restart**: Automatic recovery and crash-dump capture.

---

## 📁 Repository Structure

```
cs2panel/
├── daemon/               # Go Wings-like Node Agent
│   ├── pkg/master/       # SteamCMD Master CS2 Manager
│   ├── pkg/symlinks/     # Symlink & Isolated Directory Engine
│   ├── pkg/installer/    # Metamod 2-git1411 & CSS Auto-Installer
│   ├── pkg/rcon/         # Source RCON Engine
│   ├── pkg/sftp/         # Chrooted Go SFTP Server
│   ├── pkg/runner/       # CS2 Process & Crash Supervisor
│   └── main.go           # Entrypoint
│
├── backend/              # Laravel 11 REST API
│   ├── app/Models/       # Server, Node, User, Plugin, Ban, Admin, Ticket
│   ├── app/Http/         # 30 Modular Controllers & Services
│   ├── database/         # Migrations & Seeders
│   └── routes/api.php    # REST API v1
│
├── frontend/             # Next.js 14 App Router
│   ├── src/app/          # Cyberpunk Dark UI Dashboard & Server Views
│   ├── src/components/   # Web Terminal (xterm), Config Editor, Navbar
│   └── src/lib/          # API Client & TypeScript definitions
│
├── docker/               # Dockerfiles for Daemon, Backend, Frontend
└── docker-compose.yml    # 1-Command Production Launch
```

---

## 🚀 Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/Kolyancat12888888/cs2panel.git
cd cs2panel

# Build and start all services
docker compose up -d --build
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Go Daemon API**: `http://localhost:8080`
- **Default Admin**: `admin@cs2panel.local` / `admin123`

---

## 📜 License
MIT License. Built for the Counter-Strike 2 Server Community.
