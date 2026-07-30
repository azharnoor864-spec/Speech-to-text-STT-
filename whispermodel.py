"""
test_whisper_model.py

Standalone script to test the ORIGINAL OpenAI Whisper model (not faster-whisper)
on a single audio file. Use this to compare against Vosk, wav2vec2, and
Faster-Whisper on the same test audio.

SETUP (do once):
    pip install openai-whisper

ffmpeg must already be installed and on PATH (same requirement as Vosk).

First run downloads the model weights -- size depends on WHISPER_MODEL_SIZE below.

Run:
    python test_whisper_model.py
"""

import time
import os

import whisper

# ---------------------------------------------------------------------------
# Hardcoded paths -- update to match your machine.
# ---------------------------------------------------------------------------
AUDIO_INPUT_PATH = r"C:\Users\PMYLS\Desktop\STT\Day-22\WhatsApp Ptt 2026-07-23 at 1.40.35 PM.ogg"

# Options: "tiny", "base", "small", "medium", "large-v3"
# "small" matches what we're using for the faster-whisper comparison script.
WHISPER_MODEL_SIZE = "small"


def transcribe_with_whisper(audio_path: str, model_size: str) -> str:
    model = whisper.load_model(model_size)
    result = model.transcribe(audio_path)
    return result["text"].strip()


if __name__ == "__main__":
    if not os.path.exists(AUDIO_INPUT_PATH):
        raise FileNotFoundError(f"Put a test audio file at: {AUDIO_INPUT_PATH}")

    print(f"Loading Whisper model ('{WHISPER_MODEL_SIZE}')...")
    print("Transcribing with original Whisper...")

    start_time = time.time()
    transcription = transcribe_with_whisper(AUDIO_INPUT_PATH, WHISPER_MODEL_SIZE)
    elapsed = time.time() - start_time

    print("\n--- WHISPER (ORIGINAL) RESULT ---")
    print(f"Transcription: {transcription}")
    print(f"Time taken: {elapsed:.2f} seconds")