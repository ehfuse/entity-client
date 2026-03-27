export * from "./types.js";
export * from "./EntityServerClient.js";
export * from "./packet.js";

import { EntityServerClient } from "./EntityServerClient.js";

export const entityServer = new EntityServerClient();
