"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  HardDrive, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  FolderSync, 
  Camera, 
  Film, 
  FileCheck, 
  Sparkles, 
  RefreshCw, 
  FolderOpen,
  Folder,
  ArrowRight,
  Download,
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Phone,
  CheckSquare
} from "lucide-react"
import { useRouter } from "next/navigation"

import { useLanguage } from "@/context/language-context"
import { getExistingClients, ExistingClientOption } from "@/app/actions"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { selectNativeFolder, getConnectedCards } from "@/lib/desktop-bridge"

interface IngestDialogProps {
  defaultSessionId?: string
  defaultClientName?: string
  defaultProjectName?: string
  onComplete?: () => void
  triggerVariant?: "primary" | "secondary" | "button"
  triggerLabel?: string
  triggerClassName?: string
}

interface IngestLog {
  timestamp: string
  level: "info" | "success" | "warn" | "error"
  message: string
}

export interface ConnectedDrive {
  id: string              // e.g. "C:", "E:", "/Volumes/SSD"
  mountPath: string       // e.g. "C:\\", "E:\\", "/Volumes/SSD"
  label: string           // e.g. "ELFAKIR", "Disco del Sistema"
  totalGB: number
  freeGB: number
  usedGB: number
  percentFree: number
  isRemovable: boolean
  hasDcim: boolean
  dcimPath?: string
  isSystemDrive: boolean
}

export function IngestDialog({
  defaultSessionId,
  defaultClientName,
  defaultProjectName,
  onComplete,
  triggerVariant = "primary",
  triggerLabel,
  triggerClassName,
}: IngestDialogProps) {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"configure" | "processing" | "finished">("configure")

  // Form State: Strictly assigned to the current session
  const mode = "existing" as const
  const [sessionId, setSessionId] = useState(defaultSessionId || "")
  const [projectName, setProjectName] = useState(defaultProjectName || "")
  const [clientName, setClientName] = useState(defaultClientName || "")

  useEffect(() => {
    if (defaultSessionId) {
      setSessionId(defaultSessionId)
    }
  }, [defaultSessionId, open])
  const [clientPhone, setClientPhone] = useState("")
  const [sessionType, setSessionType] = useState<"photo" | "video">("photo")
  const [category, setCategory] = useState("wedding")
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0])

  // Existing Clients & Sessions Autocomplete State
  const [existingClients, setExistingClients] = useState<ExistingClientOption[]>([])
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<ExistingClientOption | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [clientSelectMode, setClientSelectMode] = useState<"existing" | "new">(
    defaultClientName ? "new" : "existing"
  )
  const [existingSessionsList, setExistingSessionsList] = useState<any[]>([])
  const [sessionSearchQuery, setSessionSearchQuery] = useState("")

  // Source path
  const [sourcePath, setSourcePath] = useState("E:\\DCIM")
  const [detectedSources, setDetectedSources] = useState<Array<{ path: string; label: string; fileCount: number }>>([])
  const [sourceScan, setSourceScan] = useState<any>(null)
  const [scanningSource, setScanningSource] = useState(false)

  // Target SSD / Storage destination states
  const [connectedDrives, setConnectedDrives] = useState<ConnectedDrive[]>([])
  const [loadingDrives, setLoadingDrives] = useState(false)
  const [targetBasePath, setTargetBasePath] = useState("")
  const [targetDriveId, setTargetDriveId] = useState("")

  // File & Folder Explorer Modal State (Windows & macOS)
  const [explorerModal, setExplorerModal] = useState<{
    open: boolean
    mode: "folder" | "files"
    target: "source" | "target"
  }>({
    open: false,
    mode: "files",
    target: "source"
  })
  const [selectedFiles, setSelectedFiles] = useState<string[] | undefined>(undefined)

  const handleExplorerSelect = (selectedFolder: string, filesList?: string[]) => {
    if (explorerModal.target === "source") {
      setSourcePath(selectedFolder)
      setSelectedFiles(filesList)
      scanSpecificPath(selectedFolder)
    } else {
      setTargetBasePath(selectedFolder)
      if (typeof window !== "undefined") {
        localStorage.setItem("lamha_ingest_target_path", selectedFolder)
      }
      const match = connectedDrives.find(d => selectedFolder.toUpperCase().startsWith(d.id.toUpperCase()))
      if (match) setTargetDriveId(match.id)
    }
  }

  // Desktop Ingest Companion Bridge (Local HTTP :41890 & lamha:// Protocol)
  const [companionStatus, setCompanionStatus] = useState<{
    connected: boolean
    activeCards?: Array<{ drive: string; label: string; count: number; dcimPath?: string }>
    isIngesting?: boolean
  } | null>(null)

  const checkCompanion = async () => {
    // 1. Detección directa desde el puente de la App de Escritorio Electron
    try {
      const nativeCards = await getConnectedCards()
      if (nativeCards && nativeCards.length > 0) {
        setCompanionStatus(prev => ({
          connected: prev?.connected ?? true,
          activeCards: nativeCards.map(c => ({
            drive: c.drive,
            label: `Tarjeta (${c.letter}:) - ${c.count} fotos`,
            count: c.count,
            dcimPath: c.path,
          })),
          isIngesting: prev?.isIngesting ?? false,
        }))
        const firstCard = nativeCards[0]
        const cardPath = firstCard.path || firstCard.drive
        setSourcePath(prev => {
          if (!prev || prev === "E:\\DCIM") {
            scanSpecificPath(cardPath)
            return cardPath
          }
          return prev
        })
      }
    } catch {}

    // 2. Comprobar Ingest Companion HTTP :41890
    try {
      const res = await fetch("http://127.0.0.1:41890/status", { cache: "no-store", signal: AbortSignal.timeout(1500) })
      if (res.ok) {
        const data = await res.json()
        setCompanionStatus({
          connected: true,
          activeCards: data.activeCards || [],
          isIngesting: data.isIngesting || false
        })
        if (data.activeCards && data.activeCards.length > 0) {
          const firstCard = data.activeCards[0]
          const cardPath = firstCard.dcimPath || firstCard.drive
          setSourcePath(prev => {
            if (!prev || prev === "E:\\DCIM") {
              scanSpecificPath(cardPath)
              return cardPath
            }
            return prev
          })
        }
        return
      }
    } catch {}
    
    // Si no hay companion ni cartas nativas
    setCompanionStatus(prev => prev?.activeCards?.length ? prev : { connected: false })
  }

  const handleNativeFolderPicker = async () => {
    if (typeof window !== "undefined" && window.desktopAdminAPI?.selectFolder) {
      const picked = await selectNativeFolder("Seleccionar Tarjeta SD o Carpeta de Cámara en este PC")
      if (picked) {
        setSourcePath(picked)
        scanSpecificPath(picked)
        return
      }
    }
    folderInputRef.current?.click()
  }

  useEffect(() => {
    if (open) {
      checkCompanion()
    }
  }, [open])

  const handleLaunchDesktopIngest = async () => {
    const targetSessionId = sessionId || defaultSessionId
    if (!targetSessionId) {
      alert("Por favor selecciona o confirma una sesión primero.")
      return
    }

    if (companionStatus?.connected) {
      try {
        const res = await fetch("http://127.0.0.1:41890/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: targetSessionId,
            clientName: clientName || defaultClientName,
            sourcePath: sourcePath && !sourcePath.startsWith("📁") ? sourcePath.trim() : undefined,
            uploadSupabase: true,
            syncNas: true,
          })
        })
        if (res.ok) {
          setOpen(false)
          return
        }
      } catch (e) {
        console.warn("Fallo lanzando HTTP local, intentando protocolo:", e)
      }
    }

    // Protocolo de sistema lamha://
    const protocolUrl = `lamha://ingest?session_id=${encodeURIComponent(targetSessionId)}&client_name=${encodeURIComponent(clientName || defaultClientName || "")}&auto=true`
    window.location.href = protocolUrl
    setTimeout(() => {
      setOpen(false)
    }, 400)
  }

  // Progress & Logs
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentFileText, setCurrentFileText] = useState("")
  const [logs, setLogs] = useState<IngestLog[]>([])
  const [resultSummary, setResultSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [speedInfo, setSpeedInfo] = useState("")

  const logsEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleNativeFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files)

    const firstRel = fileList[0].webkitRelativePath || ""
    const folderName = firstRel.split("/")[0] || "DCIM"

    let photoCount = 0
    let videoCount = 0
    let totalBytes = 0
    const photoExts = new Set([".cr2", ".cr3", ".nef", ".arw", ".dng", ".jpg", ".jpeg", ".png", ".heic", ".raw", ".tif", ".tiff"])
    const videoExts = new Set([".mp4", ".mov", ".mxf", ".avi", ".mkv", ".braw", ".r3d", ".crm"])

    for (const f of fileList) {
      totalBytes += f.size
      const dot = f.name.lastIndexOf(".")
      const ext = dot !== -1 ? f.name.substring(dot).toLowerCase() : ""
      if (photoExts.has(ext)) photoCount++
      else if (videoExts.has(ext)) videoCount++
    }

    const displayPath = `📁 [Carpeta Local / SD]: ${folderName}`
    setSourcePath(displayPath)
    setSourceScan({
      exists: true,
      path: displayPath,
      photoCount,
      videoCount,
      totalSizeMB: Math.round(totalBytes / (1024 * 1024))
    })
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // Limpiar el polling si se desmonta el componente
  useEffect(() => stopPolling, [])

  // Escanear fuentes disponibles y cargar clientes al abrir
  useEffect(() => {
    let isMounted = true
    async function loadClientAndSessionData() {
      try {
        const res = await getExistingClients()
        if (isMounted && res.success) {
          setExistingClients(res.clients)
          if (defaultClientName) {
            const match = res.clients.find(c => c.name.toLowerCase() === defaultClientName.toLowerCase())
            if (match) {
              setSelectedClient(match)
              setClientSelectMode("existing")
            }
          }
        }
      } catch (err) {
        console.error("Error loading existing clients for ingest:", err)
      }

      try {
        const supabase = createClient()
        const { data: sessData } = await supabase
          .from("sessions")
          .select("id, client_name, session_date, category, session_type")
          .order("session_date", { ascending: false })
          .limit(50)
        if (isMounted && sessData) {
          setExistingSessionsList(sessData)
        }
      } catch (err) {
        console.error("Error loading sessions for ingest:", err)
      }
    }

    if (open) {
      scanAvailableDrives()
      loadClientAndSessionData()
    } else {
      // Reset al cerrar
      if (step === "finished") {
        setStep("configure")
        setProgressPercent(0)
        setLogs([])
      }
    }
    return () => { isMounted = false }
  }, [open, defaultClientName])

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return existingClients.slice(0, 10)
    }
    const q = clientSearchQuery.toLowerCase().trim()
    return existingClients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q)) || 
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 12)
  }, [existingClients, clientSearchQuery])

  const duplicateClientSuggestion = useMemo(() => {
    if (clientSelectMode !== "new" || !clientName || clientName.trim().length < 2) {
      return null
    }
    const typed = clientName.trim().toLowerCase()
    return existingClients.find(c => c.name.toLowerCase() === typed || c.name.toLowerCase().startsWith(typed))
  }, [clientSelectMode, clientName, existingClients])

  const filteredSessions = useMemo(() => {
    if (!sessionSearchQuery.trim()) {
      return existingSessionsList.slice(0, 15)
    }
    const q = sessionSearchQuery.toLowerCase().trim()
    return existingSessionsList.filter(s =>
      s.client_name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.session_date?.includes(q) ||
      s.id?.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [existingSessionsList, sessionSearchQuery])

  const selectedSession = useMemo(() => {
    const targetId = sessionId || defaultSessionId
    if (!targetId) return null
    const found = existingSessionsList.find(s => s.id === targetId)
    if (found) return found
    return {
      id: targetId,
      client_name: defaultClientName || "Session",
      category: defaultProjectName || "Session",
      session_type: sessionType || "photo",
      session_date: ""
    }
  }, [sessionId, defaultSessionId, existingSessionsList, defaultClientName, defaultProjectName, sessionType])

  const handleSelectClient = (c: ExistingClientOption) => {
    setSelectedClient(c)
    setClientName(c.name)
    if (c.phone) setClientPhone(c.phone)
    if (!projectName.trim()) {
      setProjectName(`${c.name} - Ingestion`)
    }
    setShowClientDropdown(false)
    setClientSearchQuery("")
  }

  const handleClearSelectedClient = () => {
    setSelectedClient(null)
    setClientName("")
    setClientPhone("")
  }

  // Auto-scroll logs terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const scanAvailableDrives = async () => {
    setLoadingDrives(true)
    try {
      // 1. Consultar unidades físicas conectadas en tiempo real
      let drivesList: ConnectedDrive[] = []
      try {
        const drivesRes = await fetch("/api/media/drives", { cache: "no-store" })
        const drivesData = await drivesRes.json()
        if (drivesData.success && Array.isArray(drivesData.drives)) {
          drivesList = drivesData.drives
          setConnectedDrives(drivesList)
        }
      } catch (err) {
        console.error("Error al obtener drives:", err)
      }

      // 2. Resolver ruta y disco destino (SSD de trabajo)
      const savedTargetPath = typeof window !== "undefined" ? localStorage.getItem("lamha_ingest_target_path") : null
      if (savedTargetPath && savedTargetPath.trim()) {
        setTargetBasePath(savedTargetPath)
        const match = drivesList.find(d => savedTargetPath.toUpperCase().startsWith(d.id.toUpperCase()))
        if (match) setTargetDriveId(match.id)
      } else if (drivesList.length > 0) {
        // Preferir el primer disco externo/removible no-sistema con espacio libre
        const external = drivesList.find(d => !d.isSystemDrive && d.freeGB > 10) || drivesList.find(d => !d.isSystemDrive) || drivesList[0]
        if (external) {
          const sep = external.mountPath.endsWith("\\") || external.mountPath.endsWith("/") ? "" : "\\"
          const defaultTarget = `${external.mountPath}${sep}Lamha-Storage`
          setTargetBasePath(defaultTarget)
          setTargetDriveId(external.id)
        }
      }

      // 3. Consultar fuentes (tarjeta SD / carpetas DCIM)
      try {
        const ingestRes = await fetch("/api/ingest", { cache: "no-store" })
        const ingestData = await ingestRes.json()
        if (ingestData.detectedSources && ingestData.detectedSources.length > 0) {
          setDetectedSources(ingestData.detectedSources)
          // Si el usuario no ha especificado una ruta válida de origen aún, sugerir la primera detectada
          setSourcePath(prev => {
            if (!prev || prev === "E:\\DCIM") {
              scanSpecificPath(ingestData.detectedSources[0].path)
              return ingestData.detectedSources[0].path
            }
            scanSpecificPath(prev)
            return prev
          })
        } else {
          setSourcePath(prev => {
            scanSpecificPath(prev)
            return prev
          })
        }
      } catch (err) {
        console.error("Error consultando api/ingest:", err)
      }
    } catch (e) {
      console.error("Error escaneando unidades:", e)
    } finally {
      setLoadingDrives(false)
    }
  }

  const scanSpecificPath = async (pathToScan: string) => {
    if (!pathToScan || pathToScan.trim().length === 0) {
      setSourceScan(null)
      return
    }
    if (pathToScan.startsWith("📁")) {
      return // Ya validado localmente desde el navegador del usuario
    }
    setScanningSource(true)
    try {
      const res = await fetch(`/api/ingest?path=${encodeURIComponent(pathToScan)}`)
      const data = await res.json()
      setSourceScan(data)
    } catch (e) {
      console.error("Error verificando ruta:", e)
      setSourceScan(null)
    } finally {
      setScanningSource(false)
    }
  }

  const formatEta = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return t.calculatingEta
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}min ${String(s).padStart(2, "0")}s`
  }

  // Consulta el estado del job en segundo plano (la copia ya no depende de la petición HTTP)
  const pollProgress = async () => {
    try {
      const res = await fetch("/api/ingest/progress", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()

      if (typeof data.percent === "number" && data.percent > 0) {
        setProgressPercent(prev => Math.max(prev, data.percent))
      }

      if (data.logs && data.logs.length > 0) {
        setLogs(data.logs)
      }

      if (data.phase === "copying" && data.total > 0) {
        const doneMB = (data.bytesCopied / (1024 * 1024)).toFixed(0)
        const totalMB = (data.bytesTotal / (1024 * 1024)).toFixed(0)
        setCurrentFileText(`[${data.current}/${data.total}] ${data.currentFile || ""}`)
        setSpeedInfo(
          `${doneMB} / ${totalMB} MB · ${Number(data.speedMBps || 0).toFixed(1)} MB/s · ${t.remainingWord} ${formatEta(data.etaSec)}`
        )
      } else if (data.phase === "syncing") {
        setCurrentFileText(t.syncingWithCloud)
        setSpeedInfo("")
      } else if (data.logs && data.logs.length > 0) {
        setCurrentFileText(data.logs[data.logs.length - 1].message)
      }

      if (data.status === "completed") {
        stopPolling()
        setProgressPercent(100)
        setCurrentFileText(t.copyCompletedDesc)
        setSpeedInfo("")
        setResultSummary({
          sessionId: data.sessionId,
          projectRootPath: data.projectRootPath,
          stats: data.stats
        })
        setStep("finished")
        setLoading(false)
        if (onComplete) onComplete()
        router.refresh()
      } else if (data.status === "error") {
        stopPolling()
        setLoading(false)
        setSpeedInfo("")
        alert(`Error: ${data.error || "Error"}`)
        setStep("configure")
      }
    } catch (e) {}
  }

  const handleSelectTargetDrive = (drive: ConnectedDrive) => {
    setTargetDriveId(drive.id)
    const sep = drive.mountPath.endsWith("\\") || drive.mountPath.endsWith("/") ? "" : "\\"
    const newPath = `${drive.mountPath}${sep}Lamha-Storage`
    setTargetBasePath(newPath)
    if (typeof window !== "undefined") {
      localStorage.setItem("lamha_ingest_target_path", newPath)
    }
  }

  const handleTargetBasePathChange = (newPath: string) => {
    setTargetBasePath(newPath)
    if (typeof window !== "undefined") {
      localStorage.setItem("lamha_ingest_target_path", newPath)
    }
    const match = connectedDrives.find(d => newPath.toUpperCase().startsWith(d.id.toUpperCase()))
    if (match) {
      setTargetDriveId(match.id)
    }
  }

  const handleSelectSourceDrive = (drive: ConnectedDrive) => {
    const chosen = drive.dcimPath || drive.mountPath
    setSourcePath(chosen)
    scanSpecificPath(chosen)
  }

  // Detección de colisión (mismo disco en origen y destino)
  const sourceRoot = useMemo(() => {
    if (!sourcePath) return ""
    const winMatch = sourcePath.match(/^([a-zA-Z]:)/i)
    if (winMatch) return winMatch[1].toUpperCase()
    if (sourcePath.startsWith("/Volumes/")) {
      const parts = sourcePath.split("/")
      return parts.slice(0, 3).join("/")
    }
    return ""
  }, [sourcePath])

  const targetRoot = useMemo(() => {
    if (!targetBasePath) return ""
    const winMatch = targetBasePath.match(/^([a-zA-Z]:)/i)
    if (winMatch) return winMatch[1].toUpperCase()
    if (targetBasePath.startsWith("/Volumes/")) {
      const parts = targetBasePath.split("/")
      return parts.slice(0, 3).join("/")
    }
    return ""
  }, [targetBasePath])

  const isSameDriveCollision = useMemo(() => {
    if (!sourceRoot || !targetRoot) return false
    return sourceRoot === targetRoot
  }, [sourceRoot, targetRoot])

  const isExactSamePath = useMemo(() => {
    if (!sourcePath || !targetBasePath) return false
    return sourcePath.trim().toLowerCase().replace(/[\\/]+$/, "") === 
           targetBasePath.trim().toLowerCase().replace(/[\\/]+$/, "")
  }, [sourcePath, targetBasePath])

  // Verificación de espacio libre en disco destino
  const targetDriveInfo = useMemo(() => {
    return connectedDrives.find(d => targetBasePath.toUpperCase().startsWith(d.id.toUpperCase()))
  }, [connectedDrives, targetBasePath])

  const spaceWarning = useMemo(() => {
    if (!targetDriveInfo || !sourceScan?.totalSizeBytes) return null
    const neededGB = sourceScan.totalSizeBytes / (1024 ** 3)
    if (neededGB > targetDriveInfo.freeGB) {
      return {
        isCritical: true,
        neededGB: neededGB.toFixed(1),
        freeGB: targetDriveInfo.freeGB.toFixed(1),
        message: `Espacio insuficiente en ${targetDriveInfo.id} (${targetDriveInfo.label}). Se requieren ${neededGB.toFixed(1)} GB pero solo quedan ${targetDriveInfo.freeGB} GB libres.`
      }
    }
    if (targetDriveInfo.freeGB < 10) {
      return {
        isCritical: false,
        neededGB: neededGB.toFixed(1),
        freeGB: targetDriveInfo.freeGB.toFixed(1),
        message: `Queda poco espacio libre en ${targetDriveInfo.id} (${targetDriveInfo.freeGB} GB restantes).`
      }
    }
    return null
  }, [targetDriveInfo, sourceScan])

  const isStartDisabled = useMemo(() => {
    if (loading) return true
    if (!sourcePath.trim()) return true
    if (!targetBasePath.trim()) return true
    if (isExactSamePath) return true
    if (spaceWarning && spaceWarning.isCritical) return true
    if (!sessionId && !defaultSessionId) return true
    return false
  }, [loading, sourcePath, targetBasePath, isExactSamePath, spaceWarning, sourceScan, sessionId, defaultSessionId])

  const handleStartIngest = async () => {
    if (!sourcePath.trim()) {
      alert("Por favor especifica la ruta de la tarjeta SD o carpeta de origen.")
      return
    }

    if (!targetBasePath.trim()) {
      alert("Por favor selecciona o especifica la ruta del SSD de destino.")
      return
    }

    if (isExactSamePath) {
      alert("Error: La carpeta de origen y la de destino no pueden ser la misma.")
      return
    }

    if (spaceWarning?.isCritical) {
      alert(`Espacio insuficiente: ${spaceWarning.message}`)
      return
    }

    if (!sessionId && !defaultSessionId) {
      alert("No se ha detectado una sesión válida para la ingesta.")
      return
    }

    // Guardar la ruta del SSD en localStorage para futuros proyectos
    if (typeof window !== "undefined") {
      localStorage.setItem("lamha_ingest_target_path", targetBasePath.trim())
    }

    setStep("processing")
    setLoading(true)
    setProgressPercent(5)
    setSpeedInfo("")
    setCurrentFileText(t.checkingSourceAndFolders)
    setLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `${t.startingIngestFrom} ${sourcePath}`
      },
      {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `${t.writingToSsd} ${targetBasePath}`
      }
    ])

    try {
      // El POST responde al instante: la copia corre desacoplada en el servidor
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: sourcePath.trim(),
          targetBasePath: targetBasePath.trim(),
          mode: "existing",
          sessionId: sessionId || defaultSessionId,
          sessionType,
          category,
          sessionDate,
          selectedFiles,
          lang: language
        })
      })

      const data = await response.json()

      // 409: ya hay una ingesta en curso -> nos enganchamos a ella en lugar de fallar
      if (!response.ok && !data.alreadyRunning) {
        throw new Error(data.error || "Error al iniciar la ingesta")
      }

      stopPolling()
      pollRef.current = setInterval(pollProgress, 1000)
      pollProgress()
    } catch (error: any) {
      stopPolling()
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: "error",
          message: `Fallo de ejecución: ${error.message}`
        }
      ])
      alert(`Error en la ingesta: ${error.message}`)
      setLoading(false)
      setStep("configure")
    }
  }

  const handleRevealFolder = async (folderPath: string) => {
    try {
      await fetch("/api/media/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: folderPath, mode: "reveal" })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const downloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ingest_log_${new Date().toISOString().split("T")[0]}.txt`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        className={triggerClassName || (triggerVariant === "primary"
          ? "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-md hover:shadow-[#c69f68]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          : "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#c69f68]/40 hover:bg-[#c69f68]/10 text-[#c69f68] font-medium text-xs transition-colors cursor-pointer"
        )}
      >
        {triggerVariant === "primary" ? (
          <>
            <HardDrive className="w-3.5 h-3.5 text-[#0b0a09]" />
            <span>{triggerLabel || t.ingestFromSdCard}</span>
          </>
        ) : (
          <>
            <FolderSync className="w-3.5 h-3.5" />
            <span>{triggerLabel || t.ingestSd}</span>
          </>
        )}
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-2xl bg-[#141210] border border-[#26211c] text-[#f5f2eb] p-4 sm:p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-[#26211c] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-[#f5f2eb]">
                {t.ingestTitle}
              </DialogTitle>
              <p className="text-xs text-[#8c7a6b]">
                {t.ingestSubtitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* PASO 1: CONFIGURACIÓN */}
        {step === "configure" && (
          <div className="space-y-6 pt-2">


            {/* Asignación a esta sesión */}
            <div className="p-4 rounded-xl bg-[#181613] border border-[#26211c] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wider text-[#c69f68] font-semibold flex items-center gap-2">
                  <FolderSync className="w-3.5 h-3.5 text-[#c69f68]" />
                  <span>{t.assignToThisSession}</span>
                </label>
                {(sessionId || defaultSessionId) && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    ✓ ID: {(sessionId || defaultSessionId)?.slice(0, 8)}...
                  </span>
                )}
              </div>

              {selectedSession ? (
                <div className="p-3.5 rounded-xl bg-[#0b0a09] border border-[#c69f68] flex items-center justify-between gap-3 shadow-lg shadow-[#c69f68]/10 animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#201c18] border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] shrink-0">
                      {selectedSession.session_type === "photo" ? (
                        <Camera className="w-4 h-4 text-[#c69f68]" />
                      ) : (
                        <Film className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f5f2eb] truncate">
                          {selectedSession.client_name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ✓ {t.assignedBadge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8c7a6b] flex items-center gap-2 truncate mt-0.5">
                        {selectedSession.category && (
                          <span className="capitalize text-[#c69f68] font-medium">{selectedSession.category}</span>
                        )}
                        {selectedSession.session_date && (
                          <span>• {selectedSession.session_date}</span>
                        )}
                        <span className="font-mono text-[#554c42]">({selectedSession.id})</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#0b0a09] border border-[#c69f68] flex items-center justify-between gap-3 shadow-lg shadow-[#c69f68]/10 animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#201c18] border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] shrink-0">
                      <Camera className="w-4 h-4 text-[#c69f68]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f5f2eb] truncate">
                          {defaultClientName || "Session"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ✓ {t.assignedBadge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8c7a6b] flex items-center gap-2 truncate mt-0.5">
                        <span className="capitalize text-[#c69f68] font-medium">{defaultProjectName || ""}</span>
                        {defaultSessionId && (
                          <span className="font-mono text-[#554c42]">({defaultSessionId})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Selección de Origen (Tarjeta SD / Carpeta de la Cámara) */}
            <div className="space-y-3 p-4 rounded-xl bg-[#181613] border border-[#26211c]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#c69f68]" />
                  <label className="text-[11px] uppercase tracking-wider text-[#c69f68] font-semibold">
                    1. {t.sdOriginLabel}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={scanAvailableDrives}
                  disabled={loadingDrives}
                  className="text-[11px] text-[#8c7a6b] hover:text-[#c69f68] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className={cn("w-3 h-3", loadingDrives && "animate-spin text-[#c69f68]")} />
                  <span>{loadingDrives ? t.detectingBtn : t.rescanBtn}</span>
                </button>
              </div>

              {/* Botones rápidos de selección de unidad origen */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase text-[#70665a] block font-medium">
                  {t.detectedDrivesLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {connectedDrives.map((drive) => {
                    const isSelected = sourceRoot === drive.id.toUpperCase()
                    return (
                      <button
                        key={drive.id}
                        type="button"
                        onClick={() => handleSelectSourceDrive(drive)}
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-[#c69f68]/20 border-[#c69f68] text-[#c69f68] font-semibold shadow-sm shadow-[#c69f68]/10"
                            : "bg-[#0b0a09] border-[#26211c] text-[#a89f91] hover:border-[#70665a]"
                        )}
                      >
                        <span className="font-mono font-bold">{drive.id}</span>
                        <span className="truncate max-w-[100px]">{drive.label}</span>
                        {drive.hasDcim && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                            <Camera className="w-2.5 h-2.5" />
                            <span>DCIM</span>
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {/* Sugerencias adicionales de carpetas de origen detectadas */}
                  {detectedSources.filter(src => !connectedDrives.some(d => d.dcimPath === src.path || d.mountPath === src.path)).map((src) => (
                    <button
                      key={src.path}
                      type="button"
                      onClick={() => {
                        setSourcePath(src.path)
                        scanSpecificPath(src.path)
                      }}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer",
                        sourcePath === src.path
                          ? "bg-[#c69f68]/20 border-[#c69f68] text-[#c69f68] font-semibold"
                          : "bg-[#0b0a09] border-[#26211c] text-[#a89f91] hover:border-[#70665a]"
                      )}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input manual de ruta de origen */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={folderInputRef}
                  {...({ webkitdirectory: "", directory: "" } as any)}
                  multiple
                  className="hidden"
                  onChange={handleNativeFolderSelect}
                />
                <input
                  type="text"
                  placeholder="E:\DCIM o /Volumes/CAMARA/DCIM"
                  value={sourcePath}
                  onChange={(e) => {
                    setSourcePath(e.target.value)
                  }}
                  onBlur={() => scanSpecificPath(sourcePath)}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
                <button
                  type="button"
                  onClick={handleNativeFolderPicker}
                  className="px-3 py-2 text-xs rounded-lg bg-gradient-to-r from-[#201c18] to-[#171411] hover:from-[#2e2720] hover:to-[#221c17] border border-[#c69f68]/40 hover:border-[#c69f68] text-[#c69f68] font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Abrir selector de carpeta de tu Mac o PC"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{t.browseSourceBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => scanSpecificPath(sourcePath)}
                  disabled={scanningSource}
                  className="px-3 py-2 text-xs rounded-lg bg-[#201c18] border border-[#26211c] text-[#f5f2eb] hover:border-[#c69f68] transition-colors cursor-pointer"
                >
                  {scanningSource ? t.verifyingBtn : t.verifyBtn}
                </button>
              </div>

              {/* Indicador de archivos individuales seleccionados */}
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#c69f68]/10 border border-[#c69f68]/30 text-xs text-[#f5f2eb] animate-in fade-in">
                  <span className="flex items-center gap-1.5 text-[#c69f68] font-semibold">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedFiles.length} {t.filesSelectedCount}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(undefined)}
                    className="text-[11px] text-[#8c7a6b] hover:text-white underline cursor-pointer"
                  >
                    {t.selectAllFiles}
                  </button>
                </div>
              )}

              {/* Resumen del escaneo de origen */}
              {sourceScan && sourceScan.exists && (
                <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-[#a89f91] bg-[#0b0a09] p-2.5 rounded-lg border border-[#26211c]">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.unitReady}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-[#c69f68]" />
                    <span>{sourceScan.photoCount} {t.photosCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>{sourceScan.videoCount} {t.videosCount}</span>
                  </span>
                  <span className="text-[#d6cebf] font-mono">
                    ({sourceScan.totalSizeMB > 1024 ? `${(sourceScan.totalSizeMB / 1024).toFixed(1)} GB` : `${sourceScan.totalSizeMB} MB`})
                  </span>
                </div>
              )}
              {sourceScan && !sourceScan.exists && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{sourceScan.error || t.sourcePathNotExist}</span>
                </div>
              )}
            </div>

            {/* 2. Destino de Trabajo (SSD Externo de Producción / Local) */}
            <div className="space-y-3.5 p-4 rounded-xl bg-[#181613] border border-[#26211c]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#c69f68]" />
                  <label className="text-[11px] uppercase tracking-wider text-[#c69f68] font-semibold">
                    2. {t.targetSsdTitle}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={scanAvailableDrives}
                  disabled={loadingDrives}
                  className="text-[11px] text-[#8c7a6b] hover:text-[#c69f68] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className={cn("w-3 h-3", loadingDrives && "animate-spin text-[#c69f68]")} />
                  <span>{loadingDrives ? t.detectingBtn : t.refreshDrivesBtn}</span>
                </button>
              </div>

              <p className="text-[11px] text-[#8c7a6b]">
                {t.targetSsdDesc}
              </p>

              {/* Grid de unidades conectadas detectadas */}
              {connectedDrives.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {connectedDrives.map((drive) => {
                    const isSelected = targetDriveId === drive.id || (targetBasePath && targetBasePath.toUpperCase().startsWith(drive.id.toUpperCase()))
                    const isSourceDrive = sourceRoot === drive.id.toUpperCase()
                    
                    return (
                      <div
                        key={drive.id}
                        onClick={() => handleSelectTargetDrive(drive)}
                        className={cn(
                          "p-3 rounded-xl border text-left cursor-pointer transition-all relative",
                          isSelected
                            ? "bg-[#201c18] border-[#c69f68] shadow-md shadow-[#c69f68]/15 ring-1 ring-[#c69f68]/30"
                            : "bg-[#0b0a09] border-[#26211c] hover:border-[#70665a]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className={cn(
                              "font-mono font-bold text-xs px-1.5 py-0.5 rounded shrink-0",
                              isSelected ? "bg-[#c69f68] text-[#0b0a09]" : "bg-[#201c18] text-[#f5f2eb]"
                            )}>
                              {drive.id}
                            </span>
                            <span className="font-semibold text-xs text-[#f5f2eb] truncate" title={drive.label}>
                              {drive.label}
                            </span>
                          </div>
                          
                          {/* Insignia de tipo */}
                          {drive.isSystemDrive ? (
                            <span className="text-[10px] text-[#70665a] px-1.5 py-0.5 rounded bg-[#181613] shrink-0">
                              {t.systemDriveBadge}
                            </span>
                          ) : (
                            <span className="text-[10px] text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40 font-medium shrink-0">
                              {t.ssdExternalBadge}
                            </span>
                          )}
                        </div>

                        {/* Barra de espacio */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-[#8c7a6b]">
                            <span className={drive.freeGB < 15 ? "text-amber-400 font-medium" : "text-[#d6cebf]"}>
                              {drive.freeGB} GB {t.freeGBLabel}
                            </span>
                            <span className="text-[#554c42]">
                              {t.ofTotalLabel} {drive.totalGB} GB
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#141210] rounded-full overflow-hidden border border-[#26211c]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                drive.percentFree > 25 ? "bg-emerald-500" : drive.percentFree > 10 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${Math.min(100, Math.max(5, 100 - drive.percentFree))}%` }}
                            />
                          </div>
                        </div>

                        {/* Advertencia si esta unidad es el origen SD */}
                        {isSourceDrive && (
                          <div className="mt-2 text-[10px] text-amber-400/90 flex items-center gap-1 font-medium bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-800/30">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{t.sameDriveAsOrigin}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Input editable de ruta destino */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
                  {t.targetBasePathLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetBasePath}
                    onChange={(e) => handleTargetBasePathChange(e.target.value)}
                    placeholder="E:\Lamha-Storage"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTargetBasePathChange("/Volumes/Lamha-Storage")}
                      className="px-2 py-1 text-[11px] rounded bg-[#201c18] hover:bg-[#2e2720] border border-[#26211c] hover:border-[#c69f68] text-[#a89f91] hover:text-[#f5f2eb] flex items-center gap-1 transition-colors"
                      title="Ruta estándar para MacBook / macOS"
                    >
                      <span>🍏 Mac (/Volumes)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetBasePathChange("E:\\Lamha-Storage")}
                      className="px-2 py-1 text-[11px] rounded bg-[#201c18] hover:bg-[#2e2720] border border-[#26211c] hover:border-[#c69f68] text-[#a89f91] hover:text-[#f5f2eb] flex items-center gap-1 transition-colors"
                      title="Ruta estándar para Windows (Unidad E:)"
                    >
                      <span>🪟 Windows (E:)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetBasePathChange("D:\\Lamha-Storage")}
                      className="px-2 py-1 text-[11px] rounded bg-[#201c18] hover:bg-[#2e2720] border border-[#26211c] hover:border-[#c69f68] text-[#a89f91] hover:text-[#f5f2eb] flex items-center gap-1 transition-colors"
                      title="Ruta para Windows (Unidad D:)"
                    >
                      <span>🪟 Windows (D:)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetBasePathChange("/usb1_1/Lamha-Storage")}
                      className="px-2 py-1 text-[11px] rounded bg-[#201c18] hover:bg-[#2e2720] border border-[#26211c] hover:border-[#c69f68] text-[#a89f91] hover:text-[#f5f2eb] flex items-center gap-1 transition-colors"
                      title="Almacenamiento en NAS Router ZTE"
                    >
                      <span>🌐 NAS ZTE</span>
                    </button>
                  </div>
                  {connectedDrives.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetDrive = connectedDrives.find(d => targetBasePath.toUpperCase().startsWith(d.id.toUpperCase()))
                        if (targetDrive) handleSelectTargetDrive(targetDrive)
                      }}
                      className="px-2.5 py-2 text-xs rounded-lg bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] transition-colors cursor-pointer"
                      title={t.resetBtn}
                    >
                      {t.resetBtn}
                    </button>
                  )}
                </div>
              </div>

              {/* Preview de estructura generada y enlace con el NAS */}
              <div className="p-3 rounded-lg bg-[#0b0a09] border border-[#26211c] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-[#8c7a6b]">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-[#c69f68]" />
                    <span className="text-[#d6cebf] font-medium">{t.proStructureOnSsd}</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    {t.automatedTag}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#70665a] pl-5 space-y-0.5 border-l border-[#26211c] ml-1.5">
                  <p className="text-[#a89f91] truncate flex items-center gap-1.5">
                    <Folder className="w-3 h-3 text-[#c69f68] shrink-0" />
                    <span>{targetBasePath || "E:\\Lamha-Storage"}\{(projectName || clientName) ? `${sessionDate}_${(clientName || "Cliente").replace(/\s+/g, "_")}_${(projectName || "Sesion").replace(/\s+/g, "_")}` : "YYYY-MM-DD_Cliente_Proyecto"}</span>
                  </p>
                  <p>├── {t.proStructureDescRaw}</p>
                  <p>├── {t.proStructureDescEdits}</p>
                  <p>└── {t.proStructureDescFinal}</p>
                </div>
                <div className="pt-1.5 border-t border-[#1f1b17] flex items-center justify-between text-[10px] text-[#70665a]">
                  <span>{t.nasSyncLater}</span>
                  <span className="font-mono text-[#c69f68]">\\192.168.11.1\usb1_1\Lamha-Storage</span>
                </div>
              </div>

              {/* ALERTAS DE SEGURIDAD (Mismo disco / Falta de espacio) */}
              {isExactSamePath && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{t.samePathErrorTitle}</span>
                    <span>{t.samePathErrorDesc}</span>
                  </div>
                </div>
              )}

              {!isExactSamePath && isSameDriveCollision && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{t.sameDriveWarningTitle} ({sourceRoot})</span>
                    <span>{t.sameDriveWarningDesc}</span>
                  </div>
                </div>
              )}

              {spaceWarning && (
                <div className={cn(
                  "p-3 rounded-xl flex items-start gap-2.5 text-xs",
                  spaceWarning.isCritical 
                    ? "bg-rose-950/40 border border-rose-800/50 text-rose-300" 
                    : "bg-amber-950/40 border border-amber-800/50 text-amber-300"
                )}>
                  <AlertCircle className={cn("w-4 h-4 shrink-0 mt-0.5", spaceWarning.isCritical ? "text-rose-400" : "text-amber-400")} />
                  <div>
                    <span className="font-bold block">
                      {spaceWarning.isCritical ? t.insufficientSpaceTitle : t.capacityWarningTitle}
                    </span>
                    <span>{spaceWarning.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Inicio e Ingesta */}
            <div className="pt-2 space-y-2.5">
              {/* Tarjeta de Acción: App de Escritorio (Lamha Companion) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#171411] to-[#12100e] border border-[#c69f68]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-black/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      companionStatus?.connected ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-amber-400"
                    )} />
                    <span className="text-xs font-bold text-[#f5f2eb]">
                      {companionStatus?.connected
                        ? "App de Escritorio Lista en este PC"
                        : "App de Escritorio (Lamha Ingest Companion)"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#c69f68]/15 text-[#c69f68] font-mono font-semibold">
                      Ventana Esquina
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8c7a6b] leading-tight">
                    {companionStatus?.connected
                      ? "Se minimizará y mostrará el progreso en la esquina derecha mientras procesa y sube las fotos a Supabase."
                      : "Arranca la app instalada en tu PC para procesar tarjetas SD a máxima velocidad con previsualizaciones WebP."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchDesktopIngest}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] hover:from-[#dfba85] hover:to-[#c69f68] text-[#0b0a09] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#c69f68]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <HardDrive className="w-4 h-4 shrink-0" />
                  <span>
                    {companionStatus?.connected
                      ? "Lanzar Ingesta en PC"
                      : "Abrir App de Ingesta"}
                  </span>
                </button>
              </div>

              {/* Botón Servidor Web Directo (Fallback) */}
              <button
                type="button"
                disabled={isStartDisabled}
                onClick={handleStartIngest}
                className={cn(
                  "w-full py-2.5 rounded-xl font-medium text-xs tracking-wide transition-all flex items-center justify-center gap-2",
                  isStartDisabled
                    ? "bg-[#181613] border border-[#26211c] text-[#70665a] cursor-not-allowed opacity-50"
                    : "bg-[#1c1915] border border-[#2e2720] text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#25201a] cursor-pointer"
                )}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {isExactSamePath 
                    ? t.samePathErrorTitle
                    : spaceWarning?.isCritical
                    ? t.insufficientSpaceTitle
                    : `Ingestar vía Servidor Web (${targetDriveInfo?.id || "SSD"})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: PROCESANDO CON VISOR GRANDE Y LOGS */}
        {step === "processing" && (
          <div className="space-y-6 pt-4">
            {/* Visor de Carga Grande */}
            <div className="p-6 rounded-2xl bg-[#0b0a09] border border-[#26211c] text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#26211c"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#c69f68"
                      strokeWidth="8"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * progressPercent) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-serif text-[#f5f2eb]">
                      {progressPercent}%
                    </span>
                    <span className="text-[10px] text-[#c69f68] uppercase font-mono">
                      {t.ingestStepBadge}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-serif font-semibold text-[#f5f2eb]">
                  {t.processingSdCard}
                </h4>
                <p className="text-xs text-[#8c7a6b] font-mono mt-1 animate-pulse truncate">
                  {currentFileText}
                </p>
                {speedInfo && (
                  <p className="text-[11px] text-[#c69f68] font-mono mt-1">
                    {speedInfo}
                  </p>
                )}
                {targetBasePath && (
                  <p className="text-[10px] text-[#70665a] font-mono mt-1">
                    {t.writingToSsd} <span className="text-[#c69f68]">{targetBasePath}</span>
                  </p>
                )}
              </div>

              <div className="w-full bg-[#1c1915] rounded-full h-2 overflow-hidden border border-[#26211c]">
                <div 
                  className="bg-gradient-to-r from-[#c69f68] to-[#dfba85] h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Consola de Logs en Directo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#8c7a6b]">
                  <Terminal className="w-3.5 h-3.5 text-[#c69f68]" />
                  <span className="uppercase tracking-wider font-semibold text-[10px]">
                    {t.realtimeConsole}
                  </span>
                </div>
                <span className="text-[10px] text-[#70665a] font-mono">
                  {logs.length} {t.eventsCount}
                </span>
              </div>

              <div className="h-48 rounded-xl bg-[#090807] border border-[#26211c] p-3 font-mono text-[11px] overflow-y-auto space-y-1 select-text">
                {logs.map((log, index) => (
                  <div key={index} className="leading-relaxed flex items-start gap-2">
                    <span className="text-[#554c42] shrink-0">[{log.timestamp}]</span>
                    {log.level === "success" && <span className="text-emerald-400 font-bold shrink-0">[OK]</span>}
                    {log.level === "error" && <span className="text-rose-400 font-bold shrink-0">[ERR]</span>}
                    {log.level === "warn" && <span className="text-amber-400 font-bold shrink-0">[WARN]</span>}
                    {log.level === "info" && <span className="text-[#c69f68] shrink-0">[INFO]</span>}
                    <span className={
                      log.level === "success" ? "text-emerald-300" :
                      log.level === "error" ? "text-rose-300" :
                      log.level === "warn" ? "text-amber-300" : "text-[#d6cebf]"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: FINALIZADO Y RESUMEN */}
        {step === "finished" && resultSummary && (
          <div className="space-y-6 pt-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-serif font-bold text-[#f5f2eb]">
                {t.ingestFinishedTitle}
              </h3>
              <p className="text-xs text-[#8c7a6b] mt-1">
                {t.ingestFinishedSubtitle}
              </p>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-[#0b0a09] border border-[#26211c]">
                <span className="text-[10px] uppercase text-[#70665a] block font-semibold">{t.rawPhotos}</span>
                <span className="text-xl font-bold font-serif text-[#f5f2eb] mt-0.5 block">
                  {resultSummary.stats?.copiedPhotos || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0b0a09] border border-[#26211c]">
                <span className="text-[10px] uppercase text-[#70665a] block font-semibold">{t.rawVideos}</span>
                <span className="text-xl font-bold font-serif text-amber-400 mt-0.5 block">
                  {resultSummary.stats?.copiedVideos || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0b0a09] border border-[#26211c]">
                <span className="text-[10px] uppercase text-[#70665a] block font-semibold">{t.transferred}</span>
                <span className="text-xl font-bold font-serif text-emerald-400 mt-0.5 block">
                  {resultSummary.stats?.totalMB || 0} MB
                </span>
              </div>
            </div>

            {/* Carpeta Creada */}
            <div className="p-3 rounded-xl bg-[#181613] border border-[#26211c] text-xs text-left flex items-center justify-between">
              <div className="truncate mr-2">
                <span className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
                  {t.projectDirectory}
                </span>
                <span className="font-mono text-[#c69f68] truncate block text-[11px]">
                  {resultSummary.projectRootPath}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRevealFolder(resultSummary.projectRootPath)}
                className="px-2.5 py-1.5 rounded-lg bg-[#201c18] hover:bg-[#2c2620] border border-[#26211c] text-xs text-[#f5f2eb] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#c69f68]" />
                <span>{t.exploreFolder}</span>
              </button>
            </div>

            {/* Acciones Finales */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={downloadLogs}
                className="flex-1 py-2.5 rounded-xl border border-[#26211c] hover:bg-[#181613] text-[#a89f91] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.downloadLogsBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (resultSummary.sessionId) {
                    router.push(`/sessions/${resultSummary.sessionId}`)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg"
              >
                <span>{t.goToGalleryBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
