import { APP_CACHE, IS_DEV } from "@common/config";
import type {
    AdditionalDataItem,
    PstAttachment,
    PstAttachmentEntries,
    PstMailIdsEntries,
    PstMailIndex,
    PstMailIndexEntries,
} from "@common/modules/pst-extractor/type";
import type { ViewType } from "@common/modules/views/setup";
import type { AnyFunction, MethodNames } from "@common/utils/type";
import { Level } from "level";
import path from "path";

const ROOT_KEY = "_index_";
const ATTACHMENTS_KEY = "_attachments_";
const GROUPS_DB_PREFIX = "_groups_";
const ADDITIONNAL_DATES_DB_PREFIX = "_additionalDatas_";
const CACHE_FOLDER_NAME = "archimail-db";

export type AdditionalDatasType = "folderList";

const defaultDbOptions = {
    valueEncoding: "json",
};

const SoftLockDb = <
    TProp extends MethodNames<PstCache>,
    TMeth extends PstCache[TProp],
    TParams extends Parameters<TMeth>
>(
    _proto: PstCache,
    _property: TProp,
    descriptor: TypedPropertyDescriptor<TMeth>
) => {
    const originalMethod = _proto[_property];
    descriptor.value = async function (this: PstCache, ...args: TParams) {
        await this.db.open();
        const ret = await (originalMethod as AnyFunction).apply(this, args);
        await this.db.close();
        return ret;
    } as TMeth;
};

export class PstCache {
    public readonly db: Level<string, unknown>;

    private currrentPstID?: string;

    constructor(
        private readonly cachePath = path.resolve(
            APP_CACHE(),
            CACHE_FOLDER_NAME
        )
    ) {
        this.db = new Level(this.cachePath, defaultDbOptions);
        if (IS_DEV) {
            void this.db.clear();
        }
    }

    @SoftLockDb
    public async setPstMailIndexes(
        indexes: Map<string, PstMailIndex>
    ): Promise<void> {
        const currentDb = this.getCurrentPstDb();
        await currentDb.put(ROOT_KEY, [...indexes.entries()]);
    }

    @SoftLockDb
    public async getPstMailIndexes(): Promise<Map<string, PstMailIndex>> {
        const currentDb = this.getCurrentPstDb();
        const rawIndexes = (await currentDb.get(
            ROOT_KEY
        )) as PstMailIndexEntries;
        return new Map(rawIndexes);
    }

    @SoftLockDb
    public async setAttachments(
        attachments: Map<string, PstAttachment[]>
    ): Promise<void> {
        const currentDb = this.getCurrentPstDb();
        await currentDb.put(ATTACHMENTS_KEY, [...attachments.entries()]);
    }

    @SoftLockDb
    public async getAttachments(): Promise<Map<string, PstAttachment[]>> {
        const currentDb = this.getCurrentPstDb();
        const rawAttachments = (await currentDb.get(
            ATTACHMENTS_KEY
        )) as PstAttachmentEntries;
        return new Map(rawAttachments);
    }

    @SoftLockDb
    public async setGroup(
        name: ViewType,
        ids: Map<string, string[]>
    ): Promise<void> {
        const currentGroupsDb = this.getCurrentGroupsDb();
        await currentGroupsDb.put(name, [...ids.entries()]);
    }

    @SoftLockDb
    public async getGroup(name: ViewType): Promise<Map<string, string[]>> {
        const currentGroupsDb = this.getCurrentGroupsDb();
        const rawIds = await currentGroupsDb.get(name);
        return new Map(rawIds);
    }

    @SoftLockDb
    public async getAllGroups(): Promise<
        Record<ViewType, Map<string, string[]>>
    > {
        const currentGroupsDb = this.getCurrentGroupsDb();
        const entries = await currentGroupsDb.iterator().all();
        return entries.reduce(
            (acc, [k, v]) => ({ ...acc, [k]: new Map(v) }),
            {} as Record<ViewType, Map<string, string[]>>
        );
    }

    @SoftLockDb
    public async setAddtionalDatas(
        name: AdditionalDatasType,
        addtionalDatas: AdditionalDataItem[]
    ): Promise<void> {
        const currentAdditionalDatasDb = this.getCurrentAdditionalDatasDb();
        await currentAdditionalDatasDb.put(name, addtionalDatas);
    }

    @SoftLockDb
    public async getAddtionalDatas(
        name: AdditionalDatasType
    ): Promise<AdditionalDataItem[]> {
        const currentAdditionalDatasDb = this.getCurrentAdditionalDatasDb();
        return currentAdditionalDatasDb.get(name);
    }

    @SoftLockDb
    public async getAllAddtionalData(): Promise<
        Record<AdditionalDatasType, AdditionalDataItem[]>
    > {
        const currentAdditionalDatasDb = this.getCurrentAdditionalDatasDb();
        const entries = await currentAdditionalDatasDb.iterator().all();
        return entries.reduce(
            (acc, [k, v]) => ({ ...acc, [k]: v }),
            {} as Record<AdditionalDatasType, AdditionalDataItem[]>
        );
    }

    public openForPst(pstId: string): void {
        this.currrentPstID = pstId;
    }

    private getCurrentPstDb() {
        if (!this.currrentPstID) throw new Error("No PST cache opened yet.");
        return this.db.sublevel<string, unknown>(
            this.currrentPstID,
            defaultDbOptions
        );
    }

    private getCurrentGroupsDb() {
        return this.getCurrentPstDb().sublevel<ViewType, PstMailIdsEntries>(
            GROUPS_DB_PREFIX,
            defaultDbOptions
        );
    }

    private getCurrentAdditionalDatasDb() {
        return this.getCurrentPstDb().sublevel<string, AdditionalDataItem[]>(
            ADDITIONNAL_DATES_DB_PREFIX,
            defaultDbOptions
        );
    }
}
