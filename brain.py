import os
import sys
import json
import time
import io
import wave
import pyaudio
import requests
import threading
import numpy as np

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), 'config.json')
with open(config_path, 'r') as f:
    config = json.load(f)

GROQ_KEY = config.get("groq_key")
LANGUAGE = config.get("language", "auto")
SILENCE_THRESHOLD = config.get("silence_threshold", 500)
SILENCE_DURATION = config.get("silence_duration", 15)

def transcribe_audio(audio_data, sample_rate):
    """Sends audio to Groq Whisper for near-instant transcription."""
    print(json.dumps({"status": "transcribing"}))
    sys.stdout.flush()
    
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2) # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data)
    
    buffer.seek(0)
    
    try:
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {GROQ_KEY}"}
        files = {"file": ("speech.wav", buffer, "audio/wav")}
        data = {
            "model": "whisper-large-v3", 
            "response_format": "text",
            "temperature": 0.0,
            "prompt": "Technical dictation."
        }

        if LANGUAGE != "auto":
            data["language"] = LANGUAGE
        
        response = requests.post(url, headers=headers, files=files, data=data, timeout=5)
        if response.status_code == 200:
            return response.text.strip()
        else:
            sys.stderr.write(f"Groq API Error: {response.status_code} - {response.text}\n")
            sys.stderr.flush()
    except Exception as e:
        sys.stderr.write(f"Transcription Exception: {e}\n")
        sys.stderr.flush()
    return None

def transcribe_wrapper(audio_bytes, rate):
    try:
        text = transcribe_audio(audio_bytes, rate)
        if text:
            clean_text = text.strip()
            lower_text = clean_text.lower()
            
            # Common Whisper Hallucinations (Discard these if they are the ONLY text)
            hallucinations = [
                "technical dictation.", "thank you.", "thank you", "thanks for watching", 
                "thanks for watching.", "thanks for watching!", "hello.", "hello",
                "bye.", "bye", "you", "please subscribe", "feel it in my...", "feel it in my"
            ]
            
            if lower_text not in hallucinations:
                # Check for "Nebula, " command trigger
                if lower_text.startswith("nebula"):
                    # Remove "nebula" and punctuation
                    cmd_part = clean_text[6:].strip().lstrip(',').strip()
                    if cmd_part:
                        print(json.dumps({"command": cmd_part}))
                        sys.stdout.flush()
                        return

                print(json.dumps({"text": clean_text}))
                sys.stdout.flush()
            else:
                sys.stderr.write(f"Filtered Hallucination: {clean_text}\n")
                sys.stderr.flush()
    finally:
        print(json.dumps({"status": "idle"}))
        sys.stdout.flush()

def listen():
    p = pyaudio.PyAudio()
    rate = 16000
    chunk = 1024
    
    mic_index = config.get("mic_index")
    
    try:
        stream = p.open(
            format=pyaudio.paInt16, 
            channels=1, 
            rate=rate, 
            input=True, 
            frames_per_buffer=chunk,
            input_device_index=mic_index
        )
    except Exception as e:
        sys.stderr.write(f"Mic Open Error: {e}\n")
        # Fallback to default
        stream = p.open(format=pyaudio.paInt16, channels=1, rate=rate, input=True, frames_per_buffer=chunk)
    
    print(json.dumps({"status": "brain_ready"}))
    sys.stdout.flush()

    frames = []
    silent_chunks = 0
    is_speaking = False
    
    while True:
        try:
            data = stream.read(chunk, exception_on_overflow=False)
            if not data: continue
            
            frames.append(data)
            audio_np = np.frombuffer(data, dtype=np.int16)
            volume = np.abs(audio_np).mean()
            
            # Broadcast volume to Electron for visualizer
            print(json.dumps({"v": float(volume)}))
            sys.stdout.flush()
            
            if volume > SILENCE_THRESHOLD:
                if not is_speaking:
                    is_speaking = True
                    print(json.dumps({"status": "listening"}))
                    sys.stdout.flush()
                silent_chunks = 0
            else:
                silent_chunks += 1

            if is_speaking and silent_chunks > SILENCE_DURATION:
                audio_bytes = b"".join(frames)
                if len(audio_bytes) > 4000: # 0.25s minimum
                    threading.Thread(target=transcribe_wrapper, args=(audio_bytes, rate), daemon=True).start()
                frames = []
                is_speaking = False
                silent_chunks = 0
        except Exception as e:
            sys.stderr.write(f"Loop Error: {e}\n")
            sys.stderr.flush()

if __name__ == "__main__":
    listen()
