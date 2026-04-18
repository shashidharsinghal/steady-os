"use server";

import { revalidatePath } from "next/cache";
import { requirePartner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteOutletPhotoSchema,
  reorderOutletPhotosSchema,
  setCoverPhotoSchema,
  uploadOutletPhotoSchema,
} from "@stride-os/shared";
import type { OutletPhoto } from "@stride-os/shared";

const MAX_OUTLET_PHOTOS = 5;
const MAX_OUTLET_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_OUTLET_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getFileExtension(file: File): string {
  const mimeExtensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return mimeExtensionMap[file.type] ?? "bin";
}

function ensurePhotoFile(file: File | null | undefined): asserts file is File {
  if (!file || file.size === 0) {
    throw new Error("Please choose a photo to upload.");
  }

  if (!ALLOWED_OUTLET_PHOTO_TYPES.has(file.type)) {
    throw new Error("Upload a JPEG, PNG, or WebP image.");
  }

  if (file.size > MAX_OUTLET_PHOTO_SIZE) {
    throw new Error("Each photo must be 5 MB or smaller.");
  }
}

async function getOutletPhotosForOutlet(outletId: string): Promise<OutletPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlet_photos")
    .select("*")
    .eq("outlet_id", outletId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to load outlet photos. Please try again.");
  }

  return (data ?? []) as OutletPhoto[];
}

export async function uploadOutletPhoto(
  outletId: string,
  file: File,
  caption?: string
): Promise<{ id: string }> {
  const userId = await requirePartner();
  ensurePhotoFile(file);

  const parsed = uploadOutletPhotoSchema.safeParse({ outlet_id: outletId, caption });
  if (!parsed.success) {
    throw new Error("Invalid photo details.");
  }

  const existingPhotos = await getOutletPhotosForOutlet(parsed.data.outlet_id);
  if (existingPhotos.length >= MAX_OUTLET_PHOTOS) {
    throw new Error("Each outlet can have up to 5 photos.");
  }

  const storagePath = `${parsed.data.outlet_id}/${crypto.randomUUID()}.${getFileExtension(file)}`;
  const sortOrder =
    existingPhotos.length === 0
      ? 0
      : Math.max(...existingPhotos.map((photo) => photo.sort_order)) + 1;
  const shouldBeCover =
    existingPhotos.length === 0 || !existingPhotos.some((photo) => photo.is_cover);

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from("outlet-photos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error("Failed to upload the photo. Please try again.");
  }

  const { data, error: insertError } = await supabase
    .from("outlet_photos")
    .insert({
      outlet_id: parsed.data.outlet_id,
      storage_path: storagePath,
      caption: parsed.data.caption ?? null,
      is_cover: shouldBeCover,
      sort_order: sortOrder,
      uploaded_by: userId,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    await supabase.storage.from("outlet-photos").remove([storagePath]);
    throw new Error("Photo was uploaded, but it could not be saved. Please try again.");
  }

  revalidatePath("/outlets");
  revalidatePath(`/outlets/${parsed.data.outlet_id}`);

  return { id: data.id };
}

export async function deleteOutletPhoto(photoId: string): Promise<void> {
  await requirePartner();

  const parsed = deleteOutletPhotoSchema.safeParse({ photo_id: photoId });
  if (!parsed.success) {
    throw new Error("Invalid photo selection.");
  }

  const supabase = await createClient();
  const { data: photo, error: photoError } = await supabase
    .from("outlet_photos")
    .select("*")
    .eq("id", parsed.data.photo_id)
    .single();

  if (photoError || !photo) {
    throw new Error("Photo not found.");
  }

  const outletPhoto = photo as OutletPhoto;
  const { error: storageError } = await supabase.storage
    .from("outlet-photos")
    .remove([outletPhoto.storage_path]);

  if (storageError) {
    throw new Error("Failed to delete the stored photo. Please try again.");
  }

  const { error: deleteError } = await supabase
    .from("outlet_photos")
    .delete()
    .eq("id", outletPhoto.id);
  if (deleteError) {
    throw new Error("Failed to delete photo details. Please try again.");
  }

  const { data: remainingPhotoRows, error: remainingPhotosError } = await supabase
    .from("outlet_photos")
    .select("*")
    .eq("outlet_id", outletPhoto.outlet_id)
    .order("sort_order", { ascending: true });

  if (remainingPhotosError) {
    throw new Error("Photo was deleted, but the gallery could not be refreshed.");
  }

  const remainingPhotos = (remainingPhotoRows ?? []) as OutletPhoto[];
  if (outletPhoto.is_cover && remainingPhotos.length > 0) {
    const nextCover = remainingPhotos[0];
    if (nextCover) {
      await supabase.from("outlet_photos").update({ is_cover: true }).eq("id", nextCover.id);
    }
  }

  await Promise.all(
    remainingPhotos.map((remainingPhoto, index) =>
      supabase.from("outlet_photos").update({ sort_order: index }).eq("id", remainingPhoto.id)
    )
  );

  revalidatePath("/outlets");
  revalidatePath(`/outlets/${outletPhoto.outlet_id}`);
}

export async function setCoverPhoto(photoId: string): Promise<void> {
  await requirePartner();

  const parsed = setCoverPhotoSchema.safeParse({ photo_id: photoId });
  if (!parsed.success) {
    throw new Error("Invalid photo selection.");
  }

  const supabase = await createClient();
  const { data: photo, error: photoError } = await supabase
    .from("outlet_photos")
    .select("id, outlet_id")
    .eq("id", parsed.data.photo_id)
    .single();

  if (photoError || !photo) {
    throw new Error("Photo not found.");
  }

  const { error: unsetError } = await supabase
    .from("outlet_photos")
    .update({ is_cover: false })
    .eq("outlet_id", photo.outlet_id);

  if (unsetError) {
    throw new Error("Failed to update the existing cover photo.");
  }

  const { error: coverError } = await supabase
    .from("outlet_photos")
    .update({ is_cover: true })
    .eq("id", photo.id);

  if (coverError) {
    throw new Error("Failed to set the cover photo. Please try again.");
  }

  revalidatePath("/outlets");
  revalidatePath(`/outlets/${photo.outlet_id}`);
}

export async function reorderPhotos(outletId: string, orderedIds: string[]): Promise<void> {
  await requirePartner();

  const parsed = reorderOutletPhotosSchema.safeParse({
    outlet_id: outletId,
    ordered_ids: orderedIds,
  });
  if (!parsed.success) {
    throw new Error("Invalid photo order.");
  }

  const existingPhotos = await getOutletPhotosForOutlet(parsed.data.outlet_id);
  const existingIds = new Set(existingPhotos.map((photo) => photo.id));

  if (
    existingPhotos.length !== parsed.data.ordered_ids.length ||
    parsed.data.ordered_ids.some((photoId) => !existingIds.has(photoId))
  ) {
    throw new Error("The photo order is out of date. Refresh and try again.");
  }

  const supabase = await createClient();
  const updates = parsed.data.ordered_ids.map((photoId, index) =>
    supabase.from("outlet_photos").update({ sort_order: index }).eq("id", photoId)
  );
  const updateResults = await Promise.all(updates);

  if (updateResults.some((result) => result.error)) {
    throw new Error("Failed to reorder photos. Please try again.");
  }

  revalidatePath("/outlets");
  revalidatePath(`/outlets/${parsed.data.outlet_id}`);
}
