import { createClient } from "@/lib/supabase/server";
import type { OutletPhoto } from "@stride-os/shared";

export type OutletPhotoWithUrl = OutletPhoto & {
  signed_url: string | null;
};

export async function getSignedOutletPhotoUrls(
  photos: OutletPhoto[]
): Promise<OutletPhotoWithUrl[]> {
  if (photos.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const signedPhotoEntries = await Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from("outlet-photos")
        .createSignedUrl(photo.storage_path, 60 * 60);

      return {
        ...photo,
        signed_url: error ? null : data.signedUrl,
      };
    })
  );

  return signedPhotoEntries;
}
