FROM golang:1.22-bookworm AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /cs2-daemon main.go

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    tar \
    gzip \
    unzip \
    lib32gcc-s1 \
    lib32stdc++6 \
    libicu-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/cs2panel
COPY --from=builder /cs2-daemon /usr/local/bin/cs2-daemon

RUN mkdir -p /opt/cs2panel/master_cs2 /opt/cs2panel/servers /opt/cs2panel/fastdl

EXPOSE 8080 2022
ENTRYPOINT ["/usr/local/bin/cs2-daemon"]
