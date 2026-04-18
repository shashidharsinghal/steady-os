import { z } from "zod";

export const outletPhotoCaptionSchema = z
  .string()
  .trim()
  .max(120, "Caption must be 120 characters or fewer")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const uploadOutletPhotoSchema = z.object({
  outlet_id: z.string().uuid(),
  caption: outletPhotoCaptionSchema,
});

export const deleteOutletPhotoSchema = z.object({
  photo_id: z.string().uuid(),
});

export const setCoverPhotoSchema = z.object({
  photo_id: z.string().uuid(),
});

export const reorderOutletPhotosSchema = z.object({
  outlet_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1, "Photo order is required"),
});

export type UploadOutletPhotoInput = z.infer<typeof uploadOutletPhotoSchema>;
export type DeleteOutletPhotoInput = z.infer<typeof deleteOutletPhotoSchema>;
export type SetCoverPhotoInput = z.infer<typeof setCoverPhotoSchema>;
export type ReorderOutletPhotosInput = z.infer<typeof reorderOutletPhotosSchema>;
