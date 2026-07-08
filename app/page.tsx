"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Upload = {
  name: string;
  status: "uploading" | "done" | "error";
  progress: number;
  link?: string;
  error?: string;
};

type RecentFile = { key: string; name: string; size: number; uploadedAt: string | null };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/files");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setRecent(data.files);
    }
  }, [router]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  function updateUpload(name: string, patch: Partial<Upload>) {
    setUploads((prev) => prev.map((u) => (u.name === name ? { ...u, ...patch } : u)));
  }

  async function uploadFile(file: File) {
    setUploads((prev) => [
      { name: file.name, status: "uploading", progress: 0 },
      ...prev,
    ]);

    try {
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't get an upload link.");
      }

      const { uploadUrl, viewPath } = await res.json();

      // Upload directly to R2 with progress via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateUpload(file.name, { progress: Math.round((e.loaded / e.total) * 100) });
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
        xhr.send(file);
      });

      const link = `${window.location.origin}${viewPath}`;
      updateUpload(file.name, { status: "done", progress: 100, link });
      loadRecent();
    } catch (err) {
      updateUpload(file.name, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-taupe mb-6">Share a file</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-[2rem] border-2 border-dashed p-12 text-center transition
          ${dragging ? "border-taupe bg-sand/30" : "border-sand bg-white hover:bg-sand/10"}`}
      >
        <p className="font-display text-xl text-taupe">Drop a PDF or image here</p>
        <p className="text-sm text-ink/50 mt-2">or click to choose a file · up to 100 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Active uploads */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          {uploads.map((u) => (
            <div key={u.name} className="bg-white rounded-[2rem] px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <span className="truncate text-sm">{u.name}</span>
                {u.status === "uploading" && (
                  <span className="text-sm text-taupe shrink-0">{u.progress}%</span>
                )}
                {u.status === "done" && u.link && (
                  <button
                    onClick={() => copyLink(u.link!)}
                    className="shrink-0 rounded-full bg-taupe text-cream text-sm px-4 py-1.5 hover:bg-taupe/90 transition"
                  >
                    {copied === u.link ? "Copied!" : "Copy link"}
                  </button>
                )}
                {u.status === "error" && (
                  <span className="text-sm text-red-700 shrink-0">{u.error}</span>
                )}
              </div>
              {u.status === "uploading" && (
                <div className="mt-2 h-1.5 rounded-full bg-cream overflow-hidden">
                  <div
                    className="h-full bg-taupe transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
              {u.status === "done" && u.link && (
                <a
                  href={u.link}
                  target="_blank"
                  className="block mt-1 text-xs text-taupe/80 truncate hover:underline"
                >
                  {u.link}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent files */}
      {recent.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl text-taupe mb-3">Recent files</h2>
          <div className="bg-white rounded-[2rem] divide-y divide-cream overflow-hidden">
            {recent.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4 px-6 py-3">
                <a
                  href={`/f/${f.key}`}
                  target="_blank"
                  className="truncate text-sm hover:text-taupe transition"
                >
                  {f.name}
                </a>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-ink/40">{formatSize(f.size)}</span>
                  <button
                    onClick={() => copyLink(`${window.location.origin}/f/${f.key}`)}
                    className="rounded-full border border-sand text-xs px-3 py-1 hover:bg-sand/20 transition"
                  >
                    {copied === `${window.location.origin}/f/${f.key}` ? "Copied!" : "Copy link"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
