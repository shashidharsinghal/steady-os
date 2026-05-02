"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@stride-os/ui";
import { uploadFile, uploadPairedPetpoojaReports } from "../actions";
import { INGEST_DOCUMENT_TYPE_OPTIONS } from "../_lib/document-types";

type OutletOption = {
  id: string;
  name: string;
  brand: string;
};

export function UploadDropzone({
  outlets,
  initialOutletId,
}: {
  outlets: OutletOption[];
  initialOutletId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    initialOutletId && outlets.some((outlet) => outlet.id === initialOutletId)
      ? initialOutletId
      : (outlets[0]?.id ?? "")
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("auto_detect");
  const [itemFile, setItemFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

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

  function handlePairedUpload() {
    if (!selectedOutletId) {
      toast.error("Select an outlet before uploading Petpooja reports.");
      return;
    }
    if (!itemFile && !paymentFile) {
      toast.error("Choose at least one Petpooja daily report.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("outlet_id", selectedOutletId);
      if (itemFile) formData.append("item_file", itemFile);
      if (paymentFile) formData.append("payment_file", paymentFile);

      try {
        const result = await uploadPairedPetpoojaReports(formData);
        const nextRunId = result.paymentRunId || result.itemRunId;
        if (nextRunId) router.push(`/ingest/${nextRunId}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Petpooja upload failed.");
      }
    });
  }

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

      <Card className="border shadow-none">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl border">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Petpooja Daily Reports</p>
              <p className="text-muted-foreground text-xs">
                Upload item and payment reports together for a complete day.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="hover:border-primary/40 block cursor-pointer rounded-[16px] border border-dashed p-4 transition-colors">
              <span className="text-sm font-medium">Item Wise Bill Report</span>
              <span className="text-muted-foreground mt-1 block truncate text-xs">
                {itemFile ? itemFile.name : "Choose Item_bill_report_*.xlsx"}
              </span>
              <input
                type="file"
                accept=".xlsx"
                className="sr-only"
                disabled={isPending}
                onChange={(event) => setItemFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="hover:border-primary/40 block cursor-pointer rounded-[16px] border border-dashed p-4 transition-colors">
              <span className="text-sm font-medium">Payment Wise Summary</span>
              <span className="text-muted-foreground mt-1 block truncate text-xs">
                {paymentFile ? paymentFile.name : "Choose payment_wise_summary_*.xls"}
              </span>
              <input
                type="file"
                accept=".xls"
                className="sr-only"
                disabled={isPending}
                onChange={(event) => setPaymentFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handlePairedUpload} disabled={isPending}>
              {isPending ? "Parsing…" : "Parse together"}
            </Button>
            {itemFile && paymentFile ? (
              <p className="text-xs text-emerald-700">Both reports selected.</p>
            ) : itemFile || paymentFile ? (
              <p className="text-xs text-amber-700">
                One report selected. Preview will warn about the missing pair.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

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
