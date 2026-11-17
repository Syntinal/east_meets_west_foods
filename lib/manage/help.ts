// Who the owner contacts for help, shown on every /manage screen.
// Not a secret — it's shown on screen to anyone logged in. While `phone`
// is empty, the Call/Text buttons are hidden and the help screen just
// says to contact this person.
export const HELP_CONTACT = {
  name: "Kaylee",
  phone: "", // digits only, e.g. "2085551234"
};

export const helpTelHref = () => (HELP_CONTACT.phone ? `tel:${HELP_CONTACT.phone}` : null);
export const helpSmsHref = () => (HELP_CONTACT.phone ? `sms:${HELP_CONTACT.phone}` : null);
