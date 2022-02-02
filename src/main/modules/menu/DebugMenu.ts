import { IS_DEV } from "@common/config";
import { SupportedLocales } from "@common/i18n/raw";
import type { I18nService } from "@common/modules/I18nModule";
import type { BrowserWindow } from "electron";
import { dialog, MenuItem } from "electron";

import type { ExporterType } from "../../exporters/Exporter";
import { exporters, exporterType } from "../../exporters/Exporter";
import type { ConsoleToRendererService } from "../../services/ConsoleToRendererService";
import { formatEmailTable } from "../../utils/exporter";
// eslint-disable-next-line unused-imports/no-unused-imports -- MenuModule used in doc
import type { ArchifiltreMailsMenu, MenuModule } from "../MenuModule";
import type { PstExtractorMainService } from "../PstExtractorModule";
import { disableMenus, enableMenus } from "./utils";

const OPEN_AND_CONSOLE_LAST_PST_MENU_ID = "OPEN_AND_CONSOLE_LAST_PST_MENU_ID";
const EXPORT_LAST_PST_MENU_ID = "EXPORT_LAST_PST_MENU_ID";
const CHANGE_LANGUAGE_MENU_ID = "CHANGE_LANGUAGE_MENU_ID";

/**
 * Loaded in {@link MenuModule}, the debug menu is only shown on demand or by default in dev mode.
 */
export class DebugMenu implements ArchifiltreMailsMenu {
    public readonly id = "DEBUG_MENU_ID";

    private lastPstFilePath = "";

    constructor(
        private readonly consoleToRendererService: ConsoleToRendererService,
        private readonly pstExtractorMainService: PstExtractorMainService,
        private readonly i18nService: I18nService
    ) {}

    public get item(): MenuItem {
        return new MenuItem({
            enabled: IS_DEV,
            id: this.id,
            label: "Debug",
            sublabel: "Custom debugging",
            submenu: [
                { role: "toggleDevTools" },
                {
                    accelerator: "CommandOrControl+Shift+O",
                    // TODO: clean "click" events into dedicated functions
                    click: async (_menuItem, browserWindow, _event) => {
                        if (!browserWindow) {
                            return;
                        }

                        const dialogReturn = await dialog.showOpenDialog({
                            filters: [
                                {
                                    extensions: ["pst"],
                                    name: "PST Files",
                                },
                            ],
                            properties: ["openFile", "showHiddenFiles"],
                        });

                        if (!dialogReturn.filePaths[0]) {
                            return;
                        }

                        const pstFilePath = (this.lastPstFilePath =
                            dialogReturn.filePaths[0]);

                        if (pstFilePath) {
                            disableMenus(this.id);
                            await this.extractAndLogPst(
                                browserWindow,
                                pstFilePath
                            );
                            enableMenus(
                                this.id,
                                EXPORT_LAST_PST_MENU_ID,
                                OPEN_AND_CONSOLE_LAST_PST_MENU_ID
                            );
                        }
                    },
                    label: "Open and console log PST file...",
                },
                {
                    accelerator: "CommandOrControl+Shift+I",
                    click: async (_menuItem, browserWindow, _event) => {
                        if (this.lastPstFilePath && browserWindow) {
                            this.consoleToRendererService.log(
                                browserWindow,
                                `Open last PST file: ${this.lastPstFilePath}`
                            );
                            await this.extractAndLogPst(
                                browserWindow,
                                this.lastPstFilePath
                            );
                        }
                    },
                    enabled: false,
                    id: OPEN_AND_CONSOLE_LAST_PST_MENU_ID,
                    label: `Open and console log last PST file`,
                },
                {
                    id: EXPORT_LAST_PST_MENU_ID,
                    label: `Export last file...`,
                    submenu: exporterType.map((exportType) => ({
                        click: async (_menuItem, browserWindow, _event) => {
                            if (browserWindow) {
                                await this.exportLast(
                                    browserWindow,
                                    exportType
                                );
                            }
                        },
                        enabled: true,
                        id: `${EXPORT_LAST_PST_MENU_ID}_${exportType.toUpperCase()}`,
                        label: exportType.toUpperCase(),
                    })),
                },
                {
                    id: CHANGE_LANGUAGE_MENU_ID,
                    label: "Change language...",
                    submenu: SupportedLocales.map((lng) => ({
                        click: async () => this.i18nService.changeLanguage(lng),
                        enabled: true,
                        id: `${CHANGE_LANGUAGE_MENU_ID}_${lng}`,
                        label: lng,
                    })),
                },
            ],
            visible: IS_DEV,
        });
    }

    private async extractAndLogPst(
        browserWindow: BrowserWindow,
        pstFilePath: string
    ): Promise<void> {
        const [content, tables] = await this.pstExtractorMainService.extract({
            noProgress: true,
            pstFilePath,
        });
        this.consoleToRendererService.log(browserWindow, content);
        this.consoleToRendererService.log(browserWindow, tables);
    }

    private async exportLast(
        browserWindow: BrowserWindow,
        type: ExporterType
    ): Promise<void> {
        const dialogReturn = await dialog.showSaveDialog(browserWindow, {
            defaultPath: this.lastPstFilePath.replace(/\.pst$/i, `.${type}`),
            filters: [
                { extensions: [type], name: `${type.toUpperCase()} File` },
            ],
            message: "✨",
            nameFieldLabel: "👉",
            showsTagField: false,
            title: `Save ${type.toUpperCase()} export`,
        });
        if (dialogReturn.canceled || !dialogReturn.filePath) {
            return;
        }

        disableMenus(this.id);
        const [, tables] = await this.pstExtractorMainService.extract({
            noProgress: true,
            pstFilePath: this.lastPstFilePath,
        });

        const emails = formatEmailTable(tables.emails);
        await exporters[type].export(emails, dialogReturn.filePath);
        console.info("MENU EXPORT DONE");
    }
}