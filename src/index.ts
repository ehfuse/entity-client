export * from "./types.js";
export * from "./EntityServerApi.js";
export * from "./EntityAppServerApi.js";
export * from "./mixins/server/index.js";
export * from "./mixins/app/index.js";
export * from "./packet.js";
export * from "./client/jwt.js";

import { EntityServerApi } from "./EntityServerApi.js";
import { EntityAppServerApi } from "./EntityAppServerApi.js";

export const entityServer = new EntityServerApi();
export const entityAppServer = new EntityAppServerApi();
