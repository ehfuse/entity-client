import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";

export function AdminMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class AdminMixinClass extends Base {
        _adminPath(path: string): string {
            return `/v1/admin${path}`;
        }

        _adminGet<T>(path: string): Promise<T> {
            return this.http.get(this._adminPath(path));
        }

        _adminPost<T>(path: string, body?: unknown): Promise<T> {
            return this.http.post(this._adminPath(path), body);
        }

        _adminPut<T>(path: string, body?: unknown): Promise<T> {
            return this.http.put(this._adminPath(path), body);
        }

        _adminPatch<T>(path: string, body?: unknown): Promise<T> {
            return this.http.patch(this._adminPath(path), body);
        }

        _adminDelete<T>(path: string, body?: unknown): Promise<T> {
            return this.http.delete(this._adminPath(path), body);
        }

        listAdminEntities<T = unknown>(): Promise<T> {
            return this._adminGet("/entities");
        }

        getAdminErdSchema<T = unknown>(): Promise<T> {
            return this._adminGet("/erd/schema");
        }

        batchEnsureAdminEntities<T = unknown>(configs: unknown[]): Promise<T> {
            return this._adminPost("/entities/batch-ensure", configs);
        }

        createAdminEntityConfig<T = unknown>(
            entity: string,
            config: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost(`/${entity}/create`, config);
        }

        getAdminEntityConfig<T = unknown>(entity: string): Promise<T> {
            return this._adminGet(`/${entity}/config`);
        }

        updateAdminEntityConfig<T = unknown>(
            entity: string,
            config: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPut(`/${entity}/config`, config);
        }

        validateAdminEntityConfig<T = unknown>(
            config: Record<string, unknown>,
            entity?: string,
        ): Promise<T> {
            return this._adminPost(
                entity ? `/${entity}/validate` : "/entity/validate",
                config,
            );
        }

        normalizeAdminEntityConfig<T = unknown>(
            config: Record<string, unknown>,
            entity?: string,
        ): Promise<T> {
            return this._adminPost(
                entity ? `/${entity}/normalize` : "/entity/normalize",
                config,
            );
        }

        getAdminEntityStats<T = unknown>(
            entity: string,
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost(`/${entity}/stats`, body);
        }

        reindexAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this._adminPost(`/${entity}/reindex`);
        }

        syncAdminEntitySchema<T = unknown>(entity: string): Promise<T> {
            return this._adminPost(`/${entity}/sync-schema`);
        }

        resetAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this._adminPost(`/${entity}/reset`);
        }

        truncateAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this._adminPost(`/${entity}/truncate`);
        }

        dropAdminEntity<T = unknown>(entity: string): Promise<T> {
            return this._adminPost(`/${entity}/drop`);
        }

        resetAllAdmin<T = unknown>(body?: Record<string, unknown>): Promise<T> {
            return this._adminPost("/reset-all", body);
        }

        listAdminConfigs<T = unknown>(): Promise<T> {
            return this._adminGet("/configs");
        }

        getAdminConfig<T = unknown>(domain: string): Promise<T> {
            return this._adminGet(`/configs/${domain}`);
        }

        updateAdminConfig<T = unknown>(
            domain: string,
            patch: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPatch(`/configs/${domain}`, patch);
        }

        listAdminRoles<T = unknown>(): Promise<T> {
            return this._adminGet("/roles");
        }

        createAdminRole<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/roles", body);
        }

        getAdminRole<T = unknown>(seq: number): Promise<T> {
            return this._adminGet(`/roles/${seq}`);
        }

        updateAdminRole<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPatch(`/roles/${seq}`, body);
        }

        deleteAdminRole<T = unknown>(seq: number): Promise<T> {
            return this._adminDelete(`/roles/${seq}`);
        }

        listAdminApiKeys<T = unknown>(): Promise<T> {
            return this._adminGet("/api-keys");
        }

        createAdminApiKey<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/api-keys", body);
        }

        getAdminApiKey<T = unknown>(seq: number): Promise<T> {
            return this._adminGet(`/api-keys/${seq}`);
        }

        updateAdminApiKey<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPatch(`/api-keys/${seq}`, body);
        }

        deleteAdminApiKey<T = unknown>(seq: number): Promise<T> {
            return this._adminDelete(`/api-keys/${seq}`);
        }

        regenerateAdminApiKeySecret<T = unknown>(seq: number): Promise<T> {
            return this._adminPost(`/api-keys/${seq}/regenerate-secret`);
        }

        listAdminAccounts<T = unknown>(): Promise<T> {
            return this._adminGet("/accounts");
        }

        createAdminAccount<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/accounts", body);
        }

        getAdminAccount<T = unknown>(seq: number): Promise<T> {
            return this._adminGet(`/accounts/${seq}`);
        }

        updateAdminAccount<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPatch(`/accounts/${seq}`, body);
        }

        deleteAdminAccount<T = unknown>(seq: number): Promise<T> {
            return this._adminDelete(`/accounts/${seq}`);
        }

        listAdminLicenses<T = unknown>(): Promise<T> {
            return this._adminGet("/licenses");
        }

        createAdminLicense<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/licenses", body);
        }

        getAdminLicense<T = unknown>(seq: number): Promise<T> {
            return this._adminGet(`/licenses/${seq}`);
        }

        updateAdminLicense<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPatch(`/licenses/${seq}`, body);
        }

        deleteAdminLicense<T = unknown>(seq: number): Promise<T> {
            return this._adminDelete(`/licenses/${seq}`);
        }

        runAdminBackup<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/backup/run", body);
        }

        getAdminBackupStatus<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/backup/status", body);
        }

        listAdminBackups<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/backup/list", body);
        }

        restoreAdminBackup<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/backup/restore", body);
        }

        deleteAdminBackup<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this._adminPost("/backup/delete", body);
        }

        disableAdminAccountTwoFactor<T = unknown>(seq: number): Promise<T> {
            return this._adminDelete(`/accounts/${seq}/2fa`);
        }
    };
}
