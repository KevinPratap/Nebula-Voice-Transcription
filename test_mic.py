import pyaudio
try:
    p = pyaudio.PyAudio()
    info = p.get_default_input_device_info()
    print(f"Device found: {info['name']}")
    p.terminate()
except Exception as e:
    print(f"Error: {e}")
