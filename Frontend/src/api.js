export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function streamChat(query, { onText, onAudioChunk, onDone, onError }) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true", // bypasses ngrok's interstitial warning page
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Chat stream failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split("\n\n");
        buffer = messages.pop();

        for (const raw of messages) {
          const eventMatch = raw.match(/^event: (.+)$/m);
          const dataMatch = raw.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);
          if (event === "text") onText?.(data.token);
          else if (event === "audio") onAudioChunk?.(data.pcm_b64);
          else if (event === "done") onDone?.();
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err);
    }
  })();

  return () => controller.abort();
}