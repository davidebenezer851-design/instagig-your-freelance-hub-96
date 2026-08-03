import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Crop as CropIcon } from "lucide-react";

async function getCroppedBlob(src: string, area: Area, rotation: number, mime = "image/jpeg"): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bW = image.width * cos + image.height * sin;
  const bH = image.width * sin + image.height * cos;
  const c1 = document.createElement("canvas");
  c1.width = bW; c1.height = bH;
  const ctx1 = c1.getContext("2d")!;
  ctx1.translate(bW / 2, bH / 2);
  ctx1.rotate(rad);
  ctx1.drawImage(image, -image.width / 2, -image.height / 2);
  const c2 = document.createElement("canvas");
  c2.width = area.width; c2.height = area.height;
  const ctx2 = c2.getContext("2d")!;
  ctx2.drawImage(c1, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise<Blob>((res) => c2.toBlob((b) => res(b!), mime, 0.9));
}

export function ImageEditor({
  file, open, onCancel, onConfirm,
}: { file: File | null; open: boolean; onCancel: () => void; onConfirm: (blob: Blob, previewUrl: string) => void }) {
  const [src] = useState(() => (file ? URL.createObjectURL(file) : ""));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, px: Area) => setAreaPx(px), []);

  async function confirm() {
    if (!file) return;
    setBusy(true);
    try {
      if (areaPx) {
        const blob = await getCroppedBlob(src, areaPx, rotation, file.type || "image/jpeg");
        onConfirm(blob, URL.createObjectURL(blob));
      } else {
        // Crop area not ready (image still measuring) — send the original file.
        onConfirm(file, URL.createObjectURL(file));
      }
    } catch {
      onConfirm(file, URL.createObjectURL(file));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="flex items-center gap-2 font-display"><CropIcon className="h-4 w-4 text-primary" /> Edit image</DialogTitle>
        </DialogHeader>
        <div className="relative h-[55vh] w-full bg-black">
          {src && (
            <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={undefined}
              onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={onCropComplete} />
          )}
        </div>
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Zoom</label>
            <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Rotate</label>
            <div className="flex items-center gap-2">
              <Slider min={0} max={360} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0])} />
              <Button type="button" size="icon" variant="ghost" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-border p-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={confirm} disabled={busy || !areaPx}>{busy ? "Processing..." : "Done"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
