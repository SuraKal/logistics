const toText = (value) => (value == null ? "" : String(value));

export const makeMediaId = () =>
  `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getMediaUrl = (item) =>
  item?.url || item?.dataUrl || item?.src || item?.path || "";

export const isImageMedia = (item) => {
  const mime = toText(item?.type || item?.mimeType).toLowerCase();
  const url = getMediaUrl(item).toLowerCase();

  return (
    mime.startsWith("image/") ||
    url.startsWith("data:image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].some((ext) =>
      url.includes(ext),
    )
  );
};

export const normalizeMediaItems = (value) => {
  if (!value) return [];

  const list = Array.isArray(value) ? value : [value];

  return list
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        return {
          id: makeMediaId(),
          name: "File",
          type: item.startsWith("data:image/") ? "image/*" : "application/octet-stream",
          url: item,
        };
      }

      return {
        id: item.id || makeMediaId(),
        name: item.name || item.file_name || item.filename || "File",
        type: item.type || item.mimeType || item.content_type || "",
        size: item.size || item.file_size || null,
        url: getMediaUrl(item),
        uploadedAt: item.uploadedAt || item.uploaded_at || item.created_date || null,
      };
    })
    .filter((item) => getMediaUrl(item));
};

export const formatFileSize = (size) => {
  if (!size || Number.isNaN(Number(size))) return "";

  const value = Number(size);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const pickPalette = (seed) => {
  const palettes = [
    ["#0f172a", "#38bdf8"],
    ["#1d4ed8", "#93c5fd"],
    ["#7c3aed", "#c4b5fd"],
    ["#0f766e", "#5eead4"],
    ["#b45309", "#fdba74"],
    ["#166534", "#86efac"],
  ];

  const index = Math.abs(
    Array.from(toText(seed)).reduce((sum, char) => sum + char.charCodeAt(0), 0),
  ) % palettes.length;

  return palettes[index];
};

const escapeSvg = (value) =>
  toText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const makePreviewDataUrl = ({ title, subtitle = "", seed = title }) => {
  const [start, end] = pickPalette(seed);
  const safeTitle = escapeSvg(title);
  const safeSubtitle = escapeSvg(subtitle);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="36" fill="url(#g)" />
      <circle cx="540" cy="74" r="90" fill="rgba(255,255,255,0.14)" />
      <circle cx="96" cy="342" r="130" fill="rgba(255,255,255,0.12)" />
      <rect x="42" y="44" width="556" height="332" rx="26" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" />
      <text x="72" y="156" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">${safeTitle}</text>
      <text x="72" y="206" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="22">${safeSubtitle}</text>
      <text x="72" y="318" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="18">FleetOps</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const readFilesAsMedia = async (files) => {
  const list = Array.from(files || []);

  return Promise.all(
    list.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            resolve({
              id: makeMediaId(),
              name: file.name,
              type: file.type,
              size: file.size,
              url: reader.result,
              uploadedAt: new Date().toISOString(),
            });
          };

          reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
          reader.readAsDataURL(file);
        }),
    ),
  );
};

