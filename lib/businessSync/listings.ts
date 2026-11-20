import type { FingerprintScope } from "@/lib/businessInfo";

// Places that show the restaurant's phone, address or hours but have no
// free way for the website to update them. The sync screen lists each one
// with a link, and remembers when the owner last updated it, so a change
// made here shows which places still need doing by hand.
//
// Add, remove or reword entries here; the `key` is what's stored, so keep
// existing keys stable.

export type ManualListing = {
  key: string;
  name: string;
  url: string;
  /** Which parts of the info this place shows (decides when it's out of date). */
  scope: FingerprintScope;
  /** One short line on where to make the change once signed in. */
  how: string;
};

export const MANUAL_LISTINGS: ManualListing[] = [
  {
    key: "apple",
    name: "Apple Maps",
    url: "https://businessconnect.apple.com/",
    scope: "all",
    how: "Sign in to Apple Business Connect, choose the restaurant, then edit hours or contact details.",
  },
  {
    key: "yelp",
    name: "Yelp",
    url: "https://biz.yelp.com/",
    scope: "all",
    how: "Sign in to Yelp for Business, then Business information.",
  },
  {
    key: "bing",
    name: "Bing Maps",
    url: "https://www.bingplaces.com/",
    scope: "all",
    how: "Sign in to Bing Places. It can also copy everything over from Google for you.",
  },
  {
    key: "instagram",
    name: "Instagram profile",
    url: "https://www.instagram.com/accounts/edit/",
    scope: "contact",
    how: "In the Instagram app: Edit profile, then Contact options (phone and address only).",
  },
  {
    key: "tripadvisor",
    name: "Tripadvisor",
    url: "https://www.tripadvisor.com/Owners",
    scope: "all",
    how: "Sign in to Tripadvisor for Business, then Listing details.",
  },
  {
    key: "nextdoor",
    name: "Nextdoor",
    url: "https://business.nextdoor.com/",
    scope: "all",
    how: "Sign in to your Nextdoor business page, then Edit page.",
  },
];

// Shown as "do it yourself" rows only while the automatic connection isn't
// set up yet, so nothing falls through the cracks in the meantime.
export const GOOGLE_MANUAL: ManualListing = {
  key: "google",
  name: "Google (Search & Maps)",
  url: "https://business.google.com/",
  scope: "all",
  how: "Sign in to your Google Business Profile, then Edit profile.",
};

export const FACEBOOK_MANUAL: ManualListing = {
  key: "facebook",
  name: "Facebook Page",
  url: "https://www.facebook.com/",
  scope: "all",
  how: "Open the restaurant's Page, then Edit details (hours and contact info).",
};

// Facebook's API can't set holiday hours, so even once Facebook is
// connected, upcoming special days still need entering there by hand.
export const FACEBOOK_SPECIAL_MANUAL: ManualListing = {
  key: "facebook-special",
  name: "Facebook holiday hours",
  url: "https://www.facebook.com/",
  scope: "special",
  how: "Open the restaurant's Page, Edit details, then Hours and \"Special hours\". Facebook doesn't let the website do this part.",
};
