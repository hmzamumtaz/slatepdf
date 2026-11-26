import type { ComponentType } from 'react';
import AddPageNumbersTool from './AddPageNumbersTool';
import AddWatermarkTool from './AddWatermarkTool';
import AiSummarizerTool from './AiSummarizerTool';
import AlternateMixTool from './AlternateMixTool';
import BatesNumberingTool from './BatesNumberingTool';
import ComparePdfTool from './ComparePdfTool';
import CompressPdfTool from './CompressPdfTool';
import CropPdfTool from './CropPdfTool';
import EditPdfTool from './EditPdfTool';
import EditMetadataTool from './EditMetadataTool';
import EpubToPdfTool from './EpubToPdfTool';
import ExcelToPdfTool from './ExcelToPdfTool';
import ExtractPagesTool from './ExtractPagesTool';
import ExtractImagesTool from './ExtractImagesTool';
import FillPdfFormTool from './FillPdfFormTool';
import FlattenPdfTool from './FlattenPdfTool';
import HeicToPdfTool from './HeicToPdfTool';
import HtmlToPdfTool from './HtmlToPdfTool';
import HeaderFooterTool from './HeaderFooterTool';
import JpgToPdfTool from './JpgToPdfTool';
import MergePdfTool from './MergePdfTool';
import OcrPdfTool from './OcrPdfTool';
import OptimizePdfTool from './OptimizePdfTool';
import OrganizePdfTool from './OrganizePdfTool';
import PdfToExcelTool from './PdfToExcelTool';
import PdfToJpgTool from './PdfToJpgTool';
import PdfToHtmlTool from './PdfToHtmlTool';
import PdfToMarkdownTool from './PdfToMarkdownTool';
import PdfToPdfATool from './PdfToPdfATool';
import PdfToPowerPointTool from './PdfToPowerPointTool';
import PdfToWordTool from './PdfToWordTool';
import PdfToTextTool from './PdfToTextTool';
import PdfWorkspaceTool from './PdfWorkspaceTool';
import PowerPointToPdfTool from './PowerPointToPdfTool';
import ProtectPdfTool from './ProtectPdfTool';
import RedactPdfTool from './RedactPdfTool';
import RemovePagesTool from './RemovePagesTool';
import RepairPdfTool from './RepairPdfTool';
import RotatePdfTool from './RotatePdfTool';
import ScanPdfTool from './ScanPdfTool';
import SignPdfTool from './SignPdfTool';
import SplitPdfTool from './SplitPdfTool';
import SvgToPdfTool from './SvgToPdfTool';
import TiffToPdfTool from './TiffToPdfTool';
import TextToPdfTool from './TextToPdfTool';
import TranslatePdfTool from './TranslatePdfTool';
import UnlockPdfTool from './UnlockPdfTool';
import WebpToPdfTool from './WebpToPdfTool';
import WordToPdfTool from './WordToPdfTool';

/** Every tool's interface by slug, for pages that render a tool from a URL parameter. */
export const toolComponents: Record<string, ComponentType> = {
  'add-page-numbers': AddPageNumbersTool,
  'add-watermark': AddWatermarkTool,
  'ai-summarizer': AiSummarizerTool,
  'alternate-mix': AlternateMixTool,
  'bates-numbering': BatesNumberingTool,
  'compare-pdf': ComparePdfTool,
  'compress-pdf': CompressPdfTool,
  'crop-pdf': CropPdfTool,
  'edit-pdf': EditPdfTool,
  'edit-metadata': EditMetadataTool,
  'epub-to-pdf': EpubToPdfTool,
  'excel-to-pdf': ExcelToPdfTool,
  'extract-pages': ExtractPagesTool,
  'extract-images': ExtractImagesTool,
  'fill-pdf-form': FillPdfFormTool,
  'flatten-pdf': FlattenPdfTool,
  'heic-to-pdf': HeicToPdfTool,
  'header-footer': HeaderFooterTool,
  'html-to-pdf': HtmlToPdfTool,
  'jpg-to-pdf': JpgToPdfTool,
  'merge-pdf': MergePdfTool,
  'ocr-pdf': OcrPdfTool,
  'optimize-pdf': OptimizePdfTool,
  'organize-pdf': OrganizePdfTool,
  'pdf-to-excel': PdfToExcelTool,
  'pdf-to-jpg': PdfToJpgTool,
  'pdf-to-html': PdfToHtmlTool,
  'pdf-to-markdown': PdfToMarkdownTool,
  'pdf-to-pdfa': PdfToPdfATool,
  'pdf-to-powerpoint': PdfToPowerPointTool,
  'pdf-to-text': PdfToTextTool,
  'pdf-to-word': PdfToWordTool,
  'pdf-workspace': PdfWorkspaceTool,
  'powerpoint-to-pdf': PowerPointToPdfTool,
  'protect-pdf': ProtectPdfTool,
  'redact-pdf': RedactPdfTool,
  'remove-pages': RemovePagesTool,
  'repair-pdf': RepairPdfTool,
  'rotate-pdf': RotatePdfTool,
  'scan-pdf': ScanPdfTool,
  'sign-pdf': SignPdfTool,
  'split-pdf': SplitPdfTool,
  'svg-to-pdf': SvgToPdfTool,
  'text-to-pdf': TextToPdfTool,
  'tiff-to-pdf': TiffToPdfTool,
  'translate-pdf': TranslatePdfTool,
  'unlock-pdf': UnlockPdfTool,
  'webp-to-pdf': WebpToPdfTool,
  'word-to-pdf': WordToPdfTool,
};
