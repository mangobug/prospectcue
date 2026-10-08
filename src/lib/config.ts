export const product = {
  name: 'Agency Prospect',
  initialWorkspace: 'YXU Digital',
} as const;
export const stages = [
  'new',
  'reviewed',
  'contacted',
  'meeting',
  'proposal',
  'won',
  'lost',
] as const;
export const websiteStatuses = [
  'unknown',
  'website_present',
  'social_only',
  'no_website_linked',
] as const;
export const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
