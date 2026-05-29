import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatFileSize,
  getMediaUrl,
  isImageMedia,
  normalizeMediaItems,
} from "@/lib/media";

export default function MediaGallery({
  title = "",
  items,
  emptyText = "No files yet.",
}) {
  const media = normalizeMediaItems(items);
  const [selected, setSelected] = useState(null);

  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <span className="text-xs text-slate-400">
              {media.length} item{media.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => {
            const image = isImageMedia(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  image
                    ? setSelected(item)
                    : window.open(
                        getMediaUrl(item),
                        "_blank",
                        "noopener,noreferrer",
                      )
                }
                className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {image ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-slate-50 text-slate-400">
                    <div className="text-center">
                      <FileText className="mx-auto h-9 w-9" />
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Open file
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.type || "File"}
                    {item.size ? ` - ${formatFileSize(item.size)}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.name || "File"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {isImageMedia(selected) ? (
                <img
                  src={selected.url}
                  alt={selected.name}
                  className="max-h-[70vh] w-full rounded-2xl object-contain bg-slate-950/5"
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    This file can be opened in a new tab.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {selected.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selected.type || "File"}
                    {selected.size ? ` - ${formatFileSize(selected.size)}` : ""}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={selected.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
