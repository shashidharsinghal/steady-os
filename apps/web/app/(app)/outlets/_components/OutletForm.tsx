"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@stride-os/ui";
import { outletFormSchema, type OutletFormValues, type Outlet } from "@stride-os/shared";
import { createOutlet, updateOutlet } from "../actions";

const BRANDS = ["Gabru Di Chaap", "Wafflesome", "Other"] as const;
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "setup", label: "Setup" },
  { value: "closed", label: "Closed" },
] as const;

type Props = { mode: "create" } | { mode: "edit"; outlet: Outlet };

export function OutletForm(props: Props) {
  const router = useRouter();
  const defaultValues: OutletFormValues =
    props.mode === "edit"
      ? {
          name: props.outlet.name,
          brand: props.outlet.brand,
          status: props.outlet.status,
          address: props.outlet.address ?? "",
          phone: props.outlet.phone ?? "",
          petpooja_restaurant_id: props.outlet.petpooja_restaurant_id ?? "",
          gst_number: props.outlet.gst_number ?? "",
          fssai_license: props.outlet.fssai_license ?? "",
          opened_at: props.outlet.opened_at ?? "",
        }
      : {
          name: "",
          brand: "Gabru Di Chaap",
          status: "setup",
          address: "",
          phone: "",
          petpooja_restaurant_id: "",
          gst_number: "",
          fssai_license: "",
          opened_at: "",
        };

  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues,
  });

  async function onSubmit(values: OutletFormValues) {
    try {
      if (props.mode === "create") {
        const { id } = await createOutlet(values);
        toast.success("Outlet created.");
        router.push(`/outlets/${id}`);
      } else {
        await updateOutlet(props.outlet.id, values);
        toast.success("Outlet updated.");
        router.push(`/outlets/${props.outlet.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Gabru Di Chaap - Elan Miracle Mall" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Store address" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+91 98765 43210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="opened_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opened on</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="petpooja_restaurant_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Petpooja Restaurant ID</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gst_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GST Number</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fssai_license"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FSSAI License</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? props.mode === "create"
                ? "Creating…"
                : "Saving…"
              : props.mode === "create"
                ? "Create outlet"
                : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
