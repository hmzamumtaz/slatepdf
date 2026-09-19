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
import { newPosts2 } from './new-posts-2';
import { newPosts3 } from './new-posts-3';
import { newPosts4 } from './new-posts-4';
import { newPosts5 } from './new-posts-5';
import { mobilePdfGuidesPosts } from './mobile-pdf-guides';
import { newPosts6 } from './new-posts-6';
import { newPosts8 } from './new-posts-8';
import { newPosts12 } from './new-posts-12';
import { newPosts13 } from './new-posts-13';
import { newPosts14 } from './new-posts-14';
import { newPosts15 } from './new-posts-15';

export const allPosts: BlogPost[] = [
  ...newPosts15,
  ...newPosts14,
  ...newPosts13,
  ...newPosts12,
  ...newPosts8,
  ...newPosts6,
  ...newPosts5,
  ...mobilePdfGuidesPosts,
  ...newPosts4,
  ...newPosts3,
  ...newPosts,
  ...newPosts2,
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
