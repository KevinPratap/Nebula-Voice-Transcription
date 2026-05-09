# 🌌 Nebula Agent V1.1

> **The ultra-lightweight, high-performance voice-to-text agent for Windows and macOS.**

Nebula is a "stealth" OS utility that provides near-instant transcription and automation via a simple hotkey. Designed with a premium Glassmorphism aesthetic and a zero-latency audio engine.

![Nebula Dashboard](https://raw.githubusercontent.com/placeholder/nebula/main/preview.png)

## ✨ Features

- **🚀 Near-Instant Transcription**: Powered by Groq + Whisper Large v3 for sub-second voice-to-text.
- **🎨 Premium UI**: Fluid morphing animations, glassmorphic effects, and dynamic status labels.
- **🎡 System Tray Control**: Manage microphones, hotkeys, and transcription memory directly from your taskbar.
- **🍎 Universal Compatibility**: Native support for Windows (PowerShell) and macOS (AppleScript).
- **🛡️ Hallucination Shield**: Advanced noise-filtering to eliminate "Thank you" and other AI artifacts.
- **🏥 Self-Healing**: Automatic crash recovery and microphone fallback.

## 🛠️ Setup

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/yourusername/nebula-agent.git
   cd nebula-agent
   ```

2. **Install Dependencies**:
   - **Node.js**: `npm install`
   - **Python**: Ensure you have Python 3.10+ and install requirements:
     ```bash
     pip install pyaudio numpy requests
     ```

3. **Configure**:
   - Open `config.json` and add your **Groq API Key**.

## 🚀 Usage

### Windows
Double-click **`Nebula.bat`** on your desktop to launch silently.

### macOS
Run **`Nebula_Mac.sh`** from your terminal.

### Controls
- **Default Hotkey**: `Alt + Shift + V`
- **Right-Click Tray**: Change Microphones, customize Hotkeys, or Copy Last Transcription.

## 📄 License
ISC License.

