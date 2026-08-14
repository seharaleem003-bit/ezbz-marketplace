"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Bell,
  Gift,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Shield,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
  isAdmin,
}: {
  name?: string | null;
  email?: string | null;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <UserIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <div className="max-w-48 truncate px-1.5 py-1 text-xs font-medium text-muted-foreground">
          {name || email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account/orders" />}>
          <Package />
          My orders
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/messages" />}>
          <MessageCircle />
          Messages
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/referrals" />}>
          <Gift />
          Referrals & credit
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/watches" />}>
          <Bell />
          My watches
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/addresses" />}>
          <MapPin />
          My addresses
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield />
            Admin panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ redirectTo: "/" })}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
