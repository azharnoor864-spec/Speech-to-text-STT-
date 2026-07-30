"""
test_vosk_model.py

Standalone script to test Vosk transcription on a single audio file.
Use this to check accuracy and measure speed BEFORE wiring it into the
FastAPI endpoint -- run each model script on the same audio file and
compare the printed results.

SETUP (do once):
1. pip install vosk
2. Install ffmpeg (Windows): https://www.gyan.dev/ffmpeg/builds/
   -> unzip, add the "bin" folder to your Windows PATH
   -> verify with: ffmpeg -version
3. Download a Vosk model: https://alphacephei.com/vosk/models
   -> "vosk-model-small-en-us-0.15" (~40MB) is a good starting point
   -> unzip it into the path set below

Run:
    python test_vosk_model.py
"""

import json
import subprocess
import time
import wave
import os

from vosk import Model, KaldiRecognizer

# ---------------------------------------------------------------------------
# Hardcoded paths -- update these to match your machine.
# ---------------------------------------------------------------------------
AUDIO_INPUT_PATH = r"C:\Users\PMYLS\Desktop\STT\Day-22\WhatsApp Ptt 2026-07-23 at 1.40.35 PM.ogg"
VOSK_MODEL_PATH = r"C:\Users\PMYLS\Documents\vosk-model-small-en-us-0.15"
CONVERTED_WAV_PATH = r"C:\Users\PMYLS\Desktop\STT\Day-22\sample_vosk_16k.wav"


def convert_to_vosk_wav(input_path: str, output_path: str) -> None:
    """Vosk requires 16kHz, mono, 16-bit PCM WAV."""
    command = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        "-sample_fmt", "s16",
        output_path,
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed:\n{result.stderr}")


def transcribe_with_vosk(wav_path: str, model_path: str) -> str:
    model = Model(model_path)
    wf = wave.open(wav_path, "rb")

    recognizer = KaldiRecognizer(model, wf.getframerate())
    recognizer.SetWords(True)

    full_text_parts = []
    chunk_size = 4000

    while True:
        data = wf.readframes(chunk_size)
        if len(data) == 0:
            break
        if recognizer.AcceptWaveform(data):
            result = json.loads(recognizer.Result())
            if result.get("text"):
                full_text_parts.append(result["text"])

    final_result = json.loads(recognizer.FinalResult())
    if final_result.get("text"):
        full_text_parts.append(final_result["text"])

    wf.close()
    return " ".join(full_text_parts).strip()


if __name__ == "__main__":
    if not os.path.exists(AUDIO_INPUT_PATH):
        raise FileNotFoundError(f"Put a test audio file at: {AUDIO_INPUT_PATH}")
    if not os.path.exists(VOSK_MODEL_PATH):
        raise FileNotFoundError(f"Vosk model not found at: {VOSK_MODEL_PATH}")

    print("Converting audio to Vosk's required format (16kHz mono WAV)...")
    convert_to_vosk_wav(AUDIO_INPUT_PATH, CONVERTED_WAV_PATH)

    print("Transcribing with Vosk...")
    start_time = time.time()
    transcription = transcribe_with_vosk(CONVERTED_WAV_PATH, VOSK_MODEL_PATH)
    elapsed = time.time() - start_time

    print("\n--- VOSK RESULT ---")
    print(f"Transcription: {transcription}")
    print(f"Time taken: {elapsed:.2f} seconds")