import { categories, getToolsByCategory, tools } from '@/lib/tools-data';
import { DEFAULT_LOCALE, type AnyLocale } from './config';
import { categoryName, fill, getContent, toolContent } from './content';
import { homeHref, toolHref, toolsHubHref } from './paths';

export interface NavTool {
  slug: string;
  href: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface NavCategory {
  /** English category, used as a stable id and for anchors. */
  id: string;
  label: string;
  /** Compact label for the header ("Organize" rather than "Organize PDF"). */
  shortLabel: string;
  tools: NavTool[];
}

/** Everything the header and footer render, already translated. */
export interface NavData {
  locale: AnyLocale;
  homeHref: string;
  hubHref: string;
  workspace: { href: string; label: string };
  categories: NavCategory[];
  labels: {
    allTools: string;
    guides: string;
    language: string;
    menu: string;
    footerTagline: string;
    footerPrivate: string;
    footerAllTools: string;
    noSignup: string;
    noWatermark: string;
    about: string;
    privacy: string;
    terms: string;
  };
}

export async function getNav(locale: AnyLocale): Promise<NavData> {
  const content = await getContent(locale);
  const s = content.site;
  const navTool = (slug: string): NavTool => {
    const info = tools.find(t => t.slug === slug)!;
    const tr = toolContent(content, slug);
    return { slug, href: toolHref(locale, slug), name: tr.name, description: tr.description, icon: info.icon, color: info.color };
  };
  const english = locale === DEFAULT_LOCALE;
  return {
    locale,
    homeHref: homeHref(locale),
    hubHref: toolsHubHref(locale),
    workspace: { href: toolHref(locale, 'pdf-workspace'), label: s.navWorkspace },
    categories: categories.map(c => ({
      id: c,
      label: categoryName(content, c),
      shortLabel: english ? c.replace(' PDF', '') : categoryName(content, c),
      tools: getToolsByCategory(c).map(t => navTool(t.slug)),
    })),
    labels: {
      allTools: s.navAllTools,
      // The blog and legal pages are English-only; translated pages say so.
      guides: english ? 'Blog' : s.navGuides,
      language: s.language,
      menu: s.menu,
      footerTagline: s.footerTagline,
      footerPrivate: s.footerPrivate,
      footerAllTools: fill(s.footerAllTools, { count: tools.length }),
      noSignup: s.footerNoSignup,
      noWatermark: s.footerNoWatermark,
      about: english ? 'About' : s.footerAbout,
      privacy: english ? 'Privacy' : s.footerPrivacy,
      terms: english ? 'Terms' : s.footerTerms,
    },
  };
}
