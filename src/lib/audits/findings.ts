import type { Finding } from './schema';
export type PageFacts = {
  title: string;
  description: string;
  viewport: string;
  h1: number;
  width: number;
  documentWidth: number;
  images: number;
  imagesWithoutAlt: number;
  contactLinks: number;
  inputsWithoutLabels: number;
};
export function findingsFor(
  f: PageFacts,
  status: number,
  url: string,
  incomplete: boolean,
): Finding[] {
  const check = (
    id: string,
    title: string,
    issue: boolean,
    evidence: string,
    recommendation: string,
  ): Finding => ({
    id,
    title,
    status: issue ? 'issue' : 'pass',
    evidence,
    recommendation: issue
      ? recommendation
      : 'No change suggested by this check.',
  });
  const html: Finding[] = [
    check(
      'https',
      'HTTPS connection',
      !url.startsWith('https:'),
      `Final page URL: ${url}`,
      'Serve the website over HTTPS and redirect HTTP visits.',
    ),
    check(
      'http',
      'Homepage response',
      status >= 400,
      `The homepage returned HTTP ${status}.`,
      'Check the homepage response and hosting configuration. Bot protection may affect this audit.',
    ),
    check(
      'title',
      'Page title',
      !f.title.trim(),
      f.title ? `document.title: “${f.title}”` : 'document.title was empty.',
      'Add a descriptive page title identifying the business and service.',
    ),
    check(
      'description',
      'Search description',
      !f.description.trim(),
      f.description
        ? `meta[name="description"]: “${f.description}”`
        : 'No non-empty meta description was found.',
      'Add a concise description for search engines. They may choose different text.',
    ),
    check(
      'viewport',
      'Mobile viewport',
      !/width\s*=\s*device-width/i.test(f.viewport),
      `meta[name="viewport"]: ${f.viewport || '(missing)'}`,
      'Add a width=device-width viewport and review the mobile layout.',
    ),
    check(
      'overflow',
      'Mobile horizontal overflow',
      f.documentWidth > f.width + 5,
      `At ${f.width}px viewport width, the document was ${f.documentWidth}px wide. See the mobile screenshot.`,
      'Fix elements wider than the mobile viewport and check navigation on a phone.',
    ),
    check(
      'heading',
      'Main heading',
      f.h1 === 0,
      `Found ${f.h1} <h1> element(s) in the rendered document.`,
      'Add a clear main heading describing the page.',
    ),
    check(
      'image-alt',
      'Image alternative text',
      f.imagesWithoutAlt > 0,
      `${f.imagesWithoutAlt} of ${f.images} <img> elements had no alt attribute. Empty alt attributes were accepted for decorative images.`,
      'Add meaningful alternative text for informative images. Use alt="" for decorative images.',
    ),
    check(
      'input-labels',
      'Form labels',
      f.inputsWithoutLabels > 0,
      `${f.inputsWithoutLabels} visible form control(s) lacked a label, aria-label, or valid aria-labelledby reference.`,
      'Give each form control an accessible label; test the form with a screen reader.',
    ),
  ];
  html.push({
    id: 'contact',
    title: 'Contact or booking link',
    status: f.contactLinks ? 'pass' : 'unknown',
    evidence: `Found ${f.contactLinks} link(s) with contact/booking text, a contact path, tel:, or mailto:. No forms or links were submitted.`,
    recommendation: f.contactLinks
      ? 'Review the contact path manually to confirm it works.'
      : 'Review whether the homepage makes it easy to contact or book. Other languages or custom controls may not match this check.',
  });
  if (incomplete)
    for (const finding of html) {
      if (
        finding.status === 'issue' &&
        !['https', 'http'].includes(finding.id)
      ) {
        finding.status = 'unknown';
        finding.evidence +=
          ' Some page resources failed or were blocked; verify this manually.';
      }
    }
  return html;
}
