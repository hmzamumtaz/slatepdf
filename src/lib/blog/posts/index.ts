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
import { windowsGuidesPosts } from './windows-guides';
import { mobilePdfGuidesPosts } from './mobile-pdf-guides';
import { newPosts6 } from './new-posts-6';
import { newPosts7 } from './new-posts-7';
import { newPosts8 } from './new-posts-8';
import { newPosts9 } from './new-posts-9';
import { newPosts10 } from './new-posts-10';
import { newPosts11 } from './new-posts-11';

export const allPosts: BlogPost[] = [
  ...newPosts11,
  ...newPosts10,
  ...newPosts9,
  ...newPosts8,
  ...newPosts7,
  ...newPosts6,
  ...newPosts5,
  ...mobilePdfGuidesPosts,
  ...windowsGuidesPosts,
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
