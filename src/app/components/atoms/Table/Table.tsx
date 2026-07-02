/**
 * MUI-backed table primitives. Pages import the table parts from here instead
 * of `@mui/material` directly, so MUI stays behind the in-house component layer
 * (single source — if we ever restyle/theme tables, it happens in one place).
 *
 * Usage:
 *   import { Table, TableHead, TableBody, TableRow, TableCell } from ".../atoms/Table/Table";
 */
export { default as Table } from "@mui/material/Table";
export { default as TableHead } from "@mui/material/TableHead";
export { default as TableBody } from "@mui/material/TableBody";
export { default as TableRow } from "@mui/material/TableRow";
export { default as TableCell } from "@mui/material/TableCell";
export { default as TableContainer } from "@mui/material/TableContainer";
