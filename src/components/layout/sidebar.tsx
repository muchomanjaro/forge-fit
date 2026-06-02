"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  Moon,
  TrendingUp,
  Trophy,
  Settings,
  Flame,
  X,
  Search,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

const quickNavItems = [
  { href: "/dashboard", label: "Go to Dashboard" },
  { href: "/workouts", label: "View Workouts" },
  { href: "/workouts/new", label: "Log a Workout" },
  { href: "/nutrition", label: "Log Nutrition" },
  { href: "/sleep", label: "Log Sleep" },
  { href: "/progress", label: "View Progress" },
  { href: "/achievements", label: "View Achievements" },
  { href: "/settings", label: "Settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5">
            <Link href="/dashboard" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                <Flame className="h-5 w-5 text-zinc-950" />
              </div>
              <span className="text-lg font-bold text-white">Forge Fit</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden focus-visible:ring-amber-500"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="mx-4" />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                    isActive
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="px-4 py-4">
            <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-zinc-900 p-3">
              <p className="text-xs text-zinc-400">
                Forge your best self
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                Every workout counts
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
