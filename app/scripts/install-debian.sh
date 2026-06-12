#!/bin/bash
set -e

echo "ClawX AI OS - Debian Installation Script"
echo "----------------------------------------"

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y curl git libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    sudo npm install -g pnpm
fi

# Clone and setup ClawX if not in directory
if [ ! -f "package.json" ]; then
    echo "Cloning ClawX..."
    git clone https://github.com/ValueCell-ai/ClawX.git
    cd ClawX
fi

echo "Initializing project..."
pnpm run init

echo "Building project..."
pnpm run build

# Setup systemd service for headless run
cat <<SERVICE | sudo tee /etc/systemd/system/clawx-ai-os.service
[Unit]
Description=ClawX AI Operating System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/pnpm run dev --headless
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

echo "----------------------------------------"
echo "Installation complete!"
echo "To start the AI OS in headless mode:"
echo "sudo systemctl enable clawx-ai-os"
echo "sudo systemctl start clawx-ai-os"
echo ""
echo "Note: Headless mode uses the Host API for remote control via mobile app."
