import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Skeleton } from './skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Column to search (default: searches all) */
  searchColumn?: string;
  /** Show column visibility toggle */
  showColumnToggle?: boolean;
  /** Show pagination */
  showPagination?: boolean;
  /** Rows per page options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom className for table container */
  className?: string;
  /** Callback when row is clicked */
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  searchColumn,
  showColumnToggle = false,
  showPagination = true,
  pageSizeOptions = [10, 20, 30, 50],
  defaultPageSize = 10,
  isLoading = false,
  emptyMessage = 'No results found.',
  className,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: defaultPageSize,
      },
    },
  });

  // Handle search input
  const handleSearch = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const searchValue = searchColumn 
    ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''
    : globalFilter;

  return (
    <div className={cn('rdcfe-space-y-4', className)}>
      {/* Toolbar */}
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-4">
        {/* Search */}
        <div className="rdcfe-relative rdcfe-flex-1 rdcfe-max-w-sm">
          <Search className="rdcfe-absolute rdcfe-left-3 rdcfe-top-1/2 rdcfe-h-4 rdcfe-w-4 rdcfe--translate-y-1/2 rdcfe-text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="rdcfe-pl-9"
          />
        </div>

        {/* Column Toggle */}
        {showColumnToggle && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns
                <ChevronDown className="rdcfe-ml-2 rdcfe-h-4 rdcfe-w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="rdcfe-capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-overflow-hidden">
        <table className="rdcfe-w-full rdcfe-border-collapse">
          <thead className="rdcfe-bg-[hsl(var(--rdcfe-secondary))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="rdcfe-px-4 rdcfe-py-3 rdcfe-text-left rdcfe-text-xs rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="rdcfe-bg-white rdcfe-divide-y rdcfe-divide-[hsl(var(--rdcfe-border))]">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="rdcfe-px-4 rdcfe-py-3">
                      <Skeleton className="rdcfe-h-5 rdcfe-w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'rdcfe-transition-colors hover:rdcfe-bg-[hsl(var(--rdcfe-secondary))]/50',
                    onRowClick && 'rdcfe-cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="rdcfe-px-4 rdcfe-py-3 rdcfe-text-sm rdcfe-text-[hsl(var(--rdcfe-foreground))]"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length}
                  className="rdcfe-px-4 rdcfe-py-12 rdcfe-text-center rdcfe-text-sm rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && data.length > 0 && (
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-2">
          <div className="rdcfe-text-sm rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            )}{' '}
            of {data.length} results
          </div>

          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
            {/* Page size selector */}
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rdcfe-h-8 rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-2 rdcfe-text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>

            {/* Page navigation */}
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1">
              <Button
                variant="outline"
                size="icon"
                className="rdcfe-h-8 rdcfe-w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="rdcfe-h-4 rdcfe-w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rdcfe-h-8 rdcfe-w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="rdcfe-h-4 rdcfe-w-4" />
              </Button>
              <span className="rdcfe-px-2 rdcfe-text-sm">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="rdcfe-h-8 rdcfe-w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="rdcfe-h-4 rdcfe-w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rdcfe-h-8 rdcfe-w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="rdcfe-h-4 rdcfe-w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to create sortable column header
 */
export function createSortableHeader(
  column: any,
  label: string
) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="rdcfe--ml-3 rdcfe-h-8 data-[state=open]:rdcfe-bg-accent"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      {column.getIsSorted() === 'asc' ? (
        <ChevronDown className="rdcfe-ml-2 rdcfe-h-4 rdcfe-w-4 rdcfe-rotate-180" />
      ) : column.getIsSorted() === 'desc' ? (
        <ChevronDown className="rdcfe-ml-2 rdcfe-h-4 rdcfe-w-4" />
      ) : (
        <ChevronDown className="rdcfe-ml-2 rdcfe-h-4 rdcfe-w-4 rdcfe-opacity-0" />
      )}
    </Button>
  );
}

export default DataTable;

