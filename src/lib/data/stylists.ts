export type Stylist = {
  id: string;
  name: string;
  role: string;
  /** Short line for the team section. */
  note: string;
};

/**
 * Placeholder team — replace with the real hairarchie crew before launch.
 */
export const stylists: Stylist[] = [
  { id: "mila", name: "Mila", role: "Inhaberin & Master Barber", note: "Fades, Bartkonturen, Farbtechnik" },
  { id: "yusuf", name: "Yusuf", role: "Senior Stylist", note: "Klassische Schnitte, Styling" },
  { id: "elif", name: "Elif", role: "Junior Stylistin", note: "Kinderschnitte, Pflege" },
];

export function findStylist(stylistId: string): Stylist | undefined {
  return stylists.find((stylist) => stylist.id === stylistId);
}
