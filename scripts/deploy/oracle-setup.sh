#!/usr/bin/env bash
# One-time setup for a fresh Oracle Cloud Always Free A1 VM (Ubuntu 24.04, arm64/aarch64).
# Run as the default Ubuntu user (has sudo), after `ssh ubuntu@<vm-ip>`:
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/scripts/deploy/oracle-setup.sh | bash
# or copy the repo first and run it locally: bash scripts/deploy/oracle-setup.sh
#
# What it does: installs Docker + compose plugin, opens the OS firewall (ufw) for the ports this
# project needs (the Oracle VCN security list is separate — see docs/deploy/README.md), and installs
# a systemd unit so `docker compose up -d` survives a reboot.
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/ddtank}"
COMPOSE_FILE="$REPO_DIR/docker-compose.yml"

echo "==> apt update + base packages"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg ufw git

echo "==> Docker Engine + compose plugin (official repo, arm64)"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "    added $USER to the docker group — log out/in (or 'newgrp docker') before running docker without sudo"
else
  echo "    docker already installed, skipping"
fi

echo "==> OS firewall (ufw): 22 (ssh), 80+443 (web/TLS), 9200 (game TCP), 843 (Flash policy), 8081 (admin, IP-only mode)"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 9200/tcp
sudo ufw allow 843/tcp
sudo ufw allow 8081/tcp
sudo ufw --force enable
sudo ufw status verbose

cat <<'EOF'

==> Oracle VCN security list (done in the OCI web console, NOT on this VM — ufw above is only the OS side):
    Networking > Virtual Cloud Networks > <your VCN> > Security Lists > Default Security List
    Add Ingress Rules (stateless: no, source 0.0.0.0/0 unless you want to restrict it):
      TCP  22    (ssh — restrict source to your own IP/32 if possible)
      TCP  80
      TCP  443
      TCP  9200
      TCP  843
      TCP  8081
    Both the VCN list AND ufw must allow a port, or the game/admin ports stay unreachable.

EOF

echo "==> systemd unit: docker-compose starts on boot from $REPO_DIR"
sudo tee /etc/systemd/system/ddtank.service > /dev/null <<EOF
[Unit]
Description=DDTank Reborn (docker compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/docker compose -f $COMPOSE_FILE up -d
ExecStop=/usr/bin/docker compose -f $COMPOSE_FILE down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable ddtank.service

cat <<EOF

Done. Next steps:
  1. git clone <your fork> $REPO_DIR   (if not already there)
  2. rsync/upload vendor/_assets/merged and vendor/DDTank41 to $REPO_DIR/vendor/ (see docs/deploy/README.md §3)
  3. cd $REPO_DIR && node scripts/gen-secrets.mjs
  4. edit .env, apps/api/.env, apps/game/.env for your domain/IP (docs/deploy/README.md §4)
  5. docker compose --profile assets run --rm assets    # one-shot map/crater fix
  6. sudo systemctl start ddtank    (or: docker compose up -d)
EOF
