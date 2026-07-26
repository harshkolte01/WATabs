import { session, type Session } from "electron";
import { partitionName } from "@multi-whatsapp/shared-types";
import { applyWhatsAppBrowserIdentity } from "./browser-identity";

const prepared = new WeakSet<Session>();

export function sessionForAccountId(accountId: string): Session {
  return sessionForPartition(partitionName(accountId));
}

export function sessionForPartition(partition: string): Session {
  if (!partition.startsWith("persist:wa-")) {
    throw new Error("Refusing non-WhatsApp account partition");
  }
  const accountSession = session.fromPartition(partition);
  if (!prepared.has(accountSession)) {
    applyWhatsAppBrowserIdentity(accountSession);
    prepared.add(accountSession);
  }
  return accountSession;
}
