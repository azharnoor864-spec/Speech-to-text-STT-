import { useState } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

/**
 * ChatWindow (relevant slice)
 * ----------------------------
 * Wires the Day 22 voice pipeline into the EXISTING /api/query RAG flow
 * (same endpoint used by typed/text input) — no separate voice endpoint needed.
 *
 * Flow:
 *   record -> /api/transcribe -> transcript -> setInputText(transcript)
 *   -> submitQuery(transcript) -> /api/query -> run_rag_query() -> answer
 */
// Backend URL comes from Vercel env var VITE_BACKEND_URL (set this to your
// ngrok/production backend URL — falls back to relative path if unset).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export function useChatWithVoice() {
  const [messages, setMessages] = useState([]); // { role: "user"|"assistant", text }
  const [inputText, setInputText] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState(null);

  const { recordingState, error: recordingError, startRecording, stopRecording } =
    useAudioRecorder({ transcribeUrl: `${BACKEND_URL}/api/transcribe` });

  // -----------------------------------------------------------------
  // Shared submit logic — used by BOTH text mode (typed) and voice mode
  // (auto-filled transcript). This is the "existing RAG query flow".
  // -----------------------------------------------------------------
  const submitQuery = async (queryText) => {
    if (!queryText?.trim()) return;

    // 1. Show the user's question immediately in the chat window
    setMessages((prev) => [...prev, { role: "user", text: queryText }]);
    setInputText("");
    setIsQuerying(true);
    setQueryError(null);

    try {
      // 2. Send to the EXISTING /api/query endpoint (Day 20/21 RAG flow)
      const response = await fetch(`${BACKEND_URL}/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true", // bypasses ngrok's interstitial warning page
        },
        body: JSON.stringify({ query: queryText }),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.status}`);
      }

      const data = await response.json(); // { response: "LLM answer text" }

      // 3. Show the LLM's answer in the chat window
      setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (err) {
      console.error("Query error:", err);
      setQueryError("Could not get an answer. Please try again.");
    } finally {
      setIsQuerying(false);
    }
  };

  // -----------------------------------------------------------------
  // Called when the mic "stop" button is pressed.
  // Gets the transcript, auto-fills the input, then submits it
  // through the SAME submitQuery() used by typed text.
  // -----------------------------------------------------------------
  const handleVoiceStop = async () => {
    try {
      const transcript = await stopRecording(); // waits through "transcribing" state
      setInputText(transcript);   // auto-fill chat input, as required by Day 22 spec
      await submitQuery(transcript); // wire straight into the existing RAG flow
    } catch (err) {
      console.error("Voice input failed:", err);
    }
  };

  return {
    messages,
    inputText,
    setInputText,
    isQuerying,
    queryError,
    recordingState,     // "idle" | "recording" | "transcribing"
    recordingError,
    startRecording,
    handleVoiceStop,     // call this on mic "stop" click
    submitQuery,         // call this on text-mode "send" click
  };
}