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
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type Employee,
  type UpdateEmployeeInput,
} from "@stride-os/shared";
import { createEmployee, updateEmployee } from "../actions";
import { PositionSelect } from "./PositionSelect";

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "cleaner", label: "Cleaner" },
] as const;

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
] as const;

type OutletOption = {
  id: string;
  name: string;
};

type ManagerOption = {
  id: string;
  full_name: string;
};

type CreateProps = {
  mode: "create";
  outlets: OutletOption[];
  managers: ManagerOption[];
};

type EditProps = {
  mode: "edit";
  employee: Employee;
  outlets: OutletOption[];
  managers: ManagerOption[];
};

type Props = CreateProps | EditProps;

export function EmployeeForm(props: Props) {
  const router = useRouter();
  const defaultValues: CreateEmployeeInput | UpdateEmployeeInput =
    props.mode === "edit"
      ? {
          full_name: props.employee.full_name,
          phone: props.employee.phone,
          email: props.employee.email ?? "",
          address: props.employee.address ?? "",
          date_of_birth: props.employee.date_of_birth ?? "",
          joined_on: props.employee.joined_on,
          left_on: props.employee.left_on ?? "",
          role: props.employee.role,
          position: props.employee.position ?? "",
          employment_type: props.employee.employment_type,
          reports_to: props.employee.reports_to ?? "",
          current_outlet_id: props.employee.current_outlet_id ?? "",
          emergency_contact_name: props.employee.emergency_contact_name ?? "",
          emergency_contact_phone: props.employee.emergency_contact_phone ?? "",
          aadhaar_last_4: props.employee.aadhaar_last_4 ?? "",
        }
      : {
          full_name: "",
          phone: "",
          email: "",
          address: "",
          date_of_birth: "",
          joined_on: "",
          left_on: "",
          role: "staff",
          position: "",
          employment_type: "full_time",
          reports_to: "",
          current_outlet_id: "",
          emergency_contact_name: "",
          emergency_contact_phone: "",
          aadhaar_last_4: "",
          monthly_salary: 0,
        };

  const form = useForm<CreateEmployeeInput | UpdateEmployeeInput>({
    resolver: zodResolver(props.mode === "create" ? createEmployeeSchema : updateEmployeeSchema),
    defaultValues,
  });

  async function onSubmit(values: CreateEmployeeInput | UpdateEmployeeInput) {
    try {
      if (props.mode === "create") {
        const { id } = await createEmployee(values as CreateEmployeeInput);
        toast.success("Employee created.");
        router.push(`/employees/${id}`);
      } else {
        await updateEmployee(props.employee.id, values as UpdateEmployeeInput);
        toast.success("Employee updated.");
        router.push(`/employees/${props.employee.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Aman Singh" {...field} />
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
                  <Input placeholder="9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="employment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="position"
            render={({ field }) => (
              <PositionSelect value={field.value ?? ""} onChange={field.onChange} />
            )}
          />

          <FormField
            control={form.control}
            name="current_outlet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary outlet</FormLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outlet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {props.outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
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
            name="reports_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reports to</FormLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No manager selected</SelectItem>
                    {props.managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name}
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
            name="joined_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joined on</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergency_contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency contact name</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergency_contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency contact phone</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="aadhaar_last_4"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aadhaar last 4</FormLabel>
                <FormControl>
                  <Input placeholder="1234" maxLength={4} {...field} />
                </FormControl>
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
                  <Textarea placeholder="Optional" rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {props.mode === "create" && (
            <FormField
              control={form.control}
              name="monthly_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly salary</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="25000"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? props.mode === "create"
                ? "Creating…"
                : "Saving…"
              : props.mode === "create"
                ? "Create employee"
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
