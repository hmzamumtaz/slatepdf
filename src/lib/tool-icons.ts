import {
  Archive,
  ArrowUpDown,
  BookOpen,
  Camera,
  Combine,
  Crop,
  Droplets,
  Eraser,
  FileCode,
  FileImage,
  FileOutput,
  FileText,
  FileType,
  GitCompare,
  Globe,
  Grid3x3,
  Hash,
  Image,
  Languages,
  Layers,
  LayoutGrid,
  Lock,
  Minimize2,
  PenTool,
  Presentation,
  RotateCw,
  ScanText,
  Scissors,
  Smartphone,
  Sparkles,
  Table,
  TextCursorInput,
  Trash2,
  Unlock,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { createElement, type ComponentProps } from 'react';

/**
 * The icons named in tools-data.ts. Importing them by name (instead of
 * `import * as LucideIcons`) keeps the other ~1,600 lucide icons out of the
 * bundle that ships with every page. Add an entry here when a tool uses a new icon.
 */
const TOOL_ICONS: Record<string, LucideIcon> = {
  Archive,
  ArrowUpDown,
  BookOpen,
  Camera,
  Combine,
  Crop,
  Droplets,
  Eraser,
  FileCode,
  FileImage,
  FileOutput,
  FileText,
  FileType,
  GitCompare,
  Globe,
  Grid3x3,
  Hash,
  Image,
  Languages,
  Layers,
  LayoutGrid,
  Lock,
  Minimize2,
  PenTool,
  Presentation,
  RotateCw,
  ScanText,
  Scissors,
  Smartphone,
  Sparkles,
  Table,
  TextCursorInput,
  Trash2,
  Unlock,
  Wrench,
  Zap,
};

export function toolIcon(name: string): LucideIcon {
  return TOOL_ICONS[name] ?? FileText;
}

/** Renders a tool's icon by name, for places that render it as a JSX element. */
export function ToolIcon({ name, ...props }: { name: string } & ComponentProps<LucideIcon>) {
  return createElement(toolIcon(name), props);
}
