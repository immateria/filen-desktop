import { ipcMain } from "electron"
import { IPC } from "./index"

export function registerWebDAVHandlers(ipc: IPC): void {
    ipcMain.handle("startWebDAVServer", async () => {
        await ipc.desktop.worker.invoke("startWebDAV")
    })

    ipcMain.handle("stopWebDAVServer", async () => {
        await ipc.desktop.worker.invoke("stopWebDAV")
    })

    ipcMain.handle("restartWebDAVServer", async () => {
        await ipc.desktop.worker.invoke("restartWebDAV")
    })

    ipcMain.handle("isWebDAVOnline", async () => {
        return await ipc.desktop.worker.isWebDAVOnline()
    })

    ipcMain.handle("isWebDAVActive", async () => {
        return await ipc.desktop.worker.invoke("isWebDAVActive")
    })
}
