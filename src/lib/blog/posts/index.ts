import type { BlogPost } from '../types';
import { mergingPosts } from './merging';
import { organizingPosts } from './organizing';
import { convertingToPdfPosts } from './converting-to-pdf';
import { convertingToPdfPosts2 } from './converting-to-pdf-2';
import { convertingFromPdfPosts } from './converting-from-pdf';
import { convertingFromPdfPosts2 } from './converting-from-pdf-2';
import { compressingPosts } from './compressing';
import { compressingPosts2 } from './compressing-2';
import { securityPosts } from './security';
import { securityPosts2 } from './security-2';
import { editingPosts } from './editing';
import { editingPosts2 } from './editing-2';
import { troubleshootingPosts } from './troubleshooting';
import { troubleshootingPosts2 } from './troubleshooting-2';
import { troubleshootingPosts3 } from './troubleshooting-3';
import { troubleshootingPosts4 } from './troubleshooting-4';
import { newPosts } from './new-posts';

export const allPosts: BlogPost[] = [
  ...newPosts,
  ...mergingPosts,
  ...organizingPosts,
  ...convertingToPdfPosts,
  ...convertingToPdfPosts2,
  ...convertingFromPdfPosts,
  ...convertingFromPdfPosts2,
  ...compressingPosts,
  ...compressingPosts2,
  ...securityPosts,
  ...securityPosts2,
  ...editingPosts,
  ...editingPosts2,
  ...troubleshootingPosts,
  ...troubleshootingPosts2,
  ...troubleshootingPosts3,
  ...troubleshootingPosts4,
];
