"""
Standalone script to test wav2vec2 transcription on a single audio file.
Uses Hugging Face's pretrained + fine-tuned wav2vec2 model (facebook/wav2vec2-base-960h),
which was pre-trained self-supervised (masking game, no labels) then
fine-tuned on ~960 hours of labeled English audio (LibriSpeech).

SETUP (do once):
    pip install transformers torch librosa soundfile

First run will download the model (~360MB) from Hugging Face --
needs internet access once, then it's cached locally.

Run:
    python test_wav2vec2_model.py
"""

import time
import os

import torch
import librosa
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

# ---------------------------------------------------------------------------
# Hardcoded paths -- update to match your machine.
# ---------------------------------------------------------------------------
AUDIO_INPUT_PATH = r"C:\Users\PMYLS\Desktop\STT\Day-22\WhatsApp Ptt 2026-07-23 at 1.40.35 PM.ogg"

# Pretrained + fine-tuned model from Hugging Face (English).
MODEL_NAME = "facebook/wav2vec2-base-960h"


def transcribe_with_wav2vec2(audio_path: str, model_name: str) -> str:
    # wav2vec2 expects raw waveform at 16kHz, mono -- same sampling
    # concept as the other models. librosa handles the resampling here.
    speech_array, sample_rate = librosa.load(audio_path, sr=16000)

    processor = Wav2Vec2Processor.from_pretrained(model_name)
    model = Wav2Vec2ForCTC.from_pretrained(model_name)

    # Convert raw waveform into the input format the model expects.
    input_values = processor(
        speech_array, sampling_rate=16000, return_tensors="pt"
    ).input_values

    # Forward pass through: feature encoder -> transformer encoder -> CTC layer
    with torch.no_grad():
        logits = model(input_values).logits

    # CTC output is per-timestep letter probabilities -- take the most
    # likely letter at each step, then decode (removes duplicates/blanks).
    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)[0]

    return transcription.strip()


if __name__ == "__main__":
    if not os.path.exists(AUDIO_INPUT_PATH):
        raise FileNotFoundError(f"Put a test audio file at: {AUDIO_INPUT_PATH}")

    print("Loading wav2vec2 model (first run downloads it, ~360MB)...")
    print("Transcribing with wav2vec2...")

    start_time = time.time()
    transcription = transcribe_with_wav2vec2(AUDIO_INPUT_PATH, MODEL_NAME)
    elapsed = time.time() - start_time

    print("\n--- WAV2VEC2 RESULT ---")
    print(f"Transcription: {transcription}")
    print(f"Time taken: {elapsed:.2f} seconds")