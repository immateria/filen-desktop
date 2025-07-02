import { ipcMain } from "electron"
import pathModule from "path"
import fs from "fs-extra"
import os from "os"
import { DISALLOWED_SYNC_DIRS } from "../constants"
import { IPC } from "./index"

export function registerSyncHandlers(ipc: IPC): void {
    ipcMain.handle("startSync", async () => {
        await ipc.desktop.worker.invoke("startSync")
    })

    ipcMain.handle("stopSync", async () => {
        await ipc.desktop.worker.invoke("stopSync")
    })

    ipcMain.handle("restartSync", async () => {
        await ipc.desktop.worker.invoke("restartSync")
    })

    ipcMain.handle("isSyncActive", async () => {
        return await ipc.desktop.worker.invoke("isSyncActive")
    })

    ipcMain.handle("syncResetCache", async (_, params) => {
        await ipc.desktop.worker.invoke("syncResetCache", params)
    })

    ipcMain.handle("syncUpdateExcludeDotFiles", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdateExcludeDotFiles", params)
    })

    ipcMain.handle("syncUpdateIgnorerContent", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdateIgnorerContent", params)
    })

    ipcMain.handle("syncUpdateRequireConfirmationOnLargeDeletions", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdateRequireConfirmationOnLargeDeletions", params)
    })

    ipcMain.handle("syncFetchIgnorerContent", async (_, params) => {
        return await ipc.desktop.worker.invoke("syncFetchIgnorerContent", params)
    })

    ipcMain.handle("syncUpdateMode", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdateMode", params)
    })

    ipcMain.handle("syncUpdatePaused", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdatePaused", params)
    })

    ipcMain.handle("syncUpdateRemoved", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdateRemoved", params)
    })

    ipcMain.handle("syncPauseTransfer", async (_, params) => {
        await ipc.desktop.worker.invoke("syncPauseTransfer", params)
    })

    ipcMain.handle("syncResumeTransfer", async (_, params) => {
        await ipc.desktop.worker.invoke("syncResumeTransfer", params)
    })

    ipcMain.handle("syncStopTransfer", async (_, params) => {
        await ipc.desktop.worker.invoke("syncStopTransfer", params)
    })

    ipcMain.handle("syncResetTaskErrors", async (_, params) => {
        await ipc.desktop.worker.invoke("syncResetTaskErrors", params)
    })

    ipcMain.handle("syncToggleLocalTrash", async (_, params) => {
        await ipc.desktop.worker.invoke("syncToggleLocalTrash", params)
    })

    ipcMain.handle("syncResetLocalTreeErrors", async (_, params) => {
        await ipc.desktop.worker.invoke("syncResetLocalTreeErrors", params)
    })

    ipcMain.handle("syncUpdatePairs", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdatePairs", params)
    })

    ipcMain.handle("syncUpdateConfirmDeletion", async (_, params) => {
        await ipc.desktop.worker.invoke("syncUpdateConfirmDeletion", params)
    })

    ipcMain.handle("isAllowedToSyncDirectory", async (_, path: string) => {
        try {
            const normalizedPath = pathModule.normalize(path)

            for (const disallowedDir of DISALLOWED_SYNC_DIRS) {
                if (normalizedPath.startsWith(pathModule.normalize(disallowedDir) + pathModule.sep)) {
                    return false
                }
            }

            if (normalizedPath.startsWith(os.tmpdir())) {
                return false
            }

            const stat = await fs.lstat(path)

            if (
                !stat.isDirectory() ||
                stat.isSymbolicLink() ||
                stat.isFile() ||
                stat.isBlockDevice() ||
                stat.isCharacterDevice() ||
                stat.isFIFO() ||
                stat.isSocket()
            ) {
                return false
            }

            return true
        } catch {
            return false
        }
    })
}
