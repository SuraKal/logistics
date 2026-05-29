import { useId } from "react";
import { FileUp, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  formatFileSize,
  isImageMedia,
  normalizeMediaItems,
  readFilesAsMedia,
} from "@/lib/media";

export default function MediaUpload({
  label,
  value,
  onChange,
  multiple = true,
  accept = "image/*",
  helperText = "",
  emptyText = "No files added yet.",
}) {
  const inputId = useId();
  const items = normalizeMediaItems(value);

  const handlePick = async (event) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    const uploaded = await readFilesAsMedia(files);
    const next = multiple ? [...items, ...uploaded] : uploaded.slice(0, 1);
    onChange(next);
    event.target.value = "";
  };

  const handleRemove = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
          >
            {label}
          </Label>
          {helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
        </div>
        <label htmlFor={inputId}>
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <span>
              <FileUp className="mr-2 h-3.5 w-3.5" />
              {multiple ? "Add files" : "Pick file"}
            </span>
          </Button>
        </label>
      </div>

      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handlePick}
        className="hidden"
      />

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-400">
          <Paperclip className="h-4 w-4" />
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              {isImageMedia(item) ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-slate-50 text-slate-400">
                  <div className="text-center">
                    <Paperclip className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      File
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.type || "File"}
                    {item.size ? ` - ${formatFileSize(item.size)}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => handleRemove(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && multiple === false && (
        <p className="text-xs text-slate-400">
          Picking a new file will replace the old one.
        </p>
      )}
    </div>
  );
}

