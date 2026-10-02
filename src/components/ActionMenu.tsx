"use client";

import type { ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'warning' | 'danger';
  onSelect: () => void | Promise<void>;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

export function ActionMenu({ items, label = 'Options' }: ActionMenuProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          title={label}
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVertical size={16} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="z-[100] min-w-44 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={() => void item.onSelect()}
              className={`flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-xs outline-none ${
                item.tone === 'danger'
                  ? 'text-red-700 focus:bg-red-50 dark:text-red-300 dark:focus:bg-red-900/30'
                  : item.tone === 'warning'
                    ? 'text-amber-700 focus:bg-amber-50 dark:text-amber-300 dark:focus:bg-amber-900/30'
                    : 'text-gray-700 focus:bg-gray-100 dark:text-gray-200 dark:focus:bg-gray-700'
              }`}
            >
              {item.icon}
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
