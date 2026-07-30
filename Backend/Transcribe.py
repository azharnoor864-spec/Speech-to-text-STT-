"""
transcribe_endpoint.py
-----------------------
FastAPI route that receives an audio file from the frontend,
runs Faster-Whisper transcription, and returns the text.

Faster-Whisper was chosen over plain Whisper / wav2vec2 / Vosk
after Day 22 benchmarking (best latency/accuracy tradeoff,
built-in auto language detection).
"""

import os
import tempfile
import time
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

router = APIRouter()

# -----------------------------------------------------------------
# Load the model ONCE at startup (not per-request — this is expensive)
# "base" or "small" is a good balance for dev; use "medium"/"large-v3"
# for production if you have GPU + latency budget for it.
# compute_type="int8" keeps CPU inference fast; use "float16" on GPU.
# -----------------------------------------------------------------
MODEL_SIZE = "base"
DEVICE = "cpu"          # switch to "cuda" if you have a GPU available
COMPUTE_TYPE = "int8"   # "float16" if DEVICE == "cuda"

whisper_model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)


class TranscriptResponse(BaseModel):
    transcript: str
    detected_language: str
    duration_seconds: float
    processing_time_seconds: float


@router.post("/api/transcribe", response_model=TranscriptResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts an audio file (webm/ogg/wav) recorded in the browser,
    transcribes it with Faster-Whisper, and returns the text.
    """
    # 1. Basic validation
    # NOTE: browsers report content_type WITH the codec suffix, e.g.
    # "audio/webm;codecs=opus" instead of just "audio/webm". An exact-match
    # check against allowed_types would reject every real browser recording,
    # so we check the base type (before the ";") instead.
    allowed_base_types = ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg"]
    content_type_base = (audio.content_type or "").split(";")[0].strip()
    if content_type_base not in allowed_base_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {audio.content_type}",
        )

    # 2. Whisper needs a file path, so save the upload to a temp file
    suffix = os.path.splitext(audio.filename)[1] or ".webm"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await audio.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # 3. Run transcription
        start_time = time.time()
        segments, info = whisper_model.transcribe(
            tmp_path,
            beam_size=5,
            language=None,  # None = auto-detect language
        )

        # segments is a generator — join all pieces into one string
        transcript_text = " ".join(segment.text.strip() for segment in segments)
        processing_time = time.time() - start_time

        if not transcript_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not detect any speech in the audio.",
            )

        logger.info(
            "Transcribed %.2fs audio in %.2fs (lang=%s)",
            info.duration,
            processing_time,
            info.language,
        )

        return TranscriptResponse(
            transcript=transcript_text,
            detected_language=info.language,
            duration_seconds=round(info.duration, 2),
            processing_time_seconds=round(processing_time, 2),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

    finally:
        # 4. Always clean up the temp file
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)