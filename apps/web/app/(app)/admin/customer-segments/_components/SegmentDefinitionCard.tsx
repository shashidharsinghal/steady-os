"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CUSTOMER_SEGMENT_COLOR_OPTIONS,
  customerSegmentDefinitionSchema,
  CUSTOMER_SEGMENT_RULE_TYPES,
  type CustomerSegmentDefinition,
  type CustomerSegmentDefinitionInput,
} from "@stride-os/shared";
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
} from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { previewSegmentMatchCount, updateSegmentDefinition } from "../actions";

const RULE_LABELS: Record<(typeof CUSTOMER_SEGMENT_RULE_TYPES)[number], string> = {
  first_seen_within_days: "First seen within days",
  order_count_in_window: "Order count in window",
  lapsed_from_segment: "Lapsed from segment",
  returning_at_least_n: "Returning at least N",
};

const COLOR_PREVIEW: Record<(typeof CUSTOMER_SEGMENT_COLOR_OPTIONS)[number], string> = {
  accent: "bg-[hsl(var(--accent))]",
  blue: "bg-[hsl(var(--blue))]",
  green: "bg-[hsl(var(--green))]",
  red: "bg-[hsl(var(--red))]",
  violet: "bg-[hsl(var(--violet))]",
  amber: "bg-[hsl(var(--amber))]",
};

export function SegmentDefinitionCard({
  outletId,
  definition,
  initialPreviewCount,
}: {
  outletId: string;
  definition: CustomerSegmentDefinition;
  initialPreviewCount: number;
}) {
  const router = useRouter();
  const [previewCount, setPreviewCount] = useState(initialPreviewCount);
  const [isPending, startTransition] = useTransition();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const form = useForm<CustomerSegmentDefinitionInput>({
    resolver: zodResolver(customerSegmentDefinitionSchema),
    defaultValues: {
      id: definition.id,
      outlet_id: definition.outlet_id,
      slot: definition.slot,
      name: definition.name,
      color_token: definition.color_token,
      rule_type: definition.rule_type,
      rule_params: definition.rule_params as Record<string, number>,
      display_order: definition.display_order,
    },
  });

  const values = form.watch();
  const previewRuleParams = JSON.stringify(values.rule_params);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const valid = await form.trigger();
      if (!valid) return;
      setIsPreviewing(true);
      try {
        const count = await previewSegmentMatchCount(outletId, form.getValues());
        setPreviewCount(count);
      } catch {
        // keep previous preview count if the in-flight definition is invalid
      } finally {
        setIsPreviewing(false);
      }
    }, 350);

    return () => window.clearTimeout(handle);
  }, [form, outletId, values.color_token, values.name, values.rule_type, previewRuleParams]);

  function onSubmit(input: CustomerSegmentDefinitionInput) {
    startTransition(async () => {
      try {
        await updateSegmentDefinition(definition.id, input);
        toast.success("Segment updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update segment.");
      }
    });
  }

  return (
    <div className="border-border bg-card shadow-card rounded-[24px] border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-card-title">Slot {definition.slot}</p>
          <p className="mt-1 text-base font-semibold">{definition.name}</p>
        </div>
        <div className="bg-paper-subtle text-muted-foreground inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
          <span className={cn("h-2.5 w-2.5 rounded-full", COLOR_PREVIEW[values.color_token])} />
          {isPreviewing ? "Refreshing..." : `${previewCount} customers`}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="color_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_SEGMENT_COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
              name="rule_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rule type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_SEGMENT_RULE_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {RULE_LABELS[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <RuleFields form={form} />

          <div className="border-border bg-background/65 text-muted-foreground rounded-[18px] border p-4 text-sm">
            Live preview: <span className="text-foreground font-semibold">{previewCount}</span>{" "}
            customers currently match this rule.
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Saving..." : "Save segment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function RuleFields({
  form,
}: {
  form: ReturnType<typeof useForm<CustomerSegmentDefinitionInput>>;
}) {
  const ruleType = form.watch("rule_type");

  if (ruleType === "first_seen_within_days") {
    return <NumericField form={form} name="rule_params.days" label="Days" />;
  }

  if (ruleType === "order_count_in_window") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <NumericField form={form} name="rule_params.min_orders" label="Minimum orders" />
        <NumericField form={form} name="rule_params.window_days" label="Window days" />
      </div>
    );
  }

  if (ruleType === "lapsed_from_segment") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <NumericField form={form} name="rule_params.previously_in_slot" label="Previous slot" />
        <NumericField form={form} name="rule_params.silent_for_days" label="Silent for days" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NumericField form={form} name="rule_params.min_orders" label="Minimum orders" />
      <NumericField
        form={form}
        name="rule_params.last_seen_within_days"
        label="Last seen within days"
      />
    </div>
  );
}

function NumericField({
  form,
  name,
  label,
}: {
  form: ReturnType<typeof useForm<CustomerSegmentDefinitionInput>>;
  name:
    | "rule_params.days"
    | "rule_params.min_orders"
    | "rule_params.window_days"
    | "rule_params.previously_in_slot"
    | "rule_params.silent_for_days"
    | "rule_params.last_seen_within_days";
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min="1"
              value={field.value ?? ""}
              onChange={(event) => field.onChange(Number(event.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
