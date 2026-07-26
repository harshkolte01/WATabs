/** Fixed UUIDs so restart persistence is reproducible across proof runs. */
export const ACCOUNT_A_ID = "a0000000-0000-4000-8000-000000000001";
export const ACCOUNT_B_ID = "a0000000-0000-4000-8000-000000000002";

export const WHATSAPP_ORIGIN = "https://web.whatsapp.com";
export const WHATSAPP_URL = `${WHATSAPP_ORIGIN}/`;

export const TOOLBAR_HEIGHT = 48;

export type AccountId = typeof ACCOUNT_A_ID | typeof ACCOUNT_B_ID;

export const ACCOUNTS: ReadonlyArray<{ id: AccountId; label: string }> = [
  { id: ACCOUNT_A_ID, label: "Account A" },
  { id: ACCOUNT_B_ID, label: "Account B" },
];

export function partitionName(accountId: string): string {
  return `persist:wa-${accountId}`;
}
