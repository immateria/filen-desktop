import { type DriveCloudItem } from "../types"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"
import { type SyncMessage } from "@filen/sync/dist/types"
import { type SerializedError } from "../utils"
import { type ProgressInfo, type UpdateDownloadedEvent } from "electron-updater"

export type IPCDownloadFileParams = {
	item: DriveCloudItem
	to: string
	dontEmitEvents?: boolean
	name: string
}

export type IPCDownloadDirectoryParams = {
	uuid: string
	name: string
	to: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	dontEmitEvents?: boolean
	linkKey?: string
}

export type IPCDownloadMultipleFilesAndDirectoriesParams = {
	items: DriveCloudItem[]
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	dontEmitEvents?: boolean
	to: string
	name: string
	dontEmitQueuedEvent?: boolean
	linkKey?: string
}

export type IPCShowSaveDialogResult =
	| {
			cancelled: true
	  }
	| {
			cancelled: false
			path: string
			name: string
	  }

export type IPCSelectDirectoryResult =
	| {
			cancelled: true
	  }
	| {
			cancelled: false
			paths: string[]
	  }

export type IPCShowSaveDialogResultParams = {
	nameSuggestion?: string
}

export type MainToWindowMessage =
	| {
			type: "download" | "upload"
			data: { uuid: string; name: string; fileType: "file" | "directory" } & (
				| {
						type: "started"
						size: number
				  }
				| {
						type: "queued"
				  }
				| {
						type: "finished"
						size: number
				  }
				| {
						type: "progress"
						bytes: number
				  }
				| {
						type: "error"
						err: Error
						size: number
				  }
				| {
						type: "stopped"
						size: number
				  }
				| {
						type: "paused"
				  }
				| {
						type: "resumed"
				  }
			)
	  }
	| {
			type: "shareProgress"
			done: number
			total: number
			requestUUID: string
	  }
	| {
			type: "sync"
			message: SyncMessage
	  }
	| {
			type: "updater"
			data:
				| {
						type: "checkingForUpdate" | "updateAvailable" | "updateNotAvailable" | "updateCancelled"
				  }
				| {
						type: "error"
						error: SerializedError
				  }
				| {
						type: "downloadProgress"
						progress: ProgressInfo
				  }
				| {
						type: "updateDownloaded"
						info: UpdateDownloadedEvent
				  }
	  }


export type IPCPauseResumeAbortSignalParams = {
        id: string
}

export type IPCCanStartServerOnIPAndPort = {
        ip: string
        port: number
}
