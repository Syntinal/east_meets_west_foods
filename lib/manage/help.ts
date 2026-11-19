// How the owner reaches out for help, shown on /manage's Help screen.
// Deliberately no person's name in the owner-facing app — just "reach out".
// Not a secret: it's shown to anyone signed in. While `phone` is empty, the
// Call/Text buttons are hidden and the screen just says to reach out.
export const HELP_CONTACT = {
  phone: "", // digits only, e.g. "2085551234"
};

export const helpTelHref = () => (HELP_CONTACT.phone ? `tel:${HELP_CONTACT.phone}` : null);
export const helpSmsHref = () => (HELP_CONTACT.phone ? `sms:${HELP_CONTACT.phone}` : null);
