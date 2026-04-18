"use client";

import {
  FormControl,
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
import { EMPLOYEE_POSITIONS } from "@stride-os/shared";

export function PositionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const isPreset = EMPLOYEE_POSITIONS.includes(value as (typeof EMPLOYEE_POSITIONS)[number]);
  const selectValue = value ? (isPreset ? value : "Other") : "";

  return (
    <FormItem>
      <FormLabel>Position</FormLabel>
      <Select
        value={selectValue}
        onValueChange={(nextValue) => {
          if (nextValue === "Other") {
            onChange("");
            return;
          }

          onChange(nextValue);
        }}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {EMPLOYEE_POSITIONS.map((position) => (
            <SelectItem key={position} value={position}>
              {position}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isPreset && (
        <div className="mt-3">
          <Input
            placeholder="Specify position"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}
