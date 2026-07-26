import { sessionForPartition } from "./session-factory";
import { log } from "../diagnostics/log-manager";

export async function clearAccountPartition(partition: string): Promise<void> {
  const accountSession = sessionForPartition(partition);
  await accountSession.clearStorageData();
  await accountSession.clearCache();
  log("info", "account_partition_cleared", {});
}
