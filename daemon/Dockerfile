# Multi-stage Dockerfile for CS2 Node Daemon
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o cs2daemon main.go

# Production Runtime with SteamCMD and CS2 dependencies
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install 32-bit & 64-bit runtime libraries required by CS2 / SteamCMD
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      wget \
      tar \
      lib32gcc-s1 \
      lib32stdc++6 \
      libstdc++6 \
      libicu-dev \
      libtcmalloc-minimal4 \
      locales \
      rsync \
      git \
      && locale-gen en_US.UTF-8 && \
    rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# Create cs2 daemon user
RUN useradd -m -d /home/cs2 -s /bin/bash cs2

# Prepare directories
RUN mkdir -p /opt/cs2panel/master_cs2 \
             /opt/cs2panel/instances \
             /opt/cs2panel/backups \
             /opt/cs2panel/steamcmd && \
    chown -R cs2:cs2 /opt/cs2panel /home/cs2

# Copy Daemon Binary from builder
COPY --from=builder /app/cs2daemon /usr/local/bin/cs2daemon
RUN chmod +x /usr/local/bin/cs2daemon

WORKDIR /opt/cs2panel

EXPOSE 8080 2022 27015-27030/udp 27015-27030/tcp

USER cs2

ENTRYPOINT ["/usr/local/bin/cs2daemon"]
CMD ["-config", "/etc/cs2panel/daemon.json"]
