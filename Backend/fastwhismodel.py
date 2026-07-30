"""
fasterwhispermodel.py

Standalone script to test Faster-Whisper transcription on a single audio file,
with the language explicitly set to Urdu (so it doesn't get auto-detected as
Hindi or another similar-sounding language).

SETUP (do once):
    pip install faster-whisper

ffmpeg must already be installed and on PATH.

Run:
    python fasterwhispermodel.py
"""

import time
import os

from faster_whisper import WhisperModel

# ---------------------------------------------------------------------------
# Hardcoded paths -- update to match your machine.
# ---------------------------------------------------------------------------
AUDIO_INPUT_PATH = r"C:\Users\PMYLS\Desktop\STT\Day-22\WhatsApp Ptt 2026-07-23 at 1.40.35 PM.ogg"

# Model size options: "tiny", "base", "small", "medium", "large-v3"
WHISPER_MODEL_SIZE = "small"

# Hardcoded to English since this audio is known to be in English.
# If you switch back to Urdu audio, change this to "ur", or set it to
# None to let Whisper auto-detect instead.
LANGUAGE_CODE = "en"

# task="transcribe" -> output stays in the detected/specified language's script
# task="translate"  -> output is translated into English text regardless of input
TASK_MODE = "transcribe"  # change to "translate" if you want English output


def transcribe_with_faster_whisper(audio_path: str, model_size: str) -> str:
    # device="cpu" + compute_type="int8" -> quantization: smaller memory
    # footprint, faster CPU inference, minor accuracy tradeoff.
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    # beam_size=5: decoder tracks top 5 candidate sequences at each step
    # instead of only the single best guess, then picks the best overall path.
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        language=LANGUAGE_CODE,
        task=TASK_MODE,
    )

    print(f"Detected/forced language: {info.language} (probability: {info.language_probability:.2f})")

    transcription = " ".join(segment.text.strip() for segment in segments)
    return transcription.strip()


if __name__ == "__main__":
    if not os.path.exists(AUDIO_INPUT_PATH):
        raise FileNotFoundError(f"Put a test audio file at: {AUDIO_INPUT_PATH}")

    print(f"Loading Faster-Whisper model ('{WHISPER_MODEL_SIZE}')...")
    print(f"Transcribing with Faster-Whisper (language={LANGUAGE_CODE}, task={TASK_MODE})...")

    start_time = time.time()
    transcription = transcribe_with_faster_whisper(AUDIO_INPUT_PATH, WHISPER_MODEL_SIZE)
    elapsed = time.time() - start_time

    print("\n--- FASTER-WHISPER RESULT ---")
    print(f"Transcription: {transcription}")
    print(f"Time taken: {elapsed:.2f} seconds")