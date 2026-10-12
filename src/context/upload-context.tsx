"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"
import { useLanguage } from "@/context/language-context"

export type UploadState = {
  isRunning: boolean
  currentFile: string
  current: number
  total: number
  percent: number
  totalMb: number
  uploadedMb: number
  etaMinutes: number | null
  logs: Array<{ time: string; level: string; msg: string }>
}

type UploadContextType = {
  uploadState: UploadState
  startSyncNasToGdrive: (params: { sessionId: string; folderName: string; clientName: string; retentionDays: number }, onComplete?: () => void) => Promise<void>
  dismissUpload: () => void
}

const defaultState: UploadState = {
  isRunning: false,
  currentFile: "",
  current: 0,
  total: 0,
  percent: 0,
  totalMb: 0,
  uploadedMb: 0,
  etaMinutes: null,
  logs: [],
}

const UploadContext = createContext<UploadContextType | undefined>(undefined)

export function UploadProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage()
  const [uploadState, setUploadState] = useState<UploadState>(defaultState)

  const dismissUpload = useCallback(() => {
    setUploadState(defaultState)
  }, [])

  const startSyncNasToGdrive = useCallback(async (params: { sessionId: string; folderName: string; clientName: string; retentionDays: number }, onComplete?: () => void) => {
    setUploadState({
      isRunning: true,
      currentFile: t.connectingDriveAndPrep,
      current: 0,
      total: 0,
      percent: 0,
      totalMb: 0,
      uploadedMb: 0,
      etaMinutes: null,
      logs: [{ time: new Date().toLocaleTimeString(), level: "info", msg: t.startingDriveGateway }]
    })

    try {
      const res = await fetch("/api/deliveries/sync-nas-gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, lang: language }),
      })

      if (!res.body) throw new Error("No readable stream received")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let startTime = Date.now()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === "start") {
              startTime = Date.now()
              setUploadState(prev => ({
                ...prev,
                total: data.totalFiles,
                totalMb: data.totalMb,
                uploadedMb: 0,
                etaMinutes: null
              }))
            } else if (data.type === "progress") {
              const pct = (data.totalBytes && data.totalBytes > 0)
                ? Math.min(100, Math.round((data.bytesTransferred / data.totalBytes) * 100))
                : Math.round((data.current / data.total) * 100)

              const uploadedMb = data.bytesTransferred ? Number((data.bytesTransferred / (1024 * 1024)).toFixed(1)) : 0
              
              let etaMinutes = null
              if (data.bytesTransferred && data.totalBytes && data.bytesTransferred > 1024 * 50) {
                const elapsedSeconds = (Date.now() - startTime) / 1000
                if (elapsedSeconds > 3) {
                  const bytesPerSecond = data.bytesTransferred / elapsedSeconds
                  const bytesRemaining = data.totalBytes - data.bytesTransferred
                  if (bytesPerSecond > 0 && bytesRemaining > 0) {
                    const secondsRemaining = bytesRemaining / bytesPerSecond
                    etaMinutes = Math.max(1, Math.ceil(secondsRemaining / 60))
                  }
                }
              }

              setUploadState(prev => ({
                ...prev,
                current: data.current,
                total: data.total,
                currentFile: `[${data.current}/${data.total}] ${t.uploadingFileProgress} ${data.fileName} (${data.sizeMb} MB)...`,
                percent: pct,
                uploadedMb,
                etaMinutes
              }))
            } else if (data.type === "log") {
              setUploadState(prev => ({
                ...prev,
                logs: [...prev.logs, { time: data.time, level: data.level, msg: data.msg }]
              }))
            } else if (data.type === "completed") {
              setUploadState(prev => ({
                ...prev,
                percent: 100,
                currentFile: t.driveTransferSuccess,
                logs: [...prev.logs, { time: new Date().toLocaleTimeString(), level: "success", msg: `✅ ${data.totalFiles} ${t.photosUploadedCount}` }]
              }))
              if (onComplete) onComplete()
            } else if (data.type === "error") {
              setUploadState(prev => ({
                ...prev,
                currentFile: `❌ Error: ${data.error}`,
                logs: [...prev.logs, { time: new Date().toLocaleTimeString(), level: "error", msg: `❌ ${data.error}` }]
              }))
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setUploadState(prev => ({
        ...prev,
        currentFile: `❌ Error: ${e.message}`,
        logs: [...prev.logs, { time: new Date().toLocaleTimeString(), level: "error", msg: `❌ ${e.message}` }]
      }))
    }
  }, [])

  return (
    <UploadContext.Provider value={{ uploadState, startSyncNasToGdrive, dismissUpload }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload() {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider")
  }
  return context
}
