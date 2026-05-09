import pyaudio
import json
import sys
import re

def list_mics():
    p = pyaudio.PyAudio()
    mics = []
    seen_names = set()
    
    for i in range(p.get_device_count()):
        dev = p.get_device_info_by_index(i)
        
        # Only take input devices from Host API 0 (MME)
        if dev.get('maxInputChannels') > 0 and dev.get('hostApi') == 0:
            full_name = dev.get('name')
            
            # Remove ONLY the protocol suffixes like (MME), (WASAPI), etc.
            # but keep the descriptive hardware name.
            clean_name = re.sub(r'\s*\((MME|WASAPI|DirectSound|ASIO|Windows WASAPI)\)', '', full_name).strip()
            
            if clean_name and clean_name not in seen_names:
                # Blacklist obviously non-mic entries
                blacklist = ["Stereo Mix", "PC Speaker", "Primary", "Mapper", "Steam Streaming"]
                if any(b.lower() in clean_name.lower() for b in blacklist):
                    continue
                    
                mics.append({
                    "index": i,
                    "name": clean_name
                })
                seen_names.add(clean_name)
            
    print(json.dumps(mics))
    p.terminate()

if __name__ == "__main__":
    list_mics()
