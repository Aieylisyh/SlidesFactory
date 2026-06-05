#!/bin/bash
# quiz-live WebSocket relay — Tokyo Lighthouse 首次部署
# 在 OrcaTerm 中执行: bash quiz-live-server-setup.sh
set -euo pipefail

RELAY_PORT="${RELAY_PORT:-8082}"
APP_DIR="/opt/quiz-live"

echo "==> 更新系统并安装 Node.js 20、pm2"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "==> 创建目录 $APP_DIR"
sudo mkdir -p "$APP_DIR/scripts" "$APP_DIR/data"
sudo chown -R "$(whoami):$(whoami)" /opt/quiz-live

if [ ! -f "$APP_DIR/scripts/quiz-ws-relay.js" ]; then
  echo ""
  echo "!!! 请先把本机 quiz-live 目录上传到 $APP_DIR"
  echo "    OrcaTerm 点 SFTP，上传:"
  echo "      quiz-live/scripts/quiz-ws-relay.js  -> /opt/quiz-live/scripts/"
  echo "      quiz-live/data/questions.json       -> /opt/quiz-live/data/"
  echo "      quiz-live/data/broadcast-config.json -> /opt/quiz-live/data/"
  echo "    上传完成后重新运行: bash quiz-live-server-setup.sh"
  exit 1
fi

echo "==> 启动 relay (pm2)"
cd "$APP_DIR/scripts"
pm2 delete quiz-relay 2>/dev/null || true
pm2 start quiz-ws-relay.js --name quiz-relay -- --port "$RELAY_PORT"
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$(whoami)" --hp "$HOME" | tail -1 | bash || true

echo "==> 本机健康检查"
sleep 1
curl -s "http://127.0.0.1:${RELAY_PORT}/" || true

echo ""
echo "完成。relay 监听 0.0.0.0:${RELAY_PORT}"
echo "请到腾讯云控制台 -> 轻量应用服务器 -> 防火墙，放行 TCP ${RELAY_PORT}"
echo "公网测试: curl http://$(curl -s ifconfig.me 2>/dev/null || echo '你的公网IP'):${RELAY_PORT}/"
