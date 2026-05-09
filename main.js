const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

// Platform constants
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-speech-input');

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let mainWindow;
let tray;
let brainProcess;
let lastCommandTime = 0;
let lastTranscription = config.last_text || "";

// Universal Python Path Resolver
const nebulaPython = isWin 
    ? "C:\\Users\\prata\\.gemini\\antigravity\\scratch\\nebula_webapp\\nebula-electron\\.venv\\Scripts\\python.exe"
    : "python3"; // Default for Mac/Linux

const debugLog = path.join(__dirname, 'debug_log.txt');

function log(msg) {
    fs.appendFileSync(debugLog, `${new Date().toLocaleTimeString()}: ${msg}\n`);
}

function startBrain() {
    log("Starting brain...");
    if (brainProcess) brainProcess.kill();
    
    const brainPath = path.join(__dirname, 'brain.py');
    brainProcess = spawn(nebulaPython, ['-u', brainPath]);

    brainProcess.on('exit', (code) => {
        log(`Brain process exited with code ${code}`);
        if (code !== null && code !== 0) {
            log("Unexpected exit. Restarting...");
            setTimeout(startBrain, 1000);
        }
    });

    brainProcess.stdout.on('data', (data) => {

        const raw = data.toString();
        const lines = raw.split('\n');
        for (let line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line);
                if (json.text) {
                    lastTranscription = json.text;
                    updateConfig({ last_text: json.text });
                    clipboard.writeText(json.text);
                    autoType();
                    mainWindow.webContents.send('status', 'idle');
                    updateTrayMenu();
                } else if (json.command) {
                    handleCommand(json.command);
                    mainWindow.webContents.send('status', 'idle');
                } else if (json.status) {
                    mainWindow.webContents.send('status', json.status);
                } else if (json.v !== undefined) {
                    mainWindow.webContents.send('volume', json.v);
                }
            } catch (e) {
                // Ignore parsing errors for non-JSON lines
            }
        }
    });
}

function autoType() {
    if (isWin) {
        spawn('powershell.exe', [
            '-Command', 
            '$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys("^v")'
        ]);
    } else if (isMac) {
        spawn('osascript', [
            '-e', 'tell application "System Events" to keystroke "v" using command down'
        ]);
    }
}

function updateConfig(updates) {
    config = { ...config, ...updates };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

function stopBrain() {
    if (brainProcess) {
        brainProcess.kill();
        brainProcess = null;
        log("Brain killed.");
    }
}

function getDevices() {
    try {
        const script = path.join(__dirname, 'list_mics.py');
        const output = execSync(`"${nebulaPython}" "${script}"`).toString();
        return JSON.parse(output);
    } catch (e) {
        log("Error listing devices: " + e);
        return [];
    }
}

function updateTrayMenu() {
    const devices = getDevices();
    const micSubmenu = devices.map(d => ({
        label: d.name,
        type: 'radio',
        checked: config.mic_index === d.index,
        click: () => {
            updateConfig({ mic_index: d.index });
            if (brainProcess) { stopBrain(); startBrain(); }
        }
    }));

    if (micSubmenu.length === 0) micSubmenu.push({ label: 'No Microphones Found', enabled: false });

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Nebula Agent', enabled: false },
        { type: 'separator' },
        { 
            label: 'Copy Last: ' + (lastTranscription.substring(0, 20) + (lastTranscription.length > 20 ? '...' : '') || 'None'), 
            enabled: !!lastTranscription,
            click: () => clipboard.writeText(lastTranscription)
        },
        { type: 'separator' },
        {
            label: 'Microphone',
            submenu: micSubmenu
        },
        {
            label: 'Hotkey',
            submenu: [
                { label: 'Alt+Shift+V', type: 'radio', checked: config.hotkey === 'Alt+Shift+V', click: () => setHotkey('Alt+Shift+V') },
                { label: 'Ctrl+Shift+V', type: 'radio', checked: config.hotkey === 'Ctrl+Shift+V', click: () => setHotkey('Ctrl+Shift+V') },
                { type: 'separator' },
                { label: 'Custom...', click: openHotkeyWindow }
            ]
        },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(contextMenu);
}

let hotkeyWindow;
function openHotkeyWindow() {
    if (hotkeyWindow) return;
    hotkeyWindow = new BrowserWindow({
        width: 350,
        height: 200,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    hotkeyWindow.loadFile('hotkey.html');
    hotkeyWindow.on('closed', () => hotkeyWindow = null);
}

ipcMain.on('save-custom-hotkey', (event, newHotkey) => {
    setHotkey(newHotkey);
    if (hotkeyWindow) hotkeyWindow.close();
});

ipcMain.on('close-hotkey-window', () => {
    if (hotkeyWindow) hotkeyWindow.close();
});

function setHotkey(newKey) {

    globalShortcut.unregister(config.hotkey);
    updateConfig({ hotkey: newKey });
    registerHotkey();
    updateTrayMenu();
}

function registerHotkey() {
    globalShortcut.register(config.hotkey, () => {
        if (mainWindow.isVisible()) {
            mainWindow.webContents.send('stop-visualizer');
            stopBrain();
            setTimeout(() => mainWindow.hide(), 800);
        } else {
            mainWindow.showInactive();
            startBrain();
            mainWindow.webContents.send('start-visualizer');
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 240,
        height: 100,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        show: false,
        focusable: false,
        hasShadow: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    
    // Position at bottom center
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    mainWindow.setPosition(Math.floor((width - 240) / 2), height - 120);

    registerHotkey();

    // Setup Tray
    const iconPath = path.join(__dirname, 'icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('Nebula Agent');
    updateTrayMenu();
}

app.whenReady().then(createWindow);

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopBrain();
});
