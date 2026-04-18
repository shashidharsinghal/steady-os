"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@stride-os/ui";
import { uploadOutletPhoto } from "../actions";

type Props = {
  outletId: string;
  currentCount: number;
};

export function UploadOutletPhotoDialog({ outletId, currentCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const dropzone = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropAccepted: (acceptedFiles) => {
      setFile(acceptedFiles[0] ?? null);
    },
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];
      if (firstError?.code === "file-too-large") {
        toast.error("Each photo must be 5 MB or smaller.");
        return;
      }

      toast.error("Upload a JPEG, PNG, or WebP image.");
    },
  });

  async function handleUpload() {
    if (!file) {
      toast.error("Choose a photo first.");
      return;
    }

    setSaving(true);
    try {
      await uploadOutletPhoto(outletId, file, caption);
      toast.success("Photo uploaded.");
      setOpen(false);
      setFile(null);
      setCaption("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFile(null);
          setCaption("");
        }
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)} disabled={currentCount >= 5}>
        <ImagePlus className="mr-2 h-4 w-4" />
        {currentCount === 0 ? "Add photos" : "Upload photo"}
      </Button>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload outlet photo</DialogTitle>
          <DialogDescription>
            Upload up to 5 photos per outlet. JPEG, PNG, and WebP are supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...dropzone.getRootProps()}
            className="border-muted-foreground/20 hover:border-primary/40 bg-muted/20 cursor-pointer rounded-2xl border border-dashed p-6 text-center transition-colors"
          >
            <input {...dropzone.getInputProps()} />
            <p className="font-medium">Drag a photo here, or click to browse</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Maximum file size: 5 MB. {currentCount}/5 photos used.
            </p>
          </div>

          {previewUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="relative h-64 overflow-hidden rounded-xl border">
                <Image
                  src={previewUrl}
                  alt="Selected outlet photo preview"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 512px"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="photo-caption">Caption</Label>
            <Input
              id="photo-caption"
              placeholder="Optional"
              value={caption}
              maxLength={120}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleUpload} disabled={saving || !file}>
            {saving ? "Uploading…" : "Upload photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
