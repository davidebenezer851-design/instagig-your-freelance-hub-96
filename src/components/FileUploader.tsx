import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { File as FileIcon, ImageIcon, Loader2, Paperclip, Star, X } from "lucide-react";
import { toast } from "sonner";

export type Attachment = {
  url: string;
  path: string;
  name: string;
  type: string;
  size: number;
  is_cover?: boolean;
};

export function isImage(type: string) {
  return type.startsWith("image/");
}

export function FileUploader({
  value,
  onChange,
  folder,
  maxFiles = 6,
}: {
  value: Attachment[];
  onChange: (v: Attachment[]) => void;
  folder: "gigs" | "jobs";
  maxFiles?: number;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !user) return;
    if (value.length + files.length > maxFiles) {
      toast.error(`Max ${maxFiles} files`);
      return;
    }
    setUploading(true);
    const uploaded: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is over 10MB`); continue; }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-attachments").upload(path, file, {
        contentType: file.type, cacheControl: "3600",
      });
      if (error) { toast.error(error.message); continue; }
      const { data } = await supabase.storage.from("post-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
      uploaded.push({
        url: data?.signedUrl ?? "",
        path,
        name: file.name,
        type: file.type,
        size: file.size,
        is_cover: value.length === 0 && uploaded.length === 0 && isImage(file.type),
      });
    }
    onChange([...value, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(idx: number) {
    const item = value[idx];
    await supabase.storage.from("post-attachments").remove([item.path]);
    const next = value.filter((_, i) => i !== idx);
    if (item.is_cover && next.length > 0) {
      const firstImg = next.findIndex((a) => isImage(a.type));
      if (firstImg >= 0) next[firstImg] = { ...next[firstImg], is_cover: true };
    }
    onChange(next);
  }

  function makeCover(idx: number) {
    onChange(value.map((a, i) => ({ ...a, is_cover: i === idx && isImage(a.type) })));
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/40 p-6 text-center transition hover:border-primary/60 hover:bg-primary/5"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <>
            <Paperclip className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">Drop files or click to upload</p>
            <p className="text-xs text-muted-foreground">Images, PDFs, docs. Up to {maxFiles} files, 10MB each.</p>
          </>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((a, i) => (
            <div key={a.path} className="group relative overflow-hidden rounded-lg border border-border bg-secondary">
              <div className="relative aspect-video w-full">
                {isImage(a.type) ? (
                  <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3">
                    <FileIcon className="h-8 w-8 text-primary" />
                    <span className="line-clamp-2 text-center text-[10px] text-muted-foreground">{a.name}</span>
                  </div>
                )}
                {a.is_cover && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                {isImage(a.type) ? (
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => makeCover(i)}>
                    <Star className={`mr-1 h-3 w-3 ${a.is_cover ? "fill-primary text-primary" : ""}`} /> Cover
                  </Button>
                ) : <span className="px-2 text-[10px] text-muted-foreground"><ImageIcon className="inline h-3 w-3" /> file</span>}
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)} aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}