import { ipcMain } from "electron"
import { PauseSignal } from "@filen/sdk"
import { waitForConfig } from "../config"
import { v4 as uuidv4 } from "uuid"
import { IPC } from "./index"
import {
    type IPCPauseResumeAbortSignalParams,
    type IPCDownloadFileParams,
    type IPCDownloadDirectoryParams,
    type IPCDownloadMultipleFilesAndDirectoriesParams
} from "./types"

export function registerCloudHandlers(ipc: IPC): void {
    ipcMain.handle("pausePauseSignal", (_, { id }: IPCPauseResumeAbortSignalParams) => {
        if (!ipc.pauseSignals[id] || ipc.pauseSignals[id]!.isPaused()) {
            return
        }

        ipc.pauseSignals[id]!.pause()
    })

    ipcMain.handle("resumePauseSignal", (_, { id }: IPCPauseResumeAbortSignalParams) => {
        if (!ipc.pauseSignals[id] || !ipc.pauseSignals[id]!.isPaused()) {
            return
        }

        ipc.pauseSignals[id]!.resume()
    })

    ipcMain.handle("abortAbortSignal", (_, { id }: IPCPauseResumeAbortSignalParams) => {
        if (!ipc.abortControllers[id] || ipc.abortControllers[id]!.signal.aborted) {
            return
        }

        ipc.abortControllers[id]!.abort()

        delete ipc.abortControllers[id]
        delete ipc.pauseSignals[id]
    })

    ipcMain.handle("downloadFile", async (_, { item, to, dontEmitEvents, name }: IPCDownloadFileParams): Promise<string> => {
        if (item.type === "directory") {
            throw new Error("Invalid file type.")
        }

        await waitForConfig()

        if (!ipc.pauseSignals[item.uuid]) {
            ipc.pauseSignals[item.uuid] = new PauseSignal()
        }

        if (!ipc.abortControllers[item.uuid]) {
            ipc.abortControllers[item.uuid] = new AbortController()
        }

        try {
            return await ipc.desktop.lib.cloud.downloadFile({
                uuid: item.uuid,
                bucket: item.bucket,
                region: item.region,
                chunks: item.chunks,
                key: item.key,
                to,
                version: item.version,
                dontEmitEvents,
                size: item.size,
                name,
                pauseSignal: ipc.pauseSignals[item.uuid],
                abortSignal: ipc.abortControllers[item.uuid]!.signal
            })
        } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") {
                return ""
            }

            if (e instanceof Error) {
                ipc.desktop.ipc.postMainToWindowMessage({
                    type: "download",
                    data: {
                        type: "error",
                        uuid: item.uuid,
                        name,
                        size: item.size,
                        err: e,
                        fileType: "file"
                    }
                })
            }

            throw e
        } finally {
            delete ipc.pauseSignals[item.uuid]
            delete ipc.abortControllers[item.uuid]
        }
    })

    ipcMain.handle(
        "downloadDirectory",
        async (
            _,
            { uuid, name, to, type, linkUUID, linkHasPassword, linkPassword, linkSalt, linkKey }: IPCDownloadDirectoryParams
        ): Promise<string> => {
            await waitForConfig()

            if (!ipc.pauseSignals[uuid]) {
                ipc.pauseSignals[uuid] = new PauseSignal()
            }

            if (!ipc.abortControllers[uuid]) {
                ipc.abortControllers[uuid] = new AbortController()
            }

            try {
                return await ipc.desktop.lib.cloud.downloadDirectory({
                    uuid,
                    name,
                    linkUUID,
                    linkHasPassword,
                    linkPassword,
                    linkSalt,
                    to,
                    type,
                    pauseSignal: ipc.pauseSignals[uuid],
                    abortSignal: ipc.abortControllers[uuid]!.signal,
                    linkKey
                })
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") {
                    return ""
                }

                if (e instanceof Error) {
                    ipc.desktop.ipc.postMainToWindowMessage({
                        type: "download",
                        data: {
                            type: "error",
                            uuid,
                            name,
                            size: 0,
                            err: e,
                            fileType: "directory"
                        }
                    })
                }

                throw e
            } finally {
                delete ipc.pauseSignals[uuid]
                delete ipc.abortControllers[uuid]
            }
        }
    )

    ipcMain.handle(
        "downloadMultipleFilesAndDirectories",
        async (
            _,
            {
                items,
                to,
                type,
                linkUUID,
                linkHasPassword,
                linkPassword,
                linkSalt,
                name,
                linkKey
            }: IPCDownloadMultipleFilesAndDirectoriesParams
        ): Promise<string> => {
            await waitForConfig()

            const directoryId = uuidv4()

            if (!ipc.pauseSignals[directoryId]) {
                ipc.pauseSignals[directoryId] = new PauseSignal()
            }

            if (!ipc.abortControllers[directoryId]) {
                ipc.abortControllers[directoryId] = new AbortController()
            }

            try {
                return await ipc.desktop.lib.cloud.downloadMultipleFilesAndDirectories({
                    items: items.map(item => ({
                        ...item,
                        path: item.name
                    })),
                    linkUUID,
                    linkHasPassword,
                    linkPassword,
                    linkSalt,
                    to,
                    type,
                    name,
                    directoryId,
                    pauseSignal: ipc.pauseSignals[directoryId],
                    abortSignal: ipc.abortControllers[directoryId]!.signal,
                    linkKey
                })
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") {
                    return ""
                }

                if (e instanceof Error) {
                    ipc.desktop.ipc.postMainToWindowMessage({
                        type: "download",
                        data: {
                            type: "error",
                            uuid: directoryId,
                            name,
                            size: 0,
                            err: e,
                            fileType: "directory"
                        }
                    })
                }

                throw e
            } finally {
                delete ipc.pauseSignals[directoryId]
                delete ipc.abortControllers[directoryId]
            }
        }
    )
}
