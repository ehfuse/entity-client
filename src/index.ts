export * from "./types.js";
export * from "./EntityServerClient.js";

import { EntityServerClient } from "./EntityServerClient.js";

export const entityServer = new EntityServerClient();
