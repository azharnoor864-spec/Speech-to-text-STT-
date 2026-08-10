import { useState, useRef, useCallback } from "react";

/**
 * useAudioRecorder
 * ------------------
 * A React hook that wraps the browser's MediaRecorder API.
 * Handles: mic permission, recording start/stop, and building
 * the final audio Blob to send to the backend /api/transcribe endpoint.
 *
 * Returns:
 *  - recordingState: "idle" | "recording" | "transcribing"
 *  - startRecording(): begins capturing mic audio
 *  - stopRecording(): stops capture, resolves with the transcript text
 *  - error: any permission/recording error message
 */
// Backend URL comes from Vercel env var VITE_BACKEND_URL (set this to your
// ngrok/production backend URL — falls back to relative path if unset).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export function useAudioRecorder({ transcribeUrl = `${BACKEND_URL}/api/transcribe` } = {}) {
  const [recordingState, setRecordingState] = useState("idle"); // idle | recording | transcribing
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      // 1. Ask browser for mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Pick a mime type the browser actually supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // 3. Collect audio chunks as they come in
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied or unavailable. Please allow mic permissions.");
      setRecordingState("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      mediaRecorder.onstop = async () => {
        // 4. Combine all chunks into a single audio Blob
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Stop the mic stream tracks (turns off the mic indicator)
        streamRef.current?.getTracks().forEach((track) => track.stop());

        setRecordingState("transcribing");

        try {
          // 5. Send audio to FastAPI backend for transcription
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch(transcribeUrl, {
            method: "POST",
            headers: {
              "ngrok-skip-browser-warning": "true", // bypasses ngrok's interstitial warning page
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.status}`);
          }

          const data = await response.json();
          setRecordingState("idle");
          resolve(data.transcript); // backend returns { transcript: "..." }
        } catch (err) {
          console.error("Transcription error:", err);
          setError("Transcription failed. Please try again.");
          setRecordingState("idle");
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  }, [transcribeUrl]);

  return { recordingState, error, startRecording, stopRecording };
}