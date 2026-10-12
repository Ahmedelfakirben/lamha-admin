"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Server, RefreshCw, XCircle, CheckCircle2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export function NasSyncWidget() {
  const [open, setOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState("Detenido")
  const [loading, setLoading] = useState(false)
  
  // Polling del estado de sincronización
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/nas-sync")
        const data = await res.json()
        setIsSyncing(data.isSyncing)
        setLogs(data.logs || [])
        setStatus(data.status)
      } catch (error) {
        console.error("Error fetching NAS sync status:", error)
      }
    }
    
    // Poll más frecuente si está abierto o si está sincronizando
    if (open || isSyncing) {
      fetchStatus()
      interval = setInterval(fetchStatus, 3000)
    } else {
      // Poll menos frecuente en background
      fetchStatus()
      interval = setInterval(fetchStatus, 15000)
    }
    
    return () => clearInterval(interval)
  }, [open, isSyncing])

  const handleStartSync = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/nas-sync", { method: "POST" })
      if (!res.ok) {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      } else {
        setIsSyncing(true)
      }
    } catch (error) {
      alert("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  const handleStopSync = async () => {
    if (!confirm("¿Seguro que deseas cancelar la sincronización al NAS?")) return
    
    setLoading(true)
    try {
      const res = await fetch("/api/nas-sync", { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      } else {
        setIsSyncing(false)
      }
    } catch (error) {
      alert("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border px-3 ${
          isSyncing 
            ? "bg-blue-600 border-blue-600 hover:bg-blue-700 text-white animate-pulse" 
            : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <Server className="h-4 w-4" />
        {isSyncing ? "Sincronizando NAS..." : "Sincronización NAS"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Sincronización NAS (Robocopy)
            {isSyncing ? (
              <Badge variant="default" className="bg-blue-500 ml-2">En progreso</Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">Detenido</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Copia de seguridad en segundo plano del SSD local al servidor NAS.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <div className="bg-black/90 p-4 rounded-md border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400 font-mono">Terminal Output</span>
              {isSyncing && <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />}
            </div>
            <div className="h-[250px] w-full rounded border border-gray-800 bg-black p-2 overflow-y-auto">
              <div className="font-mono text-xs text-green-400 whitespace-pre-wrap break-all flex flex-col gap-1">
                {logs.length === 0 ? (
                  <span className="text-gray-500">Esperando para iniciar sincronización...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`${log.includes("ERROR") || log.includes("❌") ? "text-red-400" : log.includes("✅") ? "text-blue-400" : ""}`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            {!isSyncing ? (
              <Button onClick={handleStartSync} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Iniciar Sincronización
              </Button>
            ) : (
              <Button onClick={handleStopSync} disabled={loading} variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" />
                Detener
              </Button>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground mt-2 flex items-start gap-2 bg-gray-50/50 dark:bg-gray-900/50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
            <p>
              La sincronización utiliza Robocopy con modo multihilo (MT:16). Copiará solo los archivos nuevos o modificados desde el disco de trabajo SSD al almacenamiento NAS en red. Puedes cerrar esta ventana y la copia continuará en segundo plano.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
