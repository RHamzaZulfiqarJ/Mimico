export const PLATFORM_RULES = {
  twitter: {
    label: "Twitter / X",
    maxLength: 280,
  },
  mastodon: {
    label: "Mastodon",
    maxLength: 500,
  },
  threads: {
    label: "Instagram Threads",
    maxLength: 500,
  },
} as const;

export type SupportedPlatform = keyof typeof PLATFORM_RULES;

export function isSupportedPlatform(platform: string): platform is SupportedPlatform {
  return platform in PLATFORM_RULES;
}

export function getPlatformLimit(platform: string) {
  if (!isSupportedPlatform(platform)) return null;
  return PLATFORM_RULES[platform].maxLength;
}