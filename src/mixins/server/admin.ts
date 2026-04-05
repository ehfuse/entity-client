import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";

export function AdminMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class AdminMixinClass extends Base {
        adminPath(path: string): string {
            return `/v1/admin${path}`;
        }

        adminGet<T>(path: string): Promise<T> {
            return this.http.get(this.adminPath(path));
        }

        adminPost<T>(path: string, body?: unknown): Promise<T> {
            return this.http.post(this.adminPath(path), body);
        }

        adminPut<T>(path: string, body?: unknown): Promise<T> {
            return this.http.put(this.adminPath(path), body);
        }

        adminPatch<T>(path: string, body?: unknown): Promise<T> {
            return this.http.patch(this.adminPath(path), body);
        }

        adminDelete<T>(path: string, body?: unknown): Promise<T> {
            return this.http.delete(this.adminPath(path), body);
        }

        listAdminEntities<T = unknown>(): Promise<T> {
            return this.adminGet("/entities");
        }

        getAdminErdSchema<T = unknown>(): Promise<T> {
            return this.adminGet("/erd/schema");
        }

        batchEnsureAdminEntities<T = unknown>(configs: unknown[]): Promise<T> {
            return this.adminPost("/entities/batch-ensure", configs);
        }

        createAdminEntityConfig<T = unknown>(
            entity: string,
            config: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost(`/${entity}/create`, config);
        }

        getAdminEntityConfig<T = unknown>(entity: string): Promise<T> {
            return this.adminGet(`/${entity}/config`);
        }

        updateAdminEntityConfig<T = unknown>(
            entity: string,
            config: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPut(`/${entity}/config`, config);
        }

        validateAdminEntityConfig<T = unknown>(
            config: Record<string, unknown>,
            entity?: string,
        ): Promise<T> {
            return this.adminPost(
                entity ? `/${entity}/validate` : "/entity/validate",
                config,
            );
        }

        normalizeAdminEntityConfig<T = unknown>(
            config: Record<string, unknown>,
            entity?: string,
        ): Promise<T> {
            return this.adminPost(
                entity ? `/${entity}/normalize` : "/entity/normalize",
                config,
            );
        }

        getAdminEntityStats<T = unknown>(
            entity: string,
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost(`/${entity}/stats`, body);
        }

        reindexAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this.adminPost(`/${entity}/reindex`);
        }

        syncAdminEntitySchema<T = unknown>(entity: string): Promise<T> {
            return this.adminPost(`/${entity}/sync-schema`);
        }

        resetAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this.adminPost(`/${entity}/reset`);
        }

        truncateAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this.adminPost(`/${entity}/truncate`);
        }

        dropAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this.adminPost(`/${entity}/drop`);
        }

        resetAllAdmin<T = unknown>(body?: Record<string, unknown>): Promise<T> {
            return this.adminPost("/reset-all", body);
        }

        listAdminConfigs<T = unknown>(): Promise<T> {
            return this.adminGet("/configs");
        }

        getAdminConfig<T = unknown>(domain: string): Promise<T> {
            return this.adminGet(`/configs/${domain}`);
        }

        updateAdminConfig<T = unknown>(
            domain: string,
            patch: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPatch(`/configs/${domain}`, patch);
        }

        listAdminRoles<T = unknown>(): Promise<T> {
            return this.adminGet("/roles");
        }

        createAdminRole<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/roles", body);
        }

        getAdminRole<T = unknown>(seq: number): Promise<T> {
            return this.adminGet(`/roles/${seq}`);
        }

        updateAdminRole<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPatch(`/roles/${seq}`, body);
        }

        deleteAdminRole<T = unknown>(seq: number): Promise<T> {
            return this.adminDelete(`/roles/${seq}`);
        }

        listAdminApiKeys<T = unknown>(): Promise<T> {
            return this.adminGet("/api-keys");
        }

        createAdminApiKey<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/api-keys", body);
        }

        getAdminApiKey<T = unknown>(seq: number): Promise<T> {
            return this.adminGet(`/api-keys/${seq}`);
        }

        updateAdminApiKey<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPatch(`/api-keys/${seq}`, body);
        }

        deleteAdminApiKey<T = unknown>(seq: number): Promise<T> {
            return this.adminDelete(`/api-keys/${seq}`);
        }

        regenerateAdminApiKeySecret<T = unknown>(seq: number): Promise<T> {
            return this.adminPost(`/api-keys/${seq}/regenerate-secret`);
        }

        listAdminAccounts<T = unknown>(): Promise<T> {
            return this.adminGet("/accounts");
        }

        createAdminAccount<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/accounts", body);
        }

        getAdminAccount<T = unknown>(seq: number): Promise<T> {
            return this.adminGet(`/accounts/${seq}`);
        }

        updateAdminAccount<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPatch(`/accounts/${seq}`, body);
        }

        deleteAdminAccount<T = unknown>(seq: number): Promise<T> {
            return this.adminDelete(`/accounts/${seq}`);
        }

        listAdminLicenses<T = unknown>(): Promise<T> {
            return this.adminGet("/licenses");
        }

        createAdminLicense<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/licenses", body);
        }

        getAdminLicense<T = unknown>(seq: number): Promise<T> {
            return this.adminGet(`/licenses/${seq}`);
        }

        updateAdminLicense<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPatch(`/licenses/${seq}`, body);
        }

        deleteAdminLicense<T = unknown>(seq: number): Promise<T> {
            return this.adminDelete(`/licenses/${seq}`);
        }

        runAdminBackup<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/backup/run", body);
        }

        getAdminBackupStatus<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/backup/status", body);
        }

        listAdminBackups<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/backup/list", body);
        }

        restoreAdminBackup<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/backup/restore", body);
        }

        deleteAdminBackup<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.adminPost("/backup/delete", body);
        }

        disableAdminAccountTwoFactor<T = unknown>(seq: number): Promise<T> {
            return this.adminDelete(`/accounts/${seq}/2fa`);
        }
    };
}
