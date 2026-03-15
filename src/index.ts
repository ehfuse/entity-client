export * from "./types";
export * from "./EntityServerClient";

import { EntityServerClient } from "./EntityServerClient";

export const entityServer = new EntityServerClient();
