"use client";

import type { ReactNode } from "react";
import { CategoryPanel } from "@/components/CategoryPanel";
import { DataTable, type DataTableProps } from "@/components/DataTable";
import type { CategoryTableDefinition } from "@/config/categoryTableDefinitions";

interface CategoryTableViewProps extends Omit<DataTableProps, "columns"> {
  definition: CategoryTableDefinition;
  summary?: ReactNode;
}

/**
 * The standard full-page category surface. Category pages should compose this
 * component and supply only behavior that is unique to their data source.
 */
export function CategoryTableView({
  definition,
  data,
  summary,
  tableId = definition.id,
  enableSearch = true,
  enableExport = true,
  ...tableProps
}: CategoryTableViewProps) {
  return (
    <CategoryPanel
      description={definition.description}
      itemCount={data.length}
      itemLabel={definition.itemLabel}
      summary={summary}
    >
      <DataTable
        {...tableProps}
        data={data}
        columns={definition.columns}
        tableId={tableId}
        enableSearch={enableSearch}
        enableExport={enableExport}
      />
    </CategoryPanel>
  );
}
