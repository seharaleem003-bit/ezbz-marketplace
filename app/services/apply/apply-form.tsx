"use client";

import { useActionState } from "react";

import { applyForProviderAction, type ProviderApplyState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProviderApplyForm({
  categories,
}: {
  categories: { id: string; name: string; group: string }[];
}) {
  const [state, action, pending] = useActionState<ProviderApplyState, FormData>(
    applyForProviderAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  const groups = new Map<string, { id: string; name: string }[]>();
  for (const category of categories) {
    const list = groups.get(category.group) ?? [];
    list.push(category);
    groups.set(category.group, list);
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required />
        {errors.businessName ? (
          <p className="text-sm text-destructive">{errors.businessName[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Category</Label>
        <Select
          name="categoryId"
          items={categories.map((category) => ({ value: category.id, label: category.name }))}
        >
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(groups.entries()).map(([group, list]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {list.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId ? (
          <p className="text-sm text-destructive">{errors.categoryId[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Tell buyers about your business</Label>
        <Textarea id="description" name="description" rows={4} required />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="region">State</Label>
          <Input id="region" name="region" />
        </div>
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Submitting…" : "Apply"}
      </Button>
    </form>
  );
}
