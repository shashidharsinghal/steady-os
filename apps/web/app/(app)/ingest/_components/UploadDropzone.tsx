"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@stride-os/ui/lib/utils";
import { uploadFile } from "../actions";

export function UploadDropzone() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const reason = rejectedFiles[0]?.errors[0]?.message ?? "File rejected.";
        toast.error(reason as string);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      startTransition(async () => {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const { runId } = await uploadFile(formData);
          router.push(`/ingest/${runId}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
        }
      });
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[20px] border-2 border-dashed px-8 py-16 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/30",
        isPending && "cursor-not-allowed opacity-60"
      )}
    >
      <input {...getInputProps()} />
      <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl border">
        <Upload className={cn("h-6 w-6", isPending ? "text-muted-foreground" : "text-primary")} />
      </div>
      {isPending ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Uploading…</p>
          <p className="text-muted-foreground text-xs">Please wait</p>
        </div>
      ) : isDragActive ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Drop it here</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium">Drag a file here, or click to browse</p>
          <p className="text-muted-foreground text-xs">.xlsx, .xls, .csv — max 50 MB</p>
        </div>
      )}
    </div>
  );
}
