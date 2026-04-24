"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@stride-os/ui";
import { uploadFile } from "../actions";
import { INGEST_DOCUMENT_TYPE_OPTIONS } from "../_lib/document-types";

type OutletOption = {
  id: string;
  name: string;
  brand: string;
};

export function UploadDropzone({ outlets }: { outlets: OutletOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOutletId, setSelectedOutletId] = useState<string>(outlets[0]?.id ?? "");
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("auto_detect");

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const reason = rejectedFiles[0]?.errors[0]?.message ?? "File rejected.";
        toast.error(reason as string);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;
      if (!selectedOutletId) {
        toast.error("Select an outlet before uploading a report.");
        return;
      }

      const documentTypeOption = INGEST_DOCUMENT_TYPE_OPTIONS.find(
        (option) => option.value === selectedDocumentType
      );
      if (documentTypeOption && !documentTypeOption.available) {
        toast.error(`${documentTypeOption.label} ingestion is not implemented yet.`);
        return;
      }

      startTransition(async () => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("outlet_id", selectedOutletId);
        formData.append("document_type", selectedDocumentType);
        try {
          const { runId } = await uploadFile(formData);
          router.push(`/ingest/${runId}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
        }
      });
    },
    [router, selectedDocumentType, selectedOutletId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "application/pdf": [".pdf"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: isPending,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium">Outlet</p>
          <Select value={selectedOutletId} onValueChange={setSelectedOutletId} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Select outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name} · {outlet.brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Ingestion is outlet-scoped, so choose the outlet before uploading any report.
          </p>
        </div>

        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium">Document type</p>
          <Select
            value={selectedDocumentType}
            onValueChange={setSelectedDocumentType}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose report type" />
            </SelectTrigger>
            <SelectContent>
              {INGEST_DOCUMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={!option.available}>
                  {option.label}
                  {!option.available ? " · Coming soon" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Pick the closest document type to override auto-detection when you already know what the
            file is.
          </p>
          <p className="text-muted-foreground text-[11px] leading-5">
            {INGEST_DOCUMENT_TYPE_OPTIONS.find((option) => option.value === selectedDocumentType)
              ?.description ?? "Let Stride inspect the file automatically."}
          </p>
        </div>
      </div>

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
            <p className="text-muted-foreground text-xs">.xlsx, .xls, .csv, .pdf — max 50 MB</p>
          </div>
        )}
      </div>
      {outlets.length === 0 && (
        <p className="text-sm text-amber-700">
          No active outlets found. Create an outlet before uploading reports.
        </p>
      )}
      {!selectedOutletId && outlets.length > 0 ? (
        <p className="text-sm text-amber-700">Choose an outlet to enable reliable parsing.</p>
      ) : (
        <></>
      )}
    </div>
  );
}
