"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Organization } from "@/types/organization";
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
import { MoreHorizontal, Eye, Settings, Users, CreditCard, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import { isDummyOrganization } from "@/lib/organization-utils";

export const organizationsColumns: ColumnDef<Organization, unknown>[] = [
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
    size: 50,
    minSize: 50,
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 200,
    minSize: 100,
    cell: ({ row }) => {
      const org = row.original;
      return (
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-lg mr-3">
            <div className="bg-primary w-5 h-5 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {org.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {org.name}
              {isDummyOrganization(org) && (
                <Badge variant="secondary" className="text-xs">
                  Setup Required
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    size: 250,
    minSize: 150,
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return (
        <div className="max-w-xs">
          <span className="text-muted-foreground truncate">
            {description || 'No description provided'}
          </span>
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      );
    },
    accessorFn: (row) => row.is_active ? "Active" : "Inactive",
    filterFn: (row, id, value) => {
      const isActive = row.original.is_active;
      const status = isActive ? "Active" : "Inactive";
      if (!Array.isArray(value)) {
        return true; // If no filter is applied, show all rows
      }
      return value.includes(status);
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
    size: 150,
    minSize: 100,
    cell: ({ row }) => {
      const slug = row.getValue("slug") as string;
      return (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {slug}
        </code>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    size: 150,
    minSize: 100,
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at") as string);
      return (
        <div className="flex items-center text-muted-foreground">
          {date.toLocaleDateString()}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const org = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/organization?org_id=${org.id}`} className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                <span>View</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/organization/members?org_id=${org.id}`} className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                <span>Members</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/organization/billing?org_id=${org.id}`} className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/organization/settings?org_id=${org.id}`} className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/organization/edit?org_id=${org.id}`} className="flex items-center">
                <Edit3 className="h-4 w-4 mr-2" />
                <span>Edit</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/organization/delete?org_id=${org.id}`} className="flex items-center text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                <span>Delete</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
