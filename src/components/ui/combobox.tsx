
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Option = {
  value: string;
  label: string;
};

type ComboboxProps = {
    options: Option[];
    value: string;
    onValueChange: (value: string) => void;
    onCreate?: (value: string) => Promise<{value: string, label: string} | null>;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
};

export function Combobox({ options, value, onValueChange, onCreate, placeholder, searchPlaceholder, className }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("");

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateOption = onCreate && inputValue && !options.some(option => option.label.toLowerCase() === inputValue.toLowerCase());

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setInputValue("");
    setOpen(false);
  };
  
  const handleCreate = async () => {
    if (!onCreate || !inputValue) return;
    const newItem = await onCreate(inputValue);
    if(newItem) {
        onValueChange(newItem.value);
    }
    setInputValue("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder || "Select option..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder || "Search..."}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {showCreateOption ? ' ' : 'No results found.'}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
               {showCreateOption && (
                <CommandItem
                  onSelect={handleCreate}
                  className="text-primary"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Créer "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
