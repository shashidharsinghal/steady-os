"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@stride-os/ui";
import { deleteOutletPhoto, reorderPhotos, setCoverPhoto } from "../actions";
import type { OutletPhotoWithUrl } from "../../photo-utils";
import { OutletPhotoLightbox } from "./OutletPhotoLightbox";
import { UploadOutletPhotoDialog } from "./UploadOutletPhotoDialog";

type Props = {
  outletId: string;
  outletName: string;
  photos: OutletPhotoWithUrl[];
  isPartner: boolean;
};

export function OutletPhotoGallery({ outletId, outletName, photos, isPartner }: Props) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const orderedPhotos = useMemo(
    () => [...photos].sort((a, b) => a.sort_order - b.sort_order),
    [photos]
  );
  const coverPhoto = orderedPhotos.find((photo) => photo.is_cover) ?? orderedPhotos[0] ?? null;
  const otherPhotos = orderedPhotos.filter((photo) => photo.id !== coverPhoto?.id);

  async function handleDelete(photoId: string) {
    try {
      await deleteOutletPhoto(photoId);
      toast.success("Photo deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete photo.");
    }
  }

  async function handleSetCover(photoId: string) {
    try {
      await setCoverPhoto(photoId);
      toast.success("Cover photo updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update cover photo.");
    }
  }

  async function handleReorder(targetPhotoId: string) {
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) {
      return;
    }

    const nextPhotos = [...orderedPhotos];
    const fromIndex = nextPhotos.findIndex((photo) => photo.id === draggedPhotoId);
    const toIndex = nextPhotos.findIndex((photo) => photo.id === targetPhotoId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const [movedPhoto] = nextPhotos.splice(fromIndex, 1);
    if (!movedPhoto) {
      return;
    }
    nextPhotos.splice(toIndex, 0, movedPhoto);

    try {
      await reorderPhotos(
        outletId,
        nextPhotos.map((photo) => photo.id)
      );
      toast.success("Photo order updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder photos.");
    } finally {
      setDraggedPhotoId(null);
    }
  }

  if (orderedPhotos.length === 0) {
    return (
      <div className="from-primary/8 via-muted/80 to-secondary/10 rounded-[20px] border border-dashed bg-gradient-to-br p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-lg font-semibold">No photos yet</p>
            <p className="text-muted-foreground max-w-xl text-sm">
              Add storefront, interior, signage, or team photos so {outletName} feels like a real
              place.
            </p>
          </div>
          {isPartner ? (
            <UploadOutletPhotoDialog outletId={outletId} currentCount={0} />
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <ImagePlus className="h-4 w-4" />
              Photos will appear here once a partner uploads them.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Photos</h2>
            <p className="text-muted-foreground text-sm">
              Up to 5 photos per outlet. Drag photos to reorder the gallery.
            </p>
          </div>
          {isPartner && (
            <UploadOutletPhotoDialog outletId={outletId} currentCount={orderedPhotos.length} />
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {coverPhoto && (
            <PhotoTile
              photo={coverPhoto}
              title="Cover photo"
              large
              isPartner={isPartner}
              onClick={() =>
                setLightboxIndex(orderedPhotos.findIndex((photo) => photo.id === coverPhoto.id))
              }
              onDelete={handleDelete}
              onSetCover={handleSetCover}
              onDragStart={() => setDraggedPhotoId(coverPhoto.id)}
              onDrop={() => handleReorder(coverPhoto.id)}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {otherPhotos.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                title={photo.caption ?? "Outlet photo"}
                isPartner={isPartner}
                onClick={() =>
                  setLightboxIndex(orderedPhotos.findIndex((item) => item.id === photo.id))
                }
                onDelete={handleDelete}
                onSetCover={handleSetCover}
                onDragStart={() => setDraggedPhotoId(photo.id)}
                onDrop={() => handleReorder(photo.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <OutletPhotoLightbox
        photos={orderedPhotos}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}

function PhotoTile({
  photo,
  title,
  large = false,
  isPartner,
  onClick,
  onDelete,
  onSetCover,
  onDragStart,
  onDrop,
}: {
  photo: OutletPhotoWithUrl;
  title: string;
  large?: boolean;
  isPartner: boolean;
  onClick: () => void;
  onDelete: (photoId: string) => void;
  onSetCover: (photoId: string) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable={isPartner}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="group relative overflow-hidden rounded-[20px] border bg-slate-100"
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative block w-full text-left ${large ? "h-[320px]" : "h-[152px]"}`}
      >
        {photo.signed_url ? (
          <Image
            src={photo.signed_url}
            alt={photo.caption ?? title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes={large ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 640px) 100vw, 25vw"}
          />
        ) : (
          <div className="from-muted via-muted/80 to-muted/60 h-full bg-gradient-to-br" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="font-medium">{title}</p>
          {photo.caption && <p className="mt-1 text-sm text-white/80">{photo.caption}</p>}
        </div>
      </button>

      {isPartner && (
        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="border-white/20 bg-black/45 text-white hover:bg-black/60"
            onClick={(event) => {
              event.stopPropagation();
              onSetCover(photo.id);
            }}
          >
            <Star className={`h-4 w-4 ${photo.is_cover ? "fill-current" : ""}`} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="border-white/20 bg-black/45 text-white hover:bg-black/60"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(photo.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-black/45 text-white">
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  );
}
