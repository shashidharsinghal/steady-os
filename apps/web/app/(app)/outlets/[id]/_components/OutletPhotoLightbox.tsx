"use client";

import Image from "next/image";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@stride-os/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OutletPhotoWithUrl } from "../../photo-utils";

type Props = {
  photos: OutletPhotoWithUrl[];
  initialIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function OutletPhotoLightbox({ photos, initialIndex, onClose, onNavigate }: Props) {
  const isOpen = initialIndex !== null;
  const selectedPhoto = initialIndex === null ? null : photos[initialIndex];
  const selectedIndex = initialIndex ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl border-none bg-black p-2 text-white sm:p-4">
        {selectedPhoto && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Outlet photo</DialogTitle>
              <DialogDescription>Preview of an outlet photo.</DialogDescription>
            </DialogHeader>
            <div className="relative flex max-h-[80vh] min-h-[50vh] items-center justify-center overflow-hidden rounded-lg bg-black">
              {photos.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60"
                  onClick={() => onNavigate((selectedIndex - 1 + photos.length) % photos.length)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {selectedPhoto.signed_url && (
                <Image
                  src={selectedPhoto.signed_url}
                  alt={selectedPhoto.caption ?? "Outlet photo"}
                  width={1600}
                  height={1200}
                  className="max-h-[80vh] w-full object-contain"
                  sizes="100vw"
                />
              )}
              {photos.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60"
                  onClick={() => onNavigate((selectedIndex + 1) % photos.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
