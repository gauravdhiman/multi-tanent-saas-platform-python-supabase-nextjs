"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Member } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCheck, UserX, MoreHorizontal, User, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";

export const organizationMembersColumns: ColumnDef<Member, unknown>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false, // Disable resizing for the select column
  },
  {
    id: "member",
    header: "Member",
    size: 250,
    minSize: 150,
    cell: ({ row }) => {
      const member = row.original;
      return (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-foreground">
              {member.first_name} {member.last_name}
            </div>
            <div className="text-sm text-muted-foreground flex items-center mt-1">
              <Mail className="h-3 w-3 mr-1" />
              {member.email}
            </div>
          </div>
        </div>
      );
    },
    accessorFn: (row) => `${row.first_name} ${row.last_name} ${row.email}`,
    filterFn: (row, id, value) => {
      const fullName = `${row.original.first_name} ${row.original.last_name}`.toLowerCase();
      const email = row.original.email.toLowerCase();
      return fullName.includes(value.toLowerCase()) || email.includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "roles",
    header: "Role",
    size: 150,
    minSize: 100,
    cell: ({ row }) => {
      const roles = row.getValue("roles") as Array<{id: string, name: string, description: string}>;
      return (
        <div className="space-y-1">
          {roles.map((role) => (
            <Badge key={role.id} variant="outline" className="text-xs">
              {role.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    size: 120,
    minSize: 80,
    cell: ({ row }) => {
      const member = row.original;
      return (
        <div className="flex items-center space-x-1">
          {member.is_verified ? (
            <>
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm">Active</span>
            </>
          ) : (
            <>
              <UserX className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm">Pending</span>
            </>
          )}
        </div>
      );
    },
    accessorFn: (row) => row.is_verified ? "Active" : "Pending",
    filterFn: (row, id, value) => {
      const member = row.original;
      const status = member.is_verified ? "Active" : "Pending";
      if (!Array.isArray(value)) {
        return true; // If no filter is applied, show all rows
      }
      return value.includes(status);
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    size: 150,
    minSize: 100,
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at") as string);
      return (
        <div className="flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4 mr-1" />
          {format(date, 'MMM dd, yyyy')}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const member = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>Edit Roles</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center text-red-600">
              <UserX className="h-4 w-4 mr-2" />
              <span>Remove Member</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
