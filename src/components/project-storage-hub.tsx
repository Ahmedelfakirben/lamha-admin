"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  HardDrive,
  Cloud,
  Wifi,
  WifiOff,
  Server,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Folder,
  FolderPlus,
  FolderOpen,
  FileImage,
  FileVideo,
  File,
  ExternalLink,
  Loader2,
  ChevronRight,
  ChevronDown,
  Play,
  Check,
  Layers,
  Terminal,
  Database,
  ArrowUpRight,
  X,
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { openLocalFolderOrFile } from "@/lib/desktop-bridge"

interface FolderStat {
  name: string
  localCount: number
  localSizeMB: number
  nasCount: number
  isSynced: boolean
}

interface StepLocal {
  status: "missing" | "empty" | "ready" | "archived_in_nas"
  exists: boolean
  path: string
  filesCount: number
  sizeMB: number
  sizeGB: number
}

interface StepSupabase {
  status: "pending" | "partial" | "synced"
  registeredAssets: number
  previewsCount: number
  photosCount: number
  videosCount: number
  isSynced: boolean
}

interface StepNas {
  status: "unreachable" | "missing_folder" | "pending_sync" | "synced"
  isReachable: boolean
  exists: boolean
  path: string
  filesCount: number
  sizeMB: number
  sizeGB: number
  pendingFiles: number
  isSynced: boolean
}

interface SyncJobState {
  folderName: string
  isSyncing: boolean
  status: "idle" | "syncing" | "completed" | "error"
  totalFiles: number
  completedFiles: number
  currentFile: string
  percent: number
  message: string
  logs: string[]
  error?: string
}

interface ProjectSyncData {
  folderName: string
  step1Local: StepLocal
  step2Supabase: StepSupabase
  step3Nas: StepNas
  subfolderStats: FolderStat[]
  isFullySynced: boolean
  syncJob: SyncJobState
}

interface BrowseEntry {
  name: string
  isDirectory: boolean
  size: number | null
  modified: string | null
  mediaType: "photo" | "video" | "other" | "directory"
}

interface ProjectStorageHubProps {
  projectFolder: string
  sessionId?: string
  clientName?: string
  onClose?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

function getSubfolderMeta(name: string, isFr: boolean) {
  const lower = name.toLowerCase()
  if (lower.includes("01_raw/fotos") || lower.includes("fotos") || lower.includes("photos")) {
    return {
      label: "01_RAW / Photos",
      badge: "RAW Photos",
      color: "text-amber-400",
      bgBadge: "bg-amber-950/40 border-amber-800/40 text-amber-300",
      desc: isFr ? "Négatifs numériques et fichiers RAW originaux" : "Negativos digitales y archivos RAW originales",
      icon: FileImage,
    }
  }
  if (lower.includes("01_raw/videos") || lower.includes("videos")) {
    return {
      label: isFr ? "01_RAW / Vidéos" : "01_RAW / Videos",
      badge: isFr ? "RAW Vidéos" : "RAW Videos",
      color: "text-rose-400",
      bgBadge: "bg-rose-950/40 border-rose-800/40 text-rose-300",
      desc: isFr ? "Clips vidéo originaux de caméra" : "Clips de video originales de cámara",
      icon: FileVideo,
    }
  }
  if (lower.includes("02_seleccion") || lower.includes("selection")) {
    return {
      label: isFr ? "02_Sélection_Client" : "02_Seleccion_Cliente",
      badge: isFr ? "Sélection" : "Selección",
      color: "text-sky-400",
      bgBadge: "bg-sky-950/40 border-sky-800/40 text-sky-300",
      desc: isFr ? "Photographies sélectionnées par le client sur le portail" : "Fotografías marcadas por el cliente en el portal",
      icon: Folder,
    }
  }
  if (lower.includes("03_edicion") || lower.includes("edition") || lower.includes("master")) {
    return {
      label: isFr ? "03_Édition_Master" : "03_Edicion_Master",
      badge: isFr ? "Édition Master" : "Edición Master",
      color: "text-purple-400",
      bgBadge: "bg-purple-950/40 border-purple-800/40 text-purple-300",
      desc: isFr ? "Fichiers PSD, retouche et masters Premiere / DaVinci" : "Archivos PSD, proyectos Premiere / DaVinci",
      icon: Layers,
    }
  }
  if (lower.includes("04_entregas") || lower.includes("livraisons") || lower.includes("final")) {
    return {
      label: isFr ? "04_Livraisons_Finales" : "04_Entregas_Finales",
      badge: isFr ? "Livraisons" : "Entregas Finales",
      color: "text-emerald-400",
      bgBadge: "bg-emerald-950/40 border-emerald-800/40 text-emerald-300",
      desc: isFr ? "JPG / MP4 haute définition prêts pour livraison" : "JPG / MP4 de alta resolución entregados",
      icon: CheckCircle2,
    }
  }
  return {
    label: name,
    badge: isFr ? "Dossier" : "Carpeta",
    color: "text-[#c69f68]",
    bgBadge: "bg-[#1f1b16] border-[#3d362f] text-[#c69f68]",
    desc: isFr ? "Répertoire du projet" : "Directorio del proyecto",
    icon: Folder,
  }
}

export function ProjectStorageHub({
  projectFolder,
  sessionId,
  clientName,
  onClose,
}: ProjectStorageHubProps) {
  const { language } = useLanguage()
  const isFr = language === "fr" || language === "en" || !language // Defaulting to French as requested

  const [data, setData] = useState<ProjectSyncData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sincronización en curso
  const [isStartingSync, setIsStartingSync] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Exploración de archivos dentro de una subcarpeta
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null)
  const [folderFiles, setFolderFiles] = useState<BrowseEntry[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [browseSource, setBrowseSource] = useState<"local" | "nas">("local")
  const [isFoldersOpen, setIsFoldersOpen] = useState(true)

  // Crear carpetas estructuradas
  const [isCreatingFolders, setIsCreatingFolders] = useState(false)
  const [createMsg, setCreateMsg] = useState<string | null>(null)

  // Cargar estado de las 3 fases de almacenamiento
  const fetchSyncStatus = useCallback(async () => {
    if (!projectFolder) return
    try {
      const url = `/api/media/project-sync?folder=${encodeURIComponent(projectFolder)}${
        sessionId ? `&sessionId=${sessionId}` : ""
      }`
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setError(null)
      } else {
        setError(json.error || (isFr ? "Impossible d'obtenir l'état du stockage." : "No se pudo obtener el estado de almacenamiento."))
      }
    } catch (err: any) {
      setError(err.message || (isFr ? "Erreur de connexion avec le serveur." : "Error al conectar con el servidor."))
    } finally {
      setIsLoading(false)
    }
  }, [projectFolder, sessionId, isFr])

  // Iniciar sincronización de Local hacia Red (NAS)
  const handleStartSync = async () => {
    if (!projectFolder) return
    setIsStartingSync(true)
    setShowLogs(true)
    try {
      const res = await fetch("/api/media/project-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: projectFolder, lang: language, sessionId }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || (isFr ? "Erreur lors du démarrage de la synchronisation." : "Error al iniciar la sincronización."))
      } else {
        await fetchSyncStatus()
      }
    } catch (err: any) {
      alert((isFr ? "Erreur lors de la synchronisation : " : "Error al solicitar sincronización: ") + err.message)
    } finally {
      setIsStartingSync(false)
    }
  }

  // Explorar archivos de una subcarpeta
  const loadSubfolderFiles = async (subPath: string, source: "local" | "nas" = browseSource) => {
    setActiveSubfolder(subPath)
    setIsLoadingFiles(true)
    try {
      const fullRelPath = `${projectFolder}/${subPath}`
      const res = await fetch(
        `/api/media/browse?path=${encodeURIComponent(fullRelPath)}&source=${source}`
      )
      const json = await res.json()
      if (json.success && json.entries) {
        setFolderFiles(json.entries)
      } else {
        setFolderFiles([])
      }
    } catch {
      setFolderFiles([])
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // Abrir carpeta local en el Explorador de Windows mediante puente nativo
  const handleOpenLocalFolder = async (subfolder?: string) => {
    try {
      const target = subfolder
        ? `C:\\Lamha-Storage\\${projectFolder}\\${subfolder.replace(/\//g, "\\")}`
        : `C:\\Lamha-Storage\\${projectFolder}`
      await openLocalFolderOrFile(target, "reveal")
    } catch {}
  }

  // Inicializar carpetas de producción si están vacías
  const handleCreateStructure = async () => {
    setIsCreatingFolders(true)
    setCreateMsg(null)
    try {
      const res = await fetch("/api/media/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: projectFolder, sessionId }),
      })
      const json = await res.json()
      if (json.success) {
        setCreateMsg(
          isFr
            ? "Dossiers de production créés avec succès."
            : json.message || "Carpetas estructuradas creadas con éxito."
        )
        await fetchSyncStatus()
        setTimeout(() => setCreateMsg(null), 5000)
      } else {
        alert(json.error || (isFr ? "Impossible de créer la structure." : "No se pudo crear la estructura."))
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsCreatingFolders(false)
    }
  }

  // Primer render
  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  // Polling automático mientras se está sincronizando al NAS
  useEffect(() => {
    if (data?.syncJob?.isSyncing) {
      pollingRef.current = setInterval(() => {
        fetchSyncStatus()
      }, 1500)
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [data?.syncJob?.isSyncing, fetchSyncStatus])

  const isSyncingActive = Boolean(data?.syncJob?.isSyncing || isStartingSync)
  const pendingFilesCount = data?.step3Nas?.pendingFiles ?? 0

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-2xl overflow-hidden flex flex-col">
      {/* ── 1. HEADER PRINCIPAL: Identificación estricta del proyecto ── */}
      <div className="px-5 py-4 border-b border-[#26211c] bg-[#0f0e0c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#1d1a16] border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] shrink-0 shadow-inner">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#c69f68] font-serif">
                {isFr ? "Stockage du Projet" : "Almacenamiento del Proyecto"}
              </span>
              {clientName && (
                <span className="text-xs text-[#a89f91] font-sans font-medium">
                  • {clientName}
                </span>
              )}
              {data && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    data.isFullySynced
                      ? "bg-emerald-950/60 text-emerald-400 border border-emerald-700/50"
                      : "bg-amber-950/60 text-amber-400 border border-amber-700/50"
                  }`}
                >
                  {data.isFullySynced ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> {isFr ? "Synchronisé" : "Sincronizado"}
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" />{" "}
                      {pendingFilesCount > 0
                        ? `${pendingFilesCount} ${isFr ? "en attente" : "pendientes"}`
                        : (isFr ? "En attente" : "Pendiente")}
                    </>
                  )}
                </span>
              )}
            </div>
            {/* Solo la carpeta del proyecto en el que está */}
            <p className="text-sm font-mono font-medium text-[#f5f2eb] truncate mt-0.5 flex items-center gap-1.5" title={projectFolder}>
              <Folder className="w-3.5 h-3.5 text-[#c69f68] shrink-0" />
              <span>{projectFolder}</span>
            </p>
          </div>
        </div>

        {/* Botones de acción rápida */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Botón sincronizar a red con feedback animado */}
          <button
            onClick={handleStartSync}
            disabled={isSyncingActive || !data?.step1Local?.exists || data?.step1Local?.filesCount === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95 ${
              isSyncingActive
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed"
                : pendingFilesCount > 0
                ? "bg-gradient-to-r from-[#c69f68] to-[#dfba89] text-black hover:opacity-95 shadow-[#c69f68]/10"
                : "bg-[#1c1915] text-[#a89f91] border border-[#26211c] hover:text-[#f5f2eb] hover:border-[#c69f68]/40"
            }`}
            title={isFr ? "Copie les fichiers locaux vers le NAS Réseau" : "Copia los archivos locales al NAS en red"}
          >
            {isSyncingActive ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isFr ? "Synchronisation..." : "Sincronizando..."}</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>{isFr ? "Synchroniser au Réseau" : "Sincronizar a Red"}</span>
                {pendingFilesCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                    {pendingFilesCount}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Inicializar estructura si está vacía */}
          {(!data?.step1Local?.exists || data?.step1Local?.filesCount === 0) && (
            <button
              onClick={handleCreateStructure}
              disabled={isCreatingFolders}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/50 text-[#c69f68] text-xs font-medium transition-colors"
              title={isFr ? "Créer les dossiers structurés 01_RAW, 02_Sélection, etc." : "Crear carpetas estructuradas 01_RAW, 02_Seleccion, etc."}
            >
              {isCreatingFolders ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isFr ? "Créer Dossiers" : "Crear Carpetas"}</span>
            </button>
          )}

          {/* Abrir en Windows Explorer */}
          <button
            onClick={() => handleOpenLocalFolder()}
            className="p-2 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[#a89f91] hover:text-[#c69f68] transition-colors"
            title={isFr ? "Ouvrir le dossier local dans l'Explorateur Windows" : "Abrir carpeta local en el Explorador de Windows"}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Refrescar */}
          <button
            onClick={fetchSyncStatus}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[#a89f91] hover:text-[#f5f2eb] transition-colors cursor-pointer"
            title={isFr ? "Actualiser l'état" : "Refrescar estado"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Cerrar modal */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1c1915] hover:bg-rose-500/20 hover:text-rose-400 text-[#8c7a6b] border border-[#26211c] hover:border-rose-800/40 transition-colors cursor-pointer ml-1"
              title={isFr ? "Fermer" : "Cerrar"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de feedback de creación */}
      {createMsg && (
        <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{createMsg}</span>
        </div>
      )}

      {/* ── 2. SECUENCIA DEL ESTUDIO: Local ➔ Supabase ➔ Red (NAS) ── */}
      <div className="px-5 py-3 border-b border-[#26211c] bg-[#100f0d]">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-[#70665a] mb-2.5 flex items-center justify-between">
          <span>{isFr ? "Flux de Stockage (Studio)" : "Flujo de Almacenamiento (Estudio)"}</span>
          <span className="font-mono text-[#c69f68]/80 text-[10px] lowercase">
            {isFr
              ? "1º local ssd → 2º supabase → 3º réseau lors de la synchro"
              : "1º local ssd → 2º supabase → 3º red al sincronizar"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* PASO 1: Local (SSD) - Primero */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              data?.step1Local?.filesCount
                ? "bg-[#181613] border-[#383129]"
                : data?.step1Local?.status === "archived_in_nas"
                ? "bg-[#181613] border-emerald-900/40"
                : "bg-[#141210] border-[#221e1a]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#f5f2eb] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                1. Local (SSD)
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                  data?.step1Local?.filesCount
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                    : data?.step1Local?.status === "archived_in_nas"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                    : "bg-[#201c18] text-[#70665a]"
                }`}
              >
                {data?.step1Local?.status === "archived_in_nas"
                  ? (isFr ? "Archivé sur NAS" : "Archivado en NAS")
                  : (isFr ? "1º Ingestion" : "1º Ingesta")}
              </span>
            </div>
            <p className="text-lg font-mono font-bold text-[#f5f2eb]">
              {data?.step1Local?.filesCount ?? 0}{" "}
              <span className="text-xs font-normal text-[#8c7a6b]">
                {isFr ? "fichiers" : "archivos"}
              </span>
            </p>
            <p className="text-[10px] text-[#70665a] font-mono mt-0.5">
              {data?.step1Local?.status === "archived_in_nas"
                ? (isFr ? "Archive maître sur NAS (SSD libéré)" : "Archivo maestro en NAS (SSD liberado)")
                : `${data?.step1Local?.sizeMB ? `${data.step1Local.sizeMB} MB` : "0 MB"} · C:\\Lamha-Storage`}
            </p>
          </div>

          {/* PASO 2: Supabase (Nube) */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              data?.step2Supabase?.registeredAssets
                ? "bg-[#181613] border-[#383129]"
                : "bg-[#141210] border-[#221e1a]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#f5f2eb] flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                2. Supabase (Cloud)
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                  data?.step2Supabase?.isSynced
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                    : data?.step2Supabase?.registeredAssets
                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                    : "bg-[#201c18] text-[#70665a]"
                }`}
              >
                {isFr ? "2º Portail Client" : "2º Portal Web"}
              </span>
            </div>
            <p className="text-lg font-mono font-bold text-[#f5f2eb]">
              {data?.step2Supabase?.registeredAssets ?? 0}{" "}
              <span className="text-xs font-normal text-[#8c7a6b]">
                {isFr ? "actifs" : "activos"}
              </span>
            </p>
            <p className="text-[10px] text-[#70665a] font-mono mt-0.5">
              {data?.step2Supabase?.previewsCount ?? 0} {isFr ? "miniatures WebP générées" : "miniaturas WebP cargadas"}
            </p>
          </div>

          {/* PASO 3: Red (NAS / Router) */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              data?.step3Nas?.isSynced
                ? "bg-[#181613] border-emerald-900/40"
                : pendingFilesCount > 0
                ? "bg-[#181613] border-amber-900/40"
                : "bg-[#141210] border-[#221e1a]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#f5f2eb] flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#c69f68]" />
                3. {isFr ? "Réseau (NAS ZTE)" : "Red (NAS ZTE)"}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                  data?.step3Nas?.isSynced
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                    : pendingFilesCount > 0
                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                    : "bg-[#201c18] text-[#70665a]"
                }`}
              >
                {isFr ? "3º À la Synchro" : "3º Al Sincronizar"}
              </span>
            </div>
            <p className="text-lg font-mono font-bold text-[#f5f2eb]">
              {data?.step3Nas?.filesCount ?? 0}{" "}
              <span className="text-xs font-normal text-[#8c7a6b]">
                {isFr ? "sur Réseau" : "en Red"}
              </span>
            </p>
            <p className="text-[10px] font-mono mt-0.5 truncate">
              {pendingFilesCount > 0 ? (
                <span className="text-amber-400 font-semibold inline-flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                  <span>{pendingFilesCount} {isFr ? "fichiers à synchroniser" : "arch. por sincronizar"}</span>
                </span>
              ) : (
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                  <span>{isFr ? "Tout est synchronisé sur le NAS" : "Todo copiado al NAS"}</span>
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. BARRA DE PROGRESO DE COPIA AL NAS EN TIEMPO REAL ── */}
      {data?.syncJob && (data.syncJob.isSyncing || data.syncJob.percent > 0) && (
        <div className="px-5 py-3 bg-[#13100d] border-b border-[#26211c] animate-in fade-in">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#c69f68] font-medium flex items-center gap-2">
              {data.syncJob.isSyncing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {data.syncJob.status === "completed"
                ? (isFr
                    ? `Projet synchronisé avec succès sur le NAS (${data.syncJob.completedFiles}/${data.syncJob.totalFiles} fichiers) !`
                    : data.syncJob.message)
                : (data.syncJob.message || (isFr ? "Synchronisation des fichiers vers le NAS Réseau..." : "Sincronizando archivos al NAS en Red..."))}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#f5f2eb] font-bold">
                {data.syncJob.percent}% ({data.syncJob.completedFiles}/{data.syncJob.totalFiles})
              </span>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-[10px] text-[#8c7a6b] hover:text-[#c69f68] underline"
              >
                {showLogs ? (isFr ? "Masquer journal" : "Ocultar registro") : (isFr ? "Afficher journal" : "Ver registro")}
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full h-2 rounded-full bg-[#1e1b17] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c69f68] to-[#dfba89] transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, data.syncJob.percent))}%` }}
            />
          </div>

          {data.syncJob.currentFile && (
            <p className="text-[10px] font-mono text-[#8c7a6b] mt-1 truncate">
              {isFr ? "Fichier en cours : " : "Archivo actual: "}
              <span className="text-[#d5cfc5]">{data.syncJob.currentFile}</span>
            </p>
          )}

          {/* Log terminal plegable */}
          {showLogs && data.syncJob.logs?.length > 0 && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-black/60 border border-[#26211c] max-h-32 overflow-y-auto font-mono text-[10px] text-[#a89f91] space-y-1">
              {data.syncJob.logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. TODAS LAS CARPETAS DEL PROYECTO (DESPLEGABLE) ── */}
      <button
        onClick={() => setIsFoldersOpen(!isFoldersOpen)}
        className="w-full px-5 py-3 border-b border-[#26211c] bg-[#0d0c0a] hover:bg-[#13110e] transition-colors flex items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#a89f91]">
            {isFr ? "Structure des Dossiers du Projet" : "Estructura de Carpetas del Proyecto"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181512] border border-[#26211c] text-[#c69f68] font-mono">
            {data?.subfolderStats?.length || 5} {isFr ? "dossiers" : "carpetas"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#70665a]">
          <span className="text-[10px] font-mono hidden sm:inline">
            {isFoldersOpen ? (isFr ? "Réduire" : "Plegar") : (isFr ? "Développer" : "Desplegar")}
          </span>
          {isFoldersOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#c69f68]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {isFoldersOpen && (
        <div className="divide-y divide-[#1a1816] max-h-[360px] overflow-y-auto scrollbar-thin animate-in fade-in duration-200">
        {isLoading && !data ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#70665a] gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#c69f68]" />
            <span className="text-xs">
              {isFr ? "Vérification Local, Réseau et Supabase..." : "Consultando Local, Red y Supabase..."}
            </span>
          </div>
        ) : !data?.subfolderStats || data.subfolderStats.length === 0 ? (
          <div className="py-10 px-6 text-center text-[#70665a]">
            <Folder className="w-8 h-8 mx-auto text-[#3d362f] mb-2" />
            <p className="text-xs text-[#a89f91]">
              {isFr ? "Aucun dossier structuré trouvé." : "No se encontraron carpetas estructuradas."}
            </p>
            <button
              onClick={handleCreateStructure}
              className="mt-3 px-3 py-1.5 rounded-xl bg-[#1c1915] text-[#c69f68] border border-[#26211c] hover:border-[#c69f68]/40 text-xs"
            >
              {isFr ? "Créer la Structure" : "Crear Estructura Ahora"}
            </button>
          </div>
        ) : (
          data.subfolderStats.map((folder) => {
            const meta = getSubfolderMeta(folder.name, isFr)
            const Icon = meta.icon
            const isExpanded = activeSubfolder === folder.name

            // Determinar si hay archivos en Supabase vinculados a esta subcarpeta
            let supabaseCount = 0
            if (folder.name.includes("Fotos") || folder.name.includes("Photos")) {
              supabaseCount = data.step2Supabase?.photosCount || 0
            } else if (folder.name.includes("Videos") || folder.name.includes("Vidéos")) {
              supabaseCount = data.step2Supabase?.videosCount || 0
            }

            return (
              <div key={folder.name} className="group">
                {/* Fila principal de la carpeta */}
                <div
                  onClick={() => {
                    if (isExpanded) {
                      setActiveSubfolder(null)
                    } else {
                      loadSubfolderFiles(folder.name)
                    }
                  }}
                  className={`px-5 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isExpanded ? "bg-[#181613]" : "hover:bg-[#141210]"
                  }`}
                >
                  {/* Nombre e icono de la carpeta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#f5f2eb] truncate font-mono">
                          {meta.label}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-sans ${meta.bgBadge}`}>
                          {meta.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#70665a] truncate mt-0.5">
                        {meta.desc}
                      </p>
                    </div>
                  </div>

                  {/* Detalle por niveles: Local | Supabase | Red */}
                  <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                    {/* Local */}
                    <div className="text-right hidden sm:block">
                      <span className="text-[#a89f91]">{folder.localCount}</span>
                      <span className="text-[9px] text-[#554c42] block">Local</span>
                    </div>

                    {/* Supabase */}
                    <div className="text-right hidden md:block">
                      <span className="text-sky-400">{supabaseCount}</span>
                      <span className="text-[9px] text-[#554c42] block">Supabase</span>
                    </div>

                    {/* Red (NAS) */}
                    <div className="text-right">
                      <span
                        className={
                          folder.localCount > 0 && folder.nasCount < folder.localCount
                            ? "text-amber-400 font-semibold"
                            : "text-[#a89f91]"
                        }
                      >
                        {folder.nasCount}
                      </span>
                      <span className="text-[9px] text-[#554c42] block">
                        {isFr ? "Réseau" : "Red (NAS)"}
                      </span>
                    </div>

                    {/* Badge de Sincronización */}
                    <div className="min-w-[90px] text-right">
                      {folder.localCount === 0 && folder.nasCount === 0 ? (
                        <span className="inline-flex items-center text-[10px] text-[#554c42] font-sans">
                          {isFr ? "Vide" : "Vacío"}
                        </span>
                      ) : folder.isSynced ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 font-sans font-medium">
                          <Check className="w-2.5 h-2.5" /> {isFr ? "Synchronisé" : "Sincronizado"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-300 border border-amber-800/40 font-sans font-medium">
                          <Clock className="w-2.5 h-2.5" /> {isFr ? "En attente" : "Pendiente"}
                        </span>
                      )}
                    </div>

                    {/* Chevron toggle */}
                    <div className="text-[#554c42] group-hover:text-[#c69f68] transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Subpanel expandible con visor de archivos dentro de esta carpeta */}
                {isExpanded && (
                  <div className="px-5 py-3 bg-[#0d0c0a] border-t border-[#1e1b17] animate-in fade-in">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#c69f68]">
                          {isFr ? `Fichiers dans ${meta.label}` : `Archivos en ${meta.label}`}
                        </span>
                        {/* Selector de origen Local vs Red */}
                        <div className="inline-flex items-center rounded-lg bg-[#181613] border border-[#26211c] p-0.5 text-[10px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setBrowseSource("local")
                              loadSubfolderFiles(folder.name, "local")
                            }}
                            className={`px-2 py-0.5 rounded-md transition-colors ${
                              browseSource === "local"
                                ? "bg-[#25201a] text-[#f5f2eb] font-semibold"
                                : "text-[#70665a] hover:text-[#a89f91]"
                            }`}
                          >
                            Local SSD ({folder.localCount})
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setBrowseSource("nas")
                              loadSubfolderFiles(folder.name, "nas")
                            }}
                            className={`px-2 py-0.5 rounded-md transition-colors ${
                              browseSource === "nas"
                                ? "bg-[#25201a] text-[#f5f2eb] font-semibold"
                                : "text-[#70665a] hover:text-[#a89f91]"
                            }`}
                          >
                            {isFr ? "Réseau NAS" : "Red NAS"} ({folder.nasCount})
                          </button>
                        </div>
                      </div>

                      {/* Botón abrir carpeta en Windows */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLocalFolder(folder.name)
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-[#c69f68] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {isFr ? "Ouvrir le dossier dans Windows" : "Abrir carpeta en Windows"}
                      </button>
                    </div>

                    {/* Lista de archivos */}
                    {isLoadingFiles ? (
                      <div className="py-6 flex items-center justify-center text-[#70665a] gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#c69f68]" />
                        <span className="text-xs">{isFr ? "Chargement des fichiers..." : "Cargando archivos..."}</span>
                      </div>
                    ) : folderFiles.length === 0 ? (
                      <div className="py-5 text-center text-[#554c42] text-xs font-mono">
                        {isFr
                          ? `Aucun fichier dans ${browseSource === "local" ? "Local (SSD)" : "Réseau (NAS)"}.`
                          : `No hay archivos en ${browseSource === "local" ? "Local (SSD)" : "Red (NAS)"}.`}
                        {browseSource === "nas" && folder.localCount > 0 && (
                          <p className="text-amber-400/80 text-[11px] mt-1 font-sans">
                            {isFr
                              ? `Cliquez sur « Synchroniser au Réseau » ci-dessus pour copier les ${folder.localCount} fichiers locaux sur le NAS.`
                              : `Pulsa «Sincronizar a Red» arriba para copiar los ${folder.localCount} archivos locales al NAS.`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto divide-y divide-[#181613] rounded-lg border border-[#1e1b17] bg-[#121110]">
                        {folderFiles.map((f) => (
                          <div
                            key={f.name}
                            className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-[#181613] transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {f.mediaType === "photo" ? (
                                <FileImage className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              ) : f.mediaType === "video" ? (
                                <FileVideo className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              ) : (
                                <File className="w-3.5 h-3.5 text-[#70665a] shrink-0" />
                              )}
                              <span className="font-mono text-[#d5cfc5] truncate">{f.name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-[#554c42] shrink-0 ml-3">
                              {f.size ? formatBytes(f.size) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      )}

      {/* ── 5. PIE DE INFORMACIÓN Y ESTADO DE RED ── */}
      <div className="px-5 py-2.5 bg-[#0f0e0c] border-t border-[#1e1b17] flex items-center justify-between text-[11px] text-[#70665a] flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Server className="w-3.5 h-3.5 text-[#c69f68]" />
          <span>
            {isFr ? "Routeur NAS :" : "Router NAS:"}{" "}
            <span className="font-mono text-[#a89f91]">192.168.11.1 (FTP)</span>
          </span>
          <span className="text-[#3d362f]">·</span>
          <span>
            {isFr ? "SSD Local :" : "SSD Local:"}{" "}
            <span className="font-mono text-[#a89f91]">C:\Lamha-Storage</span>
          </span>
        </div>

        {data?.isFullySynced ? (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {isFr ? "Toutes les étapes sont synchronisées" : "Todas las fases sincronizadas"}
          </span>
        ) : (
          <span className="text-amber-400/90 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {isFr ? "Synchronisation en attente vers le Réseau" : "Sincronización pendiente a Red"}
          </span>
        )}
      </div>
    </div>
  )
}
