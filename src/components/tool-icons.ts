import {
  Archive, ArrowUpDown, BookOpen, Camera, Combine, Crop, Droplets, Eraser, FileCode, FileImage, FileOutput, FileText, FileType, GitCompare, Globe, Grid3x3, Hash, Image, Languages, Layers, LayoutGrid, Lock, Minimize2, PenTool, Presentation, RotateCw, ScanText, Scissors, Smartphone, Sparkles, Table, TextCursorInput, Trash2, Unlock, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * The icons tools use, by the name stored in tools-data. Importing named
 * icons (instead of `import * as LucideIcons`) keeps the whole icon set,
 * ~190 KB gzipped, out of every page's JavaScript.
 */
const icons: Record<string, LucideIcon> = {
  Archive, ArrowUpDown, BookOpen, Camera, Combine, Crop, Droplets, Eraser, FileCode, FileImage, FileOutput, FileText, FileType, GitCompare, Globe, Grid3x3, Hash, Image, Languages, Layers, LayoutGrid, Lock, Minimize2, PenTool, Presentation, RotateCw, ScanText, Scissors, Smartphone, Sparkles, Table, TextCursorInput, Trash2, Unlock, Wrench, Zap,
};

/** Icon for a tool; unknown names fall back to a document icon. */
export function toolIcon(name: string): LucideIcon {
  return icons[name] ?? FileText;
}
