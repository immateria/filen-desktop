import { ipcMain } from "electron"
import { IPC } from "./index"

export function registerS3Handlers(ipc: IPC): void {
    ipcMain.handle("startS3Server", async () => {
        await ipc.desktop.worker.invoke("startS3")
    })

    ipcMain.handle("stopS3Server", async () => {
        await ipc.desktop.worker.invoke("stopS3")
    })

    ipcMain.handle("restartS3Server", async () => {
        await ipc.desktop.worker.invoke("restartS3")
    })

    ipcMain.handle("isS3Online", async () => {
        return await ipc.desktop.worker.isS3Online()
    })

    ipcMain.handle("isS3Active", async () => {
        return await ipc.desktop.worker.invoke("isS3Active")
    })
}
