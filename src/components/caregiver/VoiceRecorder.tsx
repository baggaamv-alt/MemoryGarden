"use client";

import { useEffect, useRef, useState } from "react";

/** Records a short greeting or song in the browser (MediaRecorder). The caregiver listens before saving. */
export function VoiceRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        blob.current = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setUrl(URL.createObjectURL(blob.current));
        setState("recorded");
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setState("recording");
      timer.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 119) recorder.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone permission was not given, or no microphone was found.");
      setState("error");
    }
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    recorder.current?.stop();
  }

  function save() {
    if (!blob.current) return;
    const ext = blob.current.type.includes("mp4") ? "m4a" : blob.current.type.includes("ogg") ? "ogg" : "webm";
    onRecorded(new File([blob.current], `recording-${Date.now()}.${ext}`, { type: blob.current.type.split(";")[0] }));
    setState("idle");
    setUrl(null);
  }

  if (typeof window !== "undefined" && typeof MediaRecorder === "undefined") {
    return <p className="text-xs text-ink-soft">Recording isn&apos;t supported in this browser — you can upload a sound file instead.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state !== "recording" && state !== "recorded" && (
        <button type="button" className="cg-btn" onClick={start}>
          🎙️ Record a greeting
        </button>
      )}
      {state === "recording" && (
        <>
          <span className="flex items-center gap-2 text-sm font-bold text-coral-deep">
            <span className="h-3 w-3 animate-pulse rounded-full bg-coral-deep" /> Recording {seconds}s
          </span>
          <button type="button" className="cg-btn" onClick={stop}>
            ■ Stop
          </button>
        </>
      )}
      {state === "recorded" && url && (
        <>
          <audio src={url} controls className="h-10" />
          <button type="button" className="cg-btn cg-btn-primary" onClick={save}>
            Use this recording
          </button>
          <button type="button" className="cg-btn" onClick={() => setState("idle")}>
            Discard
          </button>
        </>
      )}
      {error && <p className="w-full text-xs text-coral-deep">{error}</p>}
    </div>
  );
}
