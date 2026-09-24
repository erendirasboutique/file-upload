"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Confetti from "./components/Confetti";

type Upload = {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  link?: string;
  viewPath?: string;
  error?: string;
};

type RecentFile = { key: string; name: string; size: number; uploadedAt: string | null };
type Filter = "all" | "pdf" | "image";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/i;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMin = (now.getTime() - d.getTime()) / 60000;
  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${Math.round(diffMin)} min ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) return "Today";
  if (d.getTime() >= startOfToday - 86400000) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  });
}

function kindOf(name: string): "pdf" | "image" | "other" {
  if (/\.pdf$/i.test(name)) return "pdf";
  if (IMAGE_EXT.test(name)) return "image";
  return "other";
}

/* ---------- icons ---------- */

const UploadIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5 10 17 19 7" />
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const OpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

function FileThumb({ name }: { name: string }) {
  const kind = kindOf(name);
  if (kind === "image") {
    return (
      <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-md bg-[#D9C9B3] text-[#5E4E40]">
        <ImageIcon />
      </span>
    );
  }
  const ext = kind === "pdf" ? "PDF" : (name.split(".").pop() || "FILE").slice(0, 4).toUpperCase();
  return (
    <span className="flex h-14 w-11 shrink-0 items-end justify-center rounded-md border border-sand bg-cream pb-1.5 text-[9px] font-bold text-[#7A6654]">
      {ext}
    </span>
  );
}

/* ---------- page ---------- */

export default function UploadPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const filesById = useRef(new Map<string, File>());
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
    setLoaded(true);
  }, [router]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  function updateUpload(id: string, patch: Partial<Upload>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  function fireConfetti() {
    setCelebrate(false);
    requestAnimationFrame(() => setCelebrate(true));
    setTimeout(() => setCelebrate(false), 4000);
  }

  async function runUpload(id: string, file: File) {
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
        throw new Error(data.error || "Could not get an upload link.");
      }

      const { uploadUrl, viewPath } = await res.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateUpload(id, { progress: Math.round((e.loaded / e.total) * 100) });
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
        xhr.send(file);
      });

      const link = `${window.location.origin}${viewPath}`;
      updateUpload(id, { status: "done", progress: 100, link, viewPath });
      filesById.current.delete(id);
      fireConfetti();
      loadRecent();
    } catch (err) {
      updateUpload(id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  }

  function startUpload(file: File) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    filesById.current.set(id, file);
    setUploads((prev) => [
      { id, name: file.name, size: file.size, status: "uploading", progress: 0 },
      ...prev,
    ]);
    runUpload(id, file);
  }

  function retry(id: string) {
    const file = filesById.current.get(id);
    if (!file) return;
    updateUpload(id, { status: "uploading", progress: 0, error: undefined });
    runUpload(id, file);
  }

  function dismiss(id: string) {
    filesById.current.delete(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(startUpload);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(null), 1500);
  }

  const latestDone = uploads.find((u) => u.status === "done");
  const active = uploads.filter((u) => u.status !== "done");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recent.filter((f) => {
      if (filter !== "all" && kindOf(f.name) !== filter) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recent, query, filter]);

  const filterBtn = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`h-9 rounded-full px-4 text-[13px] transition-all duration-200 active:scale-95 ${
        filter === value
          ? "bg-[#5E4E40] font-semibold text-white"
          : "bg-cream text-[#5E4E40] hover:bg-sand/60"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      {celebrate && <Confetti />}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ---------- left column: upload ---------- */}
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[460px]">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[44px] leading-none text-[#5E4E40]">Share a file</h1>
            <p className="text-[15px] text-ink/60">PDFs and photos, up to 100 MB each.</p>
          </div>

          {/* drop zone */}
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
            role="button"
            tabIndex={0}
            aria-label="Upload files"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={`group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[2rem] p-10 text-cream outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-sand ${
              dragging
                ? "scale-[1.02] bg-[#4B3E33] shadow-xl shadow-[#5E4E40]/30"
                : "bg-[#5E4E40] hover:bg-[#54463A] hover:shadow-lg hover:shadow-[#5E4E40]/20"
            }`}
          >
            <span
              className={`pointer-events-none absolute inset-4 rounded-[1.4rem] border-[1.5px] border-dashed transition-colors ${
                dragging ? "border-cream" : "border-[#A8937D]"
              }`}
            />
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-cream text-[#5E4E40] transition-transform duration-300 group-hover:-translate-y-1">
              <UploadIcon />
            </span>
            <span className="text-center font-display text-[32px] leading-tight">
              {dragging ? "Let go to upload" : "Drop files to upload"}
            </span>
            <span className="inline-flex min-h-[44px] items-center rounded-full bg-cream px-6 text-sm font-semibold text-[#5E4E40] transition-transform duration-200 group-active:scale-95">
              Browse your computer
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* in-progress + failed uploads */}
          {active.map((u) => (
            <div key={u.id} className="flex flex-col gap-2.5 rounded-3xl bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{u.name}</span>
                  {u.status === "error" ? (
                    <span className="text-[13px] text-[#A23B2A]">{u.error}</span>
                  ) : (
                    <span className="text-[13px] text-ink/60">
                      {formatSize((u.size * u.progress) / 100)} of {formatSize(u.size)}
                    </span>
                  )}
                </div>
                {u.status === "uploading" ? (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[#5E4E40]">
                    {u.progress}%
                  </span>
                ) : (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => retry(u.id)}
                      className="h-10 rounded-full border border-sand bg-white px-4 text-[13px] text-[#5E4E40] transition-all hover:bg-[#7A6654] hover:text-white active:scale-95"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(u.id)}
                      className="h-10 rounded-full px-3 text-[13px] text-ink/60 hover:text-ink"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              {u.status === "uploading" && (
                <div className="h-1.5 overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-[#7A6654] transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}

          {/* just uploaded */}
          {latestDone?.link && (
            <div className="flex flex-col gap-3.5 rounded-3xl bg-white p-[22px] ring-1 ring-sand">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
                  Just uploaded
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#2F6B4A]">
                  <CheckIcon /> Ready to share
                </span>
              </div>
              <span className="truncate text-[17px] font-semibold">{latestDone.name}</span>
              <span className="break-all rounded-2xl bg-cream px-3.5 py-3 text-sm text-[#5E4E40]">
                {latestDone.link.replace(/^https?:\/\//, "")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(latestDone.link!)}
                  className="h-[46px] rounded-full bg-[#7A6654] text-sm font-semibold text-white transition-all duration-200 hover:bg-[#5E4E40] hover:shadow-md active:scale-95"
                >
                  {copied === latestDone.link ? "Copied!" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(latestDone.viewPath, "_blank")}
                  className="h-[46px] rounded-full border border-sand bg-white text-sm text-[#5E4E40] transition-all duration-200 hover:border-[#7A6654] active:scale-95"
                >
                  Preview
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------- right column: library ---------- */}
        <section className="flex min-w-0 flex-grow flex-col rounded-[2rem] bg-white px-5 pb-3 pt-6 sm:px-7 sm:pt-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-[32px] text-[#5E4E40]">Library</h2>
            <label className="flex h-11 w-full items-center gap-2 rounded-full bg-cream px-4 text-ink/60 focus-within:ring-2 focus-within:ring-sand sm:w-[280px]">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by file name"
                aria-label="Search files"
                className="min-w-0 flex-grow bg-transparent text-sm text-ink outline-none placeholder:text-ink/50"
              />
            </label>
          </div>

          <div className="mt-[18px] flex gap-2 border-b border-cream pb-4">
            {filterBtn("all", "All")}
            {filterBtn("pdf", "PDFs")}
            {filterBtn("image", "Images")}
          </div>

          <div className="flex flex-col">
            {visible.map((f) => {
              const link = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${f.key}`;
              return (
                <div
                  key={f.key}
                  className="flex items-center gap-4 border-b border-cream px-1 py-3.5 transition-colors last:border-b-0 hover:bg-cream/50"
                >
                  <FileThumb name={f.name} />
                  <div className="flex min-w-0 flex-grow flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">{f.name}</span>
                    <span className="text-[13px] text-ink/60">
                      {formatSize(f.size)}
                      {f.uploadedAt ? ` · ${formatDate(f.uploadedAt)}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(`/f/${f.key}`, "_blank")}
                    aria-label={`Open ${f.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sand bg-white text-[#5E4E40] transition-all duration-200 hover:border-[#7A6654] hover:bg-[#7A6654] hover:text-white active:scale-95"
                  >
                    <OpenIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyLink(link)}
                    className="h-11 shrink-0 rounded-full bg-[#F1E9DD] px-4 text-[13px] font-medium text-[#5E4E40] transition-all duration-200 hover:bg-[#7A6654] hover:text-white active:scale-95"
                  >
                    {copied === link ? "Copied!" : "Copy link"}
                  </button>
                </div>
              );
            })}

            {loaded && visible.length === 0 && (
              <p className="py-12 text-center text-sm text-ink/60">
                {recent.length === 0
                  ? "No files yet. Upload one to get started."
                  : "No files match your search."}
              </p>
            )}
            {!loaded && <p className="py-12 text-center text-sm text-ink/60">Loading files…</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
