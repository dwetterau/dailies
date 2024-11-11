"use client";

import * as React from "react";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const SelectMenu = ({
  choices,
  currentChoice,
  buttonText,
  onSelect,
}: {
  choices: Array<string>;
  currentChoice?: string;
  buttonText: string;
  onSelect: (choice: string) => void;
}) => {
  return (
    <Select.Root value={currentChoice} onValueChange={onSelect}>
      <Select.Trigger className="bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded">
        <Select.Value placeholder={buttonText} />
        <Select.Icon className="pl-1">
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={cn(
            "overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          )}
        >
          <Select.Viewport>
            <Select.Group>
              {choices.map((choice) => (
                <Select.Item
                  key={choice}
                  value={choice}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                  )}
                >
                  <Select.ItemText>{choice}</Select.ItemText>
                  <Select.ItemIndicator>
                    <CheckIcon className="pl-1" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
