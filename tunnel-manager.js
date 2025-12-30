const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3000;
const FRONTEND_ENV_PATH = path.join(__dirname, 'frontend', '.env');
const FIRMWARE_PATH = path.join(__dirname, 'firmware', 'esp32_main.ino');
const MICROCONTROLLER_PATH = path.join(__dirname, 'microcontroller', 'perfume_dispenser_complete', 'perfume_dispenser_complete.ino');

console.log('🚀 Starting Tunnel Manager...');

function updateFiles(url) {
    console.log(`📡 New Tunnel URL: ${url}`);

    // Update frontend/.env
    if (fs.existsSync(FRONTEND_ENV_PATH)) {
        let envContent = fs.readFileSync(FRONTEND_ENV_PATH, 'utf8');
        const apiLine = `REACT_APP_API_URL=${url}/api`;

        if (envContent.includes('REACT_APP_API_URL=')) {
            envContent = envContent.replace(/REACT_APP_API_URL=.*/g, apiLine);
        } else {
            envContent += `\n${apiLine}`;
        }
        fs.writeFileSync(FRONTEND_ENV_PATH, envContent);
        console.log('✅ Updated frontend/.env');
    }

    // Update firmware/esp32_main.ino
    if (fs.existsSync(FIRMWARE_PATH)) {
        let content = fs.readFileSync(FIRMWARE_PATH, 'utf8');
        const regex = /const char\* apiBaseUrl = ".*\/api";/;
        const newLine = `const char* apiBaseUrl = "${url}/api";`;
        content = content.replace(regex, newLine);
        fs.writeFileSync(FIRMWARE_PATH, content);
        console.log('✅ Updated firmware/esp32_main.ino');
    }

    // Update microcontroller/.../perfume_dispenser_complete.ino
    if (fs.existsSync(MICROCONTROLLER_PATH)) {
        let content = fs.readFileSync(MICROCONTROLLER_PATH, 'utf8');
        const regex = /const char\* apiBaseUrl = ".*";/;
        const newLine = `const char* apiBaseUrl = "${url}/api";`;
        content = content.replace(regex, newLine);
        fs.writeFileSync(MICROCONTROLLER_PATH, content);
        console.log('✅ Updated microcontroller/perfume_dispenser_complete/perfume_dispenser_complete.ino');
    }
}

// Start localtunnel with a custom subdomain
const SUBDOMAIN = 'aureole-dispenser';
const lt = spawn('npx', ['lt', '--port', PORT.toString(), '--subdomain', SUBDOMAIN], { shell: true });

lt.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[localtunnel] ${output.trim()}`);

    // Look for the URL in the output
    const match = output.match(/your url is: (https:\/\/.*)/);
    if (match && match[1]) {
        updateFiles(match[1]);
        console.log('\n✨ Automation Complete. Tunnel is active.');
        console.log('Leave this window open to keep the tunnel alive.');
    }
});

lt.stderr.on('data', (data) => {
    console.error(`[localtunnel error] ${data}`);
});

lt.on('close', (code) => {
    console.log(`Tunnel process exited with code ${code}`);
});
