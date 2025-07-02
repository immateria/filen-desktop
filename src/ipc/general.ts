// General IPC handlers extracted from IPC class
import { ipcMain, app, dialog, shell } from "electron"
import pathModule from "path"
import fs from "fs-extra"
import { zip } from "zip-a-folder"
import { filenLogsPath } from "../lib/logger"
import {
    getExistingDrives,
    getAvailableDriveLetters
} from "@filen/network-drive"
import { tryingToSyncDesktop, isPathSyncedByICloud } from "@filen/sync"
import { type SyncPair } from "@filen/sync/dist/types"
import { setConfig } from "../config"
import {
    isPortInUse,
    canStartServerOnIPAndPort,
    getDiskType,
    getLocalDirectorySize,
    execCommand
} from "../utils"
import {
    runAction,
    triggerRule,
    loadRules,
    saveRules,
    type Action,
    type RuleConfig
} from "../lib/actions"
import {
    type IPCShowSaveDialogResultParams,
    type IPCShowSaveDialogResult,
    type IPCSelectDirectoryResult,
    type IPCCanStartServerOnIPAndPort
} from "./types"
import { type FilenDesktopConfig } from "../types"

import { IPC } from "./index"

export function registerGeneralHandlers(ipc: IPC): void {
    ipcMain.handle("restart", (): void => {
        if (ipc.didCallRestart) {
            return
        }

        ipc.didCallRestart = true

        app.relaunch()
        app.exit(0)
    })

    ipcMain.handle("setConfig", async (_, config: FilenDesktopConfig): Promise<void> => {
        config = {
            ...config,
            sdkConfig: {
                ...config.sdkConfig,
                connectToSocket: true,
                metadataCache: true,
                password: "redacted"
            },
            networkDriveConfig: {
                ...config.networkDriveConfig,
                localDirPath: pathModule.join(app.getPath("userData"), "networkDrive")
            },
            syncConfig: {
                ...config.syncConfig,
                dbPath: pathModule.join(app.getPath("userData"), "sync"),
                syncPairs: config.syncConfig.syncPairs.map((pair: SyncPair) => ({
                    ...pair,
                    requireConfirmationOnLargeDeletions: true
                }))
            }
        }

        setConfig(config)

        await Promise.all([
            ipc.desktop.worker.invoke("setConfig", config),
            ipc.desktop.worker.invoke("syncUpdatePairs", { pairs: config.syncConfig.syncPairs })
        ])
    })

    ipcMain.handle("showSaveDialog", async (_, params?: IPCShowSaveDialogResultParams): Promise<IPCShowSaveDialogResult> => {
        if (!ipc.desktop.driveWindow) {
            throw new Error("Drive window missing.")
        }

        const { canceled, filePath } = await dialog.showSaveDialog(ipc.desktop.driveWindow, {
            properties: ["createDirectory", "showHiddenFiles", "showOverwriteConfirmation", "treatPackageAsDirectory"],
            defaultPath: params && params.nameSuggestion ? params.nameSuggestion : `Download_${Date.now()}`
        })

        if (canceled || !filePath) {
            return {
                cancelled: true
            }
        }

        const name = pathModule.basename(filePath)
        const parentPath = pathModule.dirname(filePath)
        const canWrite = await new Promise<boolean>(resolve =>
            fs.access(parentPath, fs.constants.W_OK | fs.constants.R_OK, err => resolve(err ? false : true))
        )

        if (!canWrite) {
            throw new Error(`Cannot write at path ${parentPath}.`)
        }

        return {
            cancelled: false,
            path: filePath,
            name
        }
    })

    ipcMain.handle("selectDirectory", async (_, multiple: boolean = false): Promise<IPCSelectDirectoryResult> => {
        if (!ipc.desktop.driveWindow) {
            throw new Error("Drive window missing.")
        }

        const { canceled, filePaths } = await dialog.showOpenDialog(ipc.desktop.driveWindow, {
            properties: multiple ? ["createDirectory", "openDirectory", "multiSelections"] : ["createDirectory", "openDirectory"]
        })

        if (canceled || filePaths.length === 0) {
            return {
                cancelled: true
            }
        }

        return {
            cancelled: false,
            paths: filePaths
        }
    })

    ipcMain.handle("getExistingDrives", async (): Promise<string[]> => {
        return await getExistingDrives()
    })

    ipcMain.handle("getAvailableDrives", async (): Promise<string[]> => {
        return await getAvailableDriveLetters()
    })

    ipcMain.handle("isPortInUse", async (_, port): Promise<boolean> => {
        return await isPortInUse(port)
    })

    ipcMain.handle("canStartServerOnIPAndPort", async (_, { ip, port }: IPCCanStartServerOnIPAndPort): Promise<boolean> => {
        return await canStartServerOnIPAndPort(ip, port)
    })

    ipcMain.handle("openLocalPath", async (_, path): Promise<void> => {
        const open = await shell.openPath(pathModule.normalize(path))

        if (open.length > 0) {
            throw new Error(open)
        }
    })

    ipcMain.handle("runAppleScript", async (_, script: string): Promise<string> => {
        if (process.platform !== "darwin") {
            return ""
        }

        return await execCommand(`osascript -e ${JSON.stringify(script)}`)
    })

    ipcMain.handle("runAction", async (_, action: Action): Promise<void> => {
        await runAction(action)
    })

    ipcMain.handle("triggerRule", async (_, name: string): Promise<void> => {
        await triggerRule(name)
    })

    ipcMain.handle("getRules", async () => {
        return await loadRules()
    })

    ipcMain.handle("saveRules", async (_, rules: RuleConfig) => {
        await saveRules(rules)
    })

    ipcMain.handle("isPathWritable", async (_, path: string) => {
        return await ipc.desktop.lib.fs.isPathWritable(path)
    })

    ipcMain.handle("isPathReadable", async (_, path: string) => {
        return await ipc.desktop.lib.fs.isPathReadable(path)
    })

    ipcMain.handle("isWorkerActive", async () => {
        return ipc.desktop.worker.active
    })

    ipcMain.handle("updateNotificationCount", async (_, count: number) => {
        ipc.desktop.status.trayState.notificationCount = count;

        ipc.desktop.status.update()
    })

    ipcMain.handle("updateErrorCount", async (_, count: number) => {
        ipc.desktop.status.trayState.errorCount = count;

        ipc.desktop.status.update()
    })

    ipcMain.handle("updateWarningCount", async (_, count: number) => {
        ipc.desktop.status.trayState.warningCount = count;

        ipc.desktop.status.update()
    })

    ipcMain.handle("updateIsSyncing", async (_, isSyncing: boolean) => {
        ipc.desktop.status.trayState.isSyncing = isSyncing;

        ipc.desktop.status.update()
    })

    ipcMain.handle("toggleAutoLaunch", async (_, enabled: boolean) => {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            ...(enabled
                ? {
                        openAsHidden: true,
                        args: ["--hidden"]
                  }
                : {})
        })
    })

    ipcMain.handle("getAutoLaunch", async () => {
        return app.getLoginItemSettings({
            args: ["--hidden"]
        })
    })

    ipcMain.handle("installUpdate", async () => {
        await ipc.desktop.updater.installUpdate()
    })

    ipcMain.handle("exportLogs", async () => {
        if (!ipc.desktop.driveWindow) {
            return
        }

        const name = `filenDesktopLogs_${Date.now()}.zip`
        const { canceled, filePath } = await dialog.showSaveDialog(ipc.desktop.driveWindow, {
            properties: ["createDirectory", "showHiddenFiles", "showOverwriteConfirmation", "treatPackageAsDirectory"],
            defaultPath: name
        })

        if (canceled || !filePath) {
            return
        }

        const parentPath = pathModule.dirname(filePath)
        const canWrite = await new Promise<boolean>(resolve =>
            fs.access(parentPath, fs.constants.W_OK | fs.constants.R_OK, err => resolve(err ? false : true))
        )

        if (!canWrite) {
            throw new Error(`Cannot write at path ${parentPath}.`)
        }

        const logsPath = await filenLogsPath()

        await fs.copy(app.getPath("crashDumps"), pathModule.join(logsPath, "crashDumps"), {
            overwrite: true
        })

        const dir = await getLocalDirectorySize(logsPath)

        if (dir.items === 0) {
            return
        }

        await zip(logsPath, pathModule.join(pathModule.dirname(filePath), name), {
            compression: 9
        })
    })

    ipcMain.handle("version", async () => {
        return app.getVersion()
    })

    ipcMain.handle("restartWorker", async () => {
        await ipc.desktop.worker.stop()
        await ipc.desktop.worker.start()
    })

    ipcMain.handle("getLocalDirectoryItemCount", async (_, path: string) => {
        return await ipc.desktop.worker.invoke("getLocalDirectoryItemCount", path)
    })

    ipcMain.handle("getDiskType", async (_, path: string) => {
        return await getDiskType(path)
    })

    ipcMain.handle("tryingToSyncDesktop", async (_, path: string) => {
        return tryingToSyncDesktop(path)
    })

    ipcMain.handle("isPathSyncedByICloud", async (_, path: string) => {
        return await isPathSyncedByICloud(path)
    })

    ipcMain.handle("setMinimizeToTray", async (_, minimizeToTray: boolean) => {
        ipc.desktop.minimizeToTray = minimizeToTray

        await ipc.desktop.options.update({
            minimizeToTray
        })
    })

    ipcMain.handle("setStartMinimized", async (_, startMinimized: boolean) => {
        await ipc.desktop.options.update({
            startMinimized
        })
    })

    ipcMain.handle("setEnableURLProtocol", async (_, enable: boolean) => {
        ipc.desktop.enableURLProtocol = enable

        if (process.platform === "darwin" || process.platform === "win32") {
            if (enable) {
                ipc.desktop.registerURLProtocol()
            } else {
                ipc.desktop.unregisterURLProtocol()
            }
        }

        await ipc.desktop.options.update({
            enableURLProtocol: enable
        })
    })
}
