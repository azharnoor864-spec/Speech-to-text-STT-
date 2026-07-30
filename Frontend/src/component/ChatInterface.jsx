import { useState, useRef, useEffect } from "react";
import { useChatWithVoice } from "../hooks/useChatWithVoice";

/**
 * ChatInterface.jsx
 * ------------------
 * "Archive Dossier" theme — matches the Day 21 case-file aesthetic.
 * Same logic as before (mic button, recording indicator, transcribing
 * state, auto-fill input, text/voice toggle) — visual layer redesigned.
 */
export default function ChatInterface() {
  const [mode, setMode] = useState("text"); // "text" | "voice"
  const messagesEndRef = useRef(null);

  const {
    messages,
    inputText,
    setInputText,
    isQuerying,
    queryError,
    recordingState,       // "idle" | "recording" | "transcribing"
    recordingError,
    startRecording,
    handleVoiceStop,
    submitQuery,
  } = useChatWithVoice();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    submitQuery(inputText);
  };

  const handleMicClick = () => {
    if (recordingState === "idle") {
      startRecording();
    } else if (recordingState === "recording") {
      handleVoiceStop();
    }
  };

  const micLabel =
    recordingState === "recording"
      ? "RECORDING — tap to stop"
      : recordingState === "transcribing"
      ? "TRANSCRIBING…"
      : "TAP TO RECORD";

  const caseNumber = "STT-022";

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap');

        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(179,57,81,0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(179,57,81,0); }
          100% { box-shadow: 0 0 0 0 rgba(179,57,81,0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dossier-message { animation: fadeSlideIn 0.28s ease-out; }
        .dossier-mic.recording { animation: pulseRing 1.6s infinite; }

        .dossier-scrollbar::-webkit-scrollbar { width: 8px; }
        .dossier-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .dossier-scrollbar::-webkit-scrollbar-thumb { background: #3A4250; border-radius: 8px; }

        @media (prefers-reduced-motion: reduce) {
          .dossier-message, .dossier-mic.recording { animation: none; }
        }
      `}</style>

      <div style={styles.container}>
        {/* ---------------- Header: case-file tab ---------------- */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>ENTERPRISE RAG ENGINE</div>
            <div style={styles.title}>Case File — Query Log</div>
          </div>
          <div style={styles.caseStamp}>
            <span style={styles.caseStampNo}>№</span> {caseNumber}
          </div>
        </div>

        {/* ---------------- Mode toggle: folder tabs ---------------- */}
        <div style={styles.toggleRow}>
          <button
            onClick={() => setMode("text")}
            style={{ ...styles.toggleTab, ...(mode === "text" ? styles.toggleTabActive : {}) }}
          >
            TEXT INPUT
          </button>
          <button
            onClick={() => setMode("voice")}
            style={{ ...styles.toggleTab, ...(mode === "voice" ? styles.toggleTabActive : {}) }}
          >
            VOICE INPUT
          </button>
        </div>

        {/* ---------------- Chat log ---------------- */}
        <div className="dossier-scrollbar" style={styles.messagesBox}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateGlyph}>⌘</div>
              <p style={styles.emptyStateText}>No entries logged yet.</p>
              <p style={styles.emptyStateSubtext}>Submit a query by typing or recording to begin the log.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="dossier-message" style={styles.entryRow}>
              <div style={styles.entryMeta}>
                <span style={{
                  ...styles.entryTag,
                  ...(msg.role === "user" ? styles.entryTagUser : styles.entryTagAssistant),
                }}>
                  {msg.role === "user" ? "INQUIRY" : "FINDING"}
                </span>
                <span style={styles.entryIndex}>{String(i + 1).padStart(3, "0")}</span>
              </div>
              <div style={{
                ...styles.entryCard,
                ...(msg.role === "user" ? styles.entryCardUser : styles.entryCardAssistant),
              }}>
                {msg.text}
              </div>
            </div>
          ))}

          {isQuerying && (
            <div style={styles.statusRow}>
              <span style={styles.statusDot} />
              RETRIEVING FROM ARCHIVE…
            </div>
          )}
          {queryError && <div style={styles.errorRow}>⚠ {queryError}</div>}
          {recordingError && <div style={styles.errorRow}>⚠ {recordingError}</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* ---------------- Input area ---------------- */}
        {mode === "text" ? (
          <form onSubmit={handleTextSubmit} style={styles.inputRow}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="File your question for the record…"
              style={styles.textInput}
              disabled={isQuerying}
            />
            <button type="submit" style={styles.sendBtn} disabled={isQuerying || !inputText.trim()}>
              SUBMIT
            </button>
          </form>
        ) : (
          <div style={styles.voiceRow}>
            <button
              onClick={handleMicClick}
              disabled={recordingState === "transcribing" || isQuerying}
              className={`dossier-mic ${recordingState === "recording" ? "recording" : ""}`}
              style={{
                ...styles.micBtn,
                ...(recordingState === "recording" ? styles.micRecording : {}),
                ...(recordingState === "transcribing" ? styles.micTranscribing : {}),
              }}
            >
              {recordingState === "transcribing" ? "⏳" : "●"}
            </button>
            <span style={styles.micLabel}>{micLabel}</span>

            {inputText && recordingState === "idle" && (
              <div style={styles.transcriptPreview}>
                <span style={styles.transcriptTag}>TRANSCRIBED</span>
                <span>"{inputText}"</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Archive Dossier theme — token system
// Color:  ink #14181F, panel #1C222D, paper #F3EBD8, rust #B33951,
//         gold #C9A227, muted #8B98A5
// Type:   IBM Plex Mono (body/UI), Source Serif 4 (headings)
// ---------------------------------------------------------------------------
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";
const FONT_SERIF = "'Source Serif 4', Georgia, serif";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#14181F",
    backgroundImage:
      "radial-gradient(circle at 20% 0%, rgba(201,162,39,0.06), transparent 40%), radial-gradient(circle at 80% 100%, rgba(179,57,81,0.06), transparent 40%)",
    display: "flex",
    justifyContent: "center",
    padding: "32px 16px",
    fontFamily: FONT_MONO,
  },
  container: {
    width: "100%",
    maxWidth: 640,
    display: "flex",
    flexDirection: "column",
    height: "85vh",
    background: "#1C222D",
    border: "1px solid #2C3542",
    borderRadius: 4,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #2C3542",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.18em",
    color: "#C9A227",
    marginBottom: 4,
  },
  title: {
    fontFamily: FONT_SERIF,
    fontSize: 20,
    fontWeight: 700,
    color: "#F3EBD8",
  },
  caseStamp: {
    fontSize: 12,
    color: "#8B98A5",
    border: "1px solid #3A4250",
    borderRadius: 3,
    padding: "4px 10px",
    letterSpacing: "0.05em",
  },
  caseStampNo: { color: "#B33951" },

  toggleRow: {
    display: "flex",
    borderBottom: "1px solid #2C3542",
  },
  toggleTab: {
    flex: 1,
    padding: "12px 8px",
    border: "none",
    borderRight: "1px solid #2C3542",
    background: "transparent",
    color: "#697382",
    fontFamily: FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.12em",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  toggleTabActive: {
    background: "#14181F",
    color: "#C9A227",
    boxShadow: "inset 0 -2px 0 #C9A227",
  },

  messagesBox: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  emptyState: {
    margin: "auto",
    textAlign: "center",
    color: "#4A5361",
  },
  emptyStateGlyph: { fontSize: 28, marginBottom: 8, color: "#3A4250" },
  emptyStateText: { fontFamily: FONT_SERIF, fontSize: 15, color: "#697382", margin: 0 },
  emptyStateSubtext: { fontSize: 11, color: "#4A5361", marginTop: 6 },

  entryRow: { display: "flex", flexDirection: "column", gap: 4 },
  entryMeta: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  entryTag: {
    fontSize: 10,
    letterSpacing: "0.1em",
    padding: "2px 8px",
    borderRadius: 2,
    fontWeight: 600,
  },
  entryTagUser: { background: "rgba(201,162,39,0.12)", color: "#C9A227" },
  entryTagAssistant: { background: "rgba(179,57,81,0.12)", color: "#D9748D" },
  entryIndex: { fontSize: 10, color: "#3A4250" },

  entryCard: {
    padding: "12px 16px",
    borderRadius: 3,
    fontSize: 14,
    lineHeight: 1.6,
  },
  entryCardUser: {
    background: "#232B38",
    color: "#DDE3EA",
    borderLeft: "3px solid #C9A227",
  },
  entryCardAssistant: {
    background: "#F3EBD8",
    color: "#2A2620",
    borderLeft: "3px solid #B33951",
    fontFamily: FONT_SERIF,
  },

  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    letterSpacing: "0.08em",
    color: "#8B98A5",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#C9A227",
  },
  errorRow: {
    fontSize: 12,
    color: "#D9748D",
    background: "rgba(179,57,81,0.08)",
    padding: "8px 12px",
    borderRadius: 3,
    border: "1px solid rgba(179,57,81,0.25)",
  },

  inputRow: { display: "flex", gap: 8, padding: "16px 24px", borderTop: "1px solid #2C3542" },
  textInput: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 3,
    border: "1px solid #2C3542",
    background: "#14181F",
    color: "#DDE3EA",
    fontFamily: FONT_MONO,
    fontSize: 13,
    outline: "none",
  },
  sendBtn: {
    padding: "12px 20px",
    borderRadius: 3,
    border: "none",
    background: "#B33951",
    color: "#F3EBD8",
    fontFamily: FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.08em",
    cursor: "pointer",
  },

  voiceRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "28px 24px",
    borderTop: "1px solid #2C3542",
  },
  micBtn: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    border: "2px solid #B33951",
    background: "#1C222D",
    color: "#B33951",
    fontSize: 22,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  micRecording: { background: "#B33951", color: "#F3EBD8" },
  micTranscribing: { background: "#C9A227", borderColor: "#C9A227", color: "#14181F", cursor: "not-allowed" },
  micLabel: { fontSize: 11, letterSpacing: "0.1em", color: "#8B98A5" },
  transcriptPreview: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    fontSize: 12,
    color: "#DDE3EA",
    fontStyle: "italic",
  },
  transcriptTag: {
    fontStyle: "normal",
    fontSize: 9,
    letterSpacing: "0.12em",
    color: "#C9A227",
  },
};
