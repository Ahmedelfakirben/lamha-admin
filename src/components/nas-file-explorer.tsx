"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FileImage,
  FileVideo,
  File,
  ChevronRight,
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUp,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Check,
} from "lucide-react"

interface BrowseEntry {
  name: string
  isDirectory: boolean
  size: number | null
  modified: string | null
  mediaType: "photo" | "video" | "other" | "directory"
  childCount?: number
}

interface BrowseResult {
  success: boolean
  currentPath: string
  relativePath: string
  basePath: string
  isNetworkReachable: boolean
  entries: BrowseEntry[]
  error?: string
}

interface NasFileExplorerProps {
  /** Initial relative path to load (e.g. project folder name) */
  initialPath?: string
  sessionId?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

function getIcon(entry: BrowseEntry, isOpen?: boolean) {
  if (entry.isDirectory) {
    // Special folder icons by naming convention
    const name = entry.name.toLowerCase()
    if (name.includes("raw")) return <Folder className="w-4 h-4 text-amber-400" />
    if (name.includes("seleccion") || name.includes("cliente")) return <Folder className="w-4 h-4 text-blue-400" />
    if (name.includes("edicion") || name.includes("master")) return <Folder className="w-4 h-4 text-purple-400" />
    if (name.includes("entrega") || name.includes("final")) return <Folder className="w-4 h-4 text-emerald-400" />
    return isOpen ? <FolderOpen className="w-4 h-4 text-[#c69f68]" /> : <Folder className="w-4 h-4 text-[#c69f68]" />
  }
  if (entry.mediaType === "photo") return <FileImage className="w-4 h-4 text-sky-400" />
  if (entry.mediaType === "video") return <FileVideo className="w-4 h-4 text-rose-400" />
  return <File className="w-4 h-4 text-[#70665a]" />
}

export function NasFileExplorer({ initialPath = "", sessionId }: NasFileExplorerProps) {
  const [result, setResult] = useState<BrowseResult | null>(null)
  const [currentRelPath, setCurrentRelPath] = useState(initialPath)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [isCreatingStructure, setIsCreatingStructure] = useState(false)
  const [createFeedback, setCreateFeedback] = useState<string | null>(null)

  const fetchDir = useCallback(async (relPath: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/media/browse?path=${encodeURIComponent(relPath)}`)
      const data: BrowseResult = await res.json()
      if (data.success) {
        setResult(data)
        setCurrentRelPath(relPath)
      } else {
        setError(data.error || "Error desconocido")
        setResult(data)
      }
    } catch (e: any) {
      setError(e.message || "Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleCreateStructure = async () => {
    setIsCreatingStructure(true)
    setCreateFeedback(null)
    setError(null)
    try {
      const targetFolder = currentRelPath || initialPath || ""
      const res = await fetch("/api/media/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          folderName: targetFolder,
          sessionId 
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCreateFeedback(data.message || "Estructura creada en el almacenamiento.")
        const destFolder = data.folderName || targetFolder
        await fetchDir(destFolder)
        setTimeout(() => setCreateFeedback(null), 6000)
      } else {
        setError(data.error || "No se pudo crear la estructura.")
      }
    } catch (e: any) {
      setError(e.message || "Error al solicitar la creación de carpetas.")
    } finally {
      setIsCreatingStructure(false)
    }
  }

  useEffect(() => {
    fetchDir(currentRelPath)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (folderName: string) => {
    const newPath = currentRelPath ? `${currentRelPath}/${folderName}` : folderName
    setExpandedEntry(null)
    fetchDir(newPath)
  }

  const goUp = () => {
    const parts = currentRelPath.split(/[/\\]/).filter(Boolean)
    parts.pop()
    setExpandedEntry(null)
    fetchDir(parts.join("/"))
  }

  const goRoot = () => {
    setExpandedEntry(null)
    fetchDir("")
  }

  const handleOpenInExplorer = async (entryPath: string) => {
    try {
      await fetch("/api/media/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: entryPath, mode: "reveal" }),
      })
    } catch {}
  }

  // Breadcrumb segments
  const pathSegments = currentRelPath.split(/[/\\]/).filter(Boolean)

  // Stats for current directory
  const stats = result?.entries
    ? {
        folders: result.entries.filter((e) => e.isDirectory).length,
        photos: result.entries.filter((e) => e.mediaType === "photo").length,
        videos: result.entries.filter((e) => e.mediaType === "video").length,
        others: result.entries.filter((e) => !e.isDirectory && e.mediaType === "other").length,
        totalSize: result.entries
          .filter((e) => !e.isDirectory && e.size)
          .reduce((acc, e) => acc + (e.size || 0), 0),
      }
    : null

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-xl overflow-hidden flex flex-col h-full">
      {/* ── Explorer Header ── */}
      <div className="px-4 py-3 border-b border-[#26211c] bg-[#0f0e0c] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <HardDrive className="w-4 h-4 text-[#c69f68] shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#c69f68] font-serif shrink-0">
            Almacenamiento
          </span>
          {result && (
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
              result.isNetworkReachable
                ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/40"
                : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
            }`}>
              {result.isNetworkReachable ? (
                <><Wifi className="w-2.5 h-2.5" /> Red</>
              ) : (
                <><WifiOff className="w-2.5 h-2.5" /> Local</>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCreateStructure}
            disabled={isCreatingStructure}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/50 text-[#c69f68] text-[11px] font-medium transition-colors"
            title="Inicializar estructura de carpetas (01_RAW, 02_Seleccion, 03_Master, 04_Entregas)"
          >
            {isCreatingStructure ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Crear Carpetas</span>
          </button>

          {result?.currentPath && (
            <button
              onClick={() => handleOpenInExplorer(result.currentPath)}
              className="p-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[#a89f91] hover:text-[#c69f68] transition-colors"
              title="Abrir en el Explorador del sistema"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => fetchDir(currentRelPath)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[#a89f91] hover:text-[#f5f2eb] transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Feedback Message ── */}
      {createFeedback && (
        <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between gap-2 text-emerald-400 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{createFeedback}</span>
          </div>
          <button onClick={() => setCreateFeedback(null)} className="text-[10px] text-emerald-500 hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* ── Breadcrumb Path Bar ── */}
      <div className="px-4 py-2 border-b border-[#1e1b17] bg-[#121110] flex items-center gap-1 text-[11px] font-mono text-[#8c7a6b] overflow-x-auto scrollbar-thin">
        {currentRelPath && (
          <button
            onClick={goUp}
            className="p-1 rounded hover:bg-[#201c18] text-[#70665a] hover:text-[#f5f2eb] transition-colors shrink-0"
            title="Subir un nivel"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={goRoot}
          className="hover:text-[#c69f68] transition-colors px-1 py-0.5 rounded hover:bg-[#201c18] shrink-0"
        >
          <HardDrive className="w-3 h-3 inline-block" />
        </button>
        {pathSegments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3 text-[#3d362f]" />
            <button
              onClick={() => {
                const target = pathSegments.slice(0, i + 1).join("/")
                fetchDir(target)
              }}
              className={`px-1 py-0.5 rounded transition-colors ${
                i === pathSegments.length - 1
                  ? "text-[#f5f2eb] font-semibold"
                  : "hover:text-[#c69f68] hover:bg-[#201c18]"
              }`}
            >
              {seg}
            </button>
          </span>
        ))}
      </div>

      {/* ── Dir Stats Bar ── */}
      {stats && !isLoading && result?.success && (
        <div className="px-4 py-1.5 border-b border-[#1a1816] bg-[#100f0d] flex items-center gap-3 text-[10px] text-[#70665a]">
          {stats.folders > 0 && (
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3 text-[#c69f68]" />
              {stats.folders} carpeta{stats.folders !== 1 ? "s" : ""}
            </span>
          )}
          {stats.photos > 0 && (
            <span className="flex items-center gap-1">
              <FileImage className="w-3 h-3 text-sky-400" />
              {stats.photos} foto{stats.photos !== 1 ? "s" : ""}
            </span>
          )}
          {stats.videos > 0 && (
            <span className="flex items-center gap-1">
              <FileVideo className="w-3 h-3 text-rose-400" />
              {stats.videos} video{stats.videos !== 1 ? "s" : ""}
            </span>
          )}
          {stats.others > 0 && (
            <span className="flex items-center gap-1">
              <File className="w-3 h-3 text-[#554c42]" />
              {stats.others} otro{stats.others !== 1 ? "s" : ""}
            </span>
          )}
          {stats.totalSize > 0 && (
            <span className="ml-auto text-[#554c42] font-mono">
              {formatBytes(stats.totalSize)}
            </span>
          )}
        </div>
      )}

      {/* ── File List ── */}
      <div className="flex-1 overflow-y-auto min-h-[180px] max-h-[340px]">
        {isLoading && !result ? (
          <div className="flex items-center justify-center py-12 text-[#70665a]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Cargando estructura...</span>
          </div>
        ) : error && !result?.entries?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <AlertTriangle className="w-8 h-8 text-amber-500/60 mb-2" />
            <p className="text-xs text-[#a89f91] font-medium mb-1">No se pudo acceder al almacenamiento</p>
            <p className="text-[11px] text-[#70665a] max-w-xs">{error}</p>
            <button
              onClick={() => fetchDir(currentRelPath)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#c69f68] text-xs"
            >
              Reintentar
            </button>
          </div>
        ) : result?.entries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1c1915] border border-[#26211c] flex items-center justify-center text-[#c69f68]">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#f5f2eb]">Estructura aún no creada</p>
              <p className="text-[11px] text-[#70665a] max-w-xs mt-0.5">
                Esta carpeta está vacía. Puedes inicializar la estructura estándar de producción en el NAS y local.
              </p>
            </div>
            <button
              onClick={handleCreateStructure}
              disabled={isCreatingStructure}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba89] text-black font-semibold text-xs shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-2"
            >
              {isCreatingStructure ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creando en NAS...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Crear Directorios del Proyecto</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-[#554c42] font-mono">
              01_RAW/Fotos, Videos · 02_Seleccion · 03_Master · 04_Entregas
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1816]">
            {result?.entries?.map((entry) => (
              <div key={entry.name} className="group">
                <button
                  onClick={() => {
                    if (entry.isDirectory) {
                      navigateTo(entry.name)
                    } else {
                      setExpandedEntry(expandedEntry === entry.name ? null : entry.name)
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1816] transition-colors text-left"
                >
                  {/* Icon */}
                  <div className="shrink-0">{getIcon(entry, false)}</div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs truncate block ${
                      entry.isDirectory
                        ? "font-semibold text-[#f5f2eb]"
                        : "text-[#d5cfc5] font-mono"
                    }`}>
                      {entry.name}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    {entry.isDirectory && typeof entry.childCount === "number" && (
                      <span className="text-[10px] text-[#554c42] font-mono">
                        {entry.childCount} elem.
                      </span>
                    )}
                    {!entry.isDirectory && entry.size && (
                      <span className="text-[10px] text-[#554c42] font-mono min-w-[55px] text-right">
                        {formatBytes(entry.size)}
                      </span>
                    )}
                    {entry.modified && (
                      <span className="text-[10px] text-[#3d362f] font-mono hidden lg:block min-w-[110px] text-right">
                        {formatDate(entry.modified)}
                      </span>
                    )}
                    {entry.isDirectory && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#3d362f] group-hover:text-[#c69f68] transition-colors" />
                    )}
                  </div>
                </button>

                {/* Expanded file actions */}
                {!entry.isDirectory && expandedEntry === entry.name && result?.currentPath && (
                  <div className="px-4 pb-2.5 pl-11 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={() => {
                        const sep = result.currentPath.startsWith("ftp://") ? "/" : "\\"
                        const hasEndSep = result.currentPath.endsWith("\\") || result.currentPath.endsWith("/")
                        handleOpenInExplorer(`${result.currentPath}${hasEndSep ? "" : sep}${entry.name}`)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[10px] text-[#a89f91] hover:text-[#c69f68] transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir en Explorador
                    </button>
                    {entry.mediaType !== "other" && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                        entry.mediaType === "photo"
                          ? "bg-sky-950/30 text-sky-400 border border-sky-800/30"
                          : "bg-rose-950/30 text-rose-400 border border-rose-800/30"
                      }`}>
                        {entry.mediaType === "photo" ? "Foto" : "Video"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
