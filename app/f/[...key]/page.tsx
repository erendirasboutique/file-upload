import { PUBLIC_BASE } from "@/lib/r2";

export const dynamic = "force-dynamic";

const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];

export default function FileViewer({ params }: { params: { key: string[] } }) {
  const key = params.key.map(decodeURIComponent).join("/");
  const fileUrl = `${PUBLIC_BASE}/${key}`;
  const name = params.key.length > 1 ? decodeURIComponent(params.key.slice(1).join("/")) : key;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  const isPdf = ext === "pdf";
  const isImage = IMAGE_EXT.includes(ext);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="font-display text-xl text-taupe truncate">{name}</h1>
        <a
          href={fileUrl}
          download={name}
          className="shrink-0 rounded-full bg-taupe text-cream text-sm px-5 py-2 hover:bg-taupe/90 transition"
        >
          Download
        </a>
      </div>

      <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm">
        {isPdf ? (
          <iframe src={fileUrl} title={name} className="w-full h-[80vh]" />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={name} className="w-full h-auto" />
        ) : (
          <div className="p-12 text-center">
            <p className="text-ink/60 mb-4">
              This file type can&rsquo;t be previewed in the browser.
            </p>
            <a
              href={fileUrl}
              download={name}
              className="inline-block rounded-full bg-taupe text-cream px-6 py-2.5 hover:bg-taupe/90 transition"
            >
              Download {name}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

