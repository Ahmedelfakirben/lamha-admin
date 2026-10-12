"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Folder, 
  FolderOpen, 
  HardDrive, 
  Camera, 
  Film, 
  File, 
  ArrowUp, 
  RefreshCw, 
  Check, 
  CheckSquare, 
  Square, 
  Plus, 
  Search, 
  Monitor, 
  Apple, 
  ChevronRight,
  X,
  AlertCircle,
  Clock
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { ExplorerEntry, ExplorerShortcut, ExplorerResult } from "@/app/api/fs/explore/route"
import { cn } from "@/lib/utils"

interface FileExplorerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "folder" | "files"
  initialPath?: string
  title: string
  description?: string
  onSelect: (folderPath: string, selectedFiles?: string[]) => void
}

type ExplorerLang = "es" | "fr" | "en" | "ar"

const EXPLORER_I18N: Record<
  ExplorerLang,
  {
    quickAccess: string
    thisDeviceWin: string
    thisDeviceMac: string
    go: string
    newFolder: string
    createNewFolderPlaceholder: string
    create: string
    allFilter: string
    photosFilter: string
    videosFilter: string
    selectAll: string
    deselectAll: string
    filesSelected: string
    mediaFilesHeader: string
    selectedOfTotal: (sel: number, tot: number) => string
    foldersHeader: string
    emptyFolder: string
    selectedPathLabel: string
    noneSelected: string
    forTransfer: string
    cancel: string
    selectThisFolder: string
    confirmFiles: string
    upLevel: string
    refresh: string
    photosCount: string
    itemsCount: string
  }
> = {
  es: {
    quickAccess: "Acceso Rápido:",
    thisDeviceWin: "Este Equipo",
    thisDeviceMac: "/Volumes",
    go: "Ir",
    newFolder: "Nueva carpeta",
    createNewFolderPlaceholder: "Nombre de la nueva carpeta (ej: 04_Lamha_Raw)...",
    create: "Crear",
    allFilter: "Todos",
    photosFilter: "Fotos",
    videosFilter: "Videos",
    selectAll: "Seleccionar todo",
    deselectAll: "Deseleccionar todo",
    filesSelected: "archivos seleccionados",
    mediaFilesHeader: "Archivos Multimedia",
    selectedOfTotal: (sel, tot) => `${sel} de ${tot} seleccionados`,
    foldersHeader: "Carpetas",
    emptyFolder: "Carpeta vacía o sin permisos de lectura.",
    selectedPathLabel: "Ruta Seleccionada:",
    noneSelected: "Ninguna seleccionada",
    forTransfer: "para transferir",
    cancel: "Cancelar",
    selectThisFolder: "Seleccionar esta carpeta",
    confirmFiles: "Confirmar selección",
    upLevel: "Subir un nivel",
    refresh: "Actualizar",
    photosCount: "fotos",
    itemsCount: "elementos",
  },
  fr: {
    quickAccess: "Accès Rapide :",
    thisDeviceWin: "Ce PC",
    thisDeviceMac: "/Volumes",
    go: "Aller",
    newFolder: "Nouveau dossier",
    createNewFolderPlaceholder: "Nom du nouveau dossier (ex: 04_Lamha_Raw)...",
    create: "Créer",
    allFilter: "Tous",
    photosFilter: "Photos",
    videosFilter: "Vidéos",
    selectAll: "Tout sélectionner",
    deselectAll: "Tout désélectionner",
    filesSelected: "fichiers sélectionnés",
    mediaFilesHeader: "Fichiers Multimédia",
    selectedOfTotal: (sel, tot) => `${sel} sur ${tot} sélectionnés`,
    foldersHeader: "Dossiers",
    emptyFolder: "Dossier vide ou autorisations insuffisantes.",
    selectedPathLabel: "Chemin Sélectionné :",
    noneSelected: "Aucun sélectionné",
    forTransfer: "à transférer",
    cancel: "Annuler",
    selectThisFolder: "Sélectionner ce dossier",
    confirmFiles: "Confirmer la sélection",
    upLevel: "Dossier parent",
    refresh: "Actualiser",
    photosCount: "photos",
    itemsCount: "éléments",
  },
  en: {
    quickAccess: "Quick Access:",
    thisDeviceWin: "This PC",
    thisDeviceMac: "/Volumes",
    go: "Go",
    newFolder: "New folder",
    createNewFolderPlaceholder: "New folder name (e.g., 04_Lamha_Raw)...",
    create: "Create",
    allFilter: "All",
    photosFilter: "Photos",
    videosFilter: "Videos",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    filesSelected: "files selected",
    mediaFilesHeader: "Media Files",
    selectedOfTotal: (sel, tot) => `${sel} of ${tot} selected`,
    foldersHeader: "Folders",
    emptyFolder: "Empty folder or missing read permissions.",
    selectedPathLabel: "Selected Path:",
    noneSelected: "None selected",
    forTransfer: "to transfer",
    cancel: "Cancel",
    selectThisFolder: "Select this folder",
    confirmFiles: "Confirm selection",
    upLevel: "Up one level",
    refresh: "Refresh",
    photosCount: "photos",
    itemsCount: "items",
  },
  ar: {
    quickAccess: "الوصول السريع:",
    thisDeviceWin: "هذا الجهاز",
    thisDeviceMac: "/Volumes",
    go: "انتقال",
    newFolder: "مجلد جديد",
    createNewFolderPlaceholder: "اسم المجلد الجديد...",
    create: "إنشاء",
    allFilter: "الكل",
    photosFilter: "الصور",
    videosFilter: "الفيديوهات",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء التحديد",
    filesSelected: "ملفات محددة",
    mediaFilesHeader: "ملفات الوسائط",
    selectedOfTotal: (sel, tot) => `${sel} من ${tot} محددة`,
    foldersHeader: "المجلدات",
    emptyFolder: "المجلد فارغ أو لا توجد صلاحيات قراءة.",
    selectedPathLabel: "المسار المحدد:",
    noneSelected: "لم يتم التحديد",
    forTransfer: "للنقل",
    cancel: "إلغاء",
    selectThisFolder: "تحديد هذا المجلد",
    confirmFiles: "تأكيد التحديد",
    upLevel: "المستوى الأعلى",
    refresh: "تحديث",
    photosCount: "صور",
    itemsCount: "عناصر",
  },
}

export function FileExplorerModal({
  open,
  onOpenChange,
  mode,
  initialPath,
  title,
  description,
  onSelect
}: FileExplorerModalProps) {
  const { t, language } = useLanguage()
  const activeLang = (["es", "fr", "en", "ar"].includes(language) ? language : "fr") as ExplorerLang
  const expT = EXPLORER_I18N[activeLang]
  const isRTL = activeLang === "ar"

  const [currentPath, setCurrentPath] = useState(initialPath || "")
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<ExplorerEntry[]>([])
  const [shortcuts, setShortcuts] = useState<ExplorerShortcut[]>([])
  const [platform, setPlatform] = useState<"win32" | "darwin" | "linux">("win32")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Path input bar state
  const [pathInput, setPathInput] = useState("")

  // Search filter inside current directory
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaFilter, setMediaFilter] = useState<"all" | "photos" | "videos">("all")

  // File selection state (for mode === "files")
  const [selectedFileNames, setSelectedFileNames] = useState<Set<string>>(new Set())

  // New Folder creation state
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Cargar ruta
  const loadPath = async (targetPath?: string) => {
    setLoading(true)
    setError(null)
    setShowNewFolderInput(false)
    setNewFolderName("")
    setSearchQuery("")

    try {
      const q = targetPath !== undefined ? targetPath : currentPath
      const url = `/api/fs/explore?path=${encodeURIComponent(q)}&showFiles=${mode === "files"}`
      const res = await fetch(url, { cache: "no-store" })
      const data: ExplorerResult = await res.json()

      if (!data.success) {
        setError(data.error || "No se pudo acceder a la carpeta.")
      } else {
        setCurrentPath(data.currentPath)
        setPathInput(data.currentPath)
        setParentPath(data.parentPath)
        setPlatform(data.platform)
        setShortcuts(data.shortcuts || [])
        setEntries(data.entries || [])

        // Por defecto en modo files, si no había selección previa o cambia de carpeta, pre-seleccionar todos los archivos multimedia
        if (mode === "files") {
          const mediaFiles = data.entries.filter(e => !e.isDirectory && (e.mediaType === "photo" || e.mediaType === "video"))
          setSelectedFileNames(new Set(mediaFiles.map(f => f.name)))
        }
      }
    } catch (err: any) {
      setError(err?.message || "Error al conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  // Cargar al abrir
  useEffect(() => {
    if (open) {
      loadPath(initialPath || "")
    }
  }, [open, initialPath])

  // Crear nueva carpeta (útil para destino SSD)
  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim() || !currentPath) return
    setCreatingFolder(true)
    try {
      const res = await fetch("/api/fs/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mkdir",
          parentPath: currentPath,
          folderName: newFolderName.trim()
        })
      })
      const data = await res.json()
      if (data.success && data.createdPath) {
        setShowNewFolderInput(false)
        setNewFolderName("")
        await loadPath(data.createdPath)
      } else {
        alert(data.error || "No se pudo crear la carpeta.")
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setCreatingFolder(false)
    }
  }

  // Filtrado de elementos
  const filteredEntries = useMemo(() => {
    let list = entries
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(e => e.name.toLowerCase().includes(q))
    }
    if (mediaFilter === "photos") {
      list = list.filter(e => e.isDirectory || e.mediaType === "photo")
    } else if (mediaFilter === "videos") {
      list = list.filter(e => e.isDirectory || e.mediaType === "video")
    }
    return list
  }, [entries, searchQuery, mediaFilter])

  const folders = useMemo(() => filteredEntries.filter(e => e.isDirectory), [filteredEntries])
  const files = useMemo(() => filteredEntries.filter(e => !e.isDirectory), [filteredEntries])

  // Selección de archivos
  const toggleSelectFile = (name: string) => {
    setSelectedFileNames(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleSelectAllFiles = () => {
    setSelectedFileNames(new Set(files.map(f => f.name)))
  }

  const handleDeselectAllFiles = () => {
    setSelectedFileNames(new Set())
  }

  // Confirmar selección
  const handleConfirm = () => {
    if (!currentPath || currentPath === "Este Equipo" || currentPath === "Ce PC" || currentPath === "This PC") {
      alert("Por favor selecciona una carpeta o unidad específica.")
      return
    }

    if (mode === "files") {
      const filesArray = Array.from(selectedFileNames)
      onSelect(currentPath, filesArray.length > 0 ? filesArray : undefined)
    } else {
      onSelect(currentPath)
    }
    onOpenChange(false)
  }

  // Segmentos de ruta para breadcrumb
  const breadcrumbSegments = useMemo(() => {
    if (!currentPath || currentPath === "Este Equipo" || currentPath === "Ce PC" || currentPath === "This PC") {
      return [{ label: platform === "darwin" ? expT.thisDeviceMac : expT.thisDeviceWin, path: "" }]
    }

    const isWin = platform === "win32"
    const parts = currentPath.split(/[\\/]+/).filter(Boolean)
    const segments: Array<{ label: string; path: string }> = []
    
    // Raíz
    if (isWin) {
      let accumulated = ""
      parts.forEach((p, idx) => {
        if (idx === 0) {
          accumulated = `${p}\\`
          segments.push({ label: p, path: accumulated })
        } else {
          accumulated = `${accumulated}${p}\\`
          segments.push({ label: p, path: accumulated.replace(/\\$/, "") })
        }
      })
    } else {
      let accumulated = ""
      segments.push({ label: "/", path: "/" })
      parts.forEach(p => {
        accumulated += `/${p}`
        segments.push({ label: p, path: accumulated })
      })
    }

    return segments
  }, [currentPath, platform, expT])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        dir={isRTL ? "rtl" : "ltr"}
        className="sm:max-w-4xl bg-[#12100e] [html.light_&]:bg-[#ffffff] border border-[#2a241e] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] p-0 shadow-2xl rounded-2xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-[#241f1a] [html.light_&]:border-[#e6dfcf] bg-[#161310] [html.light_&]:bg-[#faf7f0] flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] [html.light_&]:text-[#9b7538] shrink-0">
              {mode === "files" ? <Camera className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-serif font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">
                  {title}
                </DialogTitle>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#201c17] [html.light_&]:bg-[#f4efe4] text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#382f25] [html.light_&]:border-[#c69f68]/30 flex items-center gap-1">
                  {platform === "darwin" ? <Apple className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                  <span>{platform === "darwin" ? "macOS" : "Windows"}</span>
                </span>
              </div>
              <p className="text-xs text-[#8c7a6b] [html.light_&]:text-[#786b5e] mt-0.5">
                {description || (mode === "files" ? t.explorerTitleSource : t.explorerTitleTarget)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Shortcuts Bar (Unidades, SDs y Carpetas Clave) - Con altura holgada y scrollbar ultra fino */}
        <div className="px-4 py-3 bg-[#0d0c0a] [html.light_&]:bg-[#f7f4ec] border-b border-[#201c18] [html.light_&]:border-[#e6dfcf] flex items-center gap-2 overflow-x-auto text-xs min-h-[52px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c69f68]/30 hover:[&::-webkit-scrollbar-thumb]:bg-[#c69f68]/60 [&::-webkit-scrollbar-track]:bg-transparent">
          <span className="text-[10px] uppercase font-bold text-[#8c7a6b] [html.light_&]:text-[#786b5e] shrink-0 tracking-wider">
            {expT.quickAccess}
          </span>
          <button
            type="button"
            onClick={() => loadPath("")}
            className="h-8 px-3 rounded-lg bg-[#181512] [html.light_&]:bg-[#ffffff] hover:bg-[#25201b] [html.light_&]:hover:bg-[#f0ebe0] text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#332b23] [html.light_&]:border-[#d5cbb8] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
          >
            {platform === "darwin" ? <Apple className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span>{platform === "darwin" ? expT.thisDeviceMac : expT.thisDeviceWin}</span>
          </button>

          {shortcuts.map(sc => {
            const isCardOrRemovable = sc.icon === "camera" || sc.isRemovable
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => loadPath(sc.path)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors border shadow-xs cursor-pointer",
                  isCardOrRemovable
                    ? "bg-amber-950/30 [html.light_&]:bg-amber-100/90 hover:bg-amber-950/50 [html.light_&]:hover:bg-amber-200/90 text-amber-300 [html.light_&]:text-amber-900 border-amber-700/40 [html.light_&]:border-amber-400/60"
                    : "bg-[#181512] [html.light_&]:bg-[#ffffff] hover:bg-[#25201b] [html.light_&]:hover:bg-[#f0ebe0] text-[#d6cdbe] [html.light_&]:text-[#2c2621] border-[#332b23] [html.light_&]:border-[#d5cbb8] hover:text-white [html.light_&]:hover:text-black"
                )}
              >
                {sc.icon === "camera" ? (
                  <Camera className="w-3.5 h-3.5 text-amber-400 [html.light_&]:text-amber-700 shrink-0" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5 text-[#c69f68] [html.light_&]:text-[#9b7538] shrink-0" />
                )}
                <span className="whitespace-nowrap">{sc.label}</span>
              </button>
            )
          })}
        </div>

        {/* Navigation & Address Bar */}
        <div className="p-3 bg-[#141210] [html.light_&]:bg-[#faf7f0] border-b border-[#241f1a] [html.light_&]:border-[#e6dfcf] flex items-center gap-2">
          {/* Botón Subir Nivel */}
          <button
            type="button"
            onClick={() => parentPath !== null && loadPath(parentPath)}
            disabled={parentPath === null || loading}
            title={expT.upLevel}
            className="p-2 rounded-xl bg-[#1c1814] [html.light_&]:bg-[#ffffff] hover:bg-[#29231d] [html.light_&]:hover:bg-[#f0ebe0] disabled:opacity-40 text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#332b23] [html.light_&]:border-[#d5cbb8] transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* Botón Refrescar */}
          <button
            type="button"
            onClick={() => loadPath(currentPath)}
            disabled={loading}
            title={expT.refresh}
            className="p-2 rounded-xl bg-[#1c1814] [html.light_&]:bg-[#ffffff] hover:bg-[#29231d] [html.light_&]:hover:bg-[#f0ebe0] text-[#a89f91] [html.light_&]:text-[#6b5f54] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917] border border-[#332b23] [html.light_&]:border-[#d5cbb8] transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-[#c69f68] [html.light_&]:text-[#9b7538]")} />
          </button>

          {/* Input de Ruta con salto directo */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  loadPath(pathInput)
                }
              }}
              placeholder={platform === "darwin" ? "/Volumes/..." : "C:\\..."}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0b0a09] [html.light_&]:bg-[#ffffff] border border-[#2b241e] [html.light_&]:border-[#d5cbb8] text-xs font-mono text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:border-[#c69f68] outline-none shadow-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => loadPath(pathInput)}
            className="px-3.5 py-1.5 rounded-xl bg-[#201c18] [html.light_&]:bg-[#ede7da] hover:bg-[#2d2620] [html.light_&]:hover:bg-[#e2dacb] text-[#c69f68] [html.light_&]:text-[#9b7538] font-bold text-xs border border-[#3d3227] [html.light_&]:border-[#d5cbb8] transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            {expT.go}
          </button>

          {/* Crear Nueva Carpeta (especialmente para SSD destino) */}
          <button
            type="button"
            onClick={() => setShowNewFolderInput(v => !v)}
            className="px-3 py-1.5 rounded-xl bg-[#1b1713] [html.light_&]:bg-[#ede7da] hover:bg-[#26201a] [html.light_&]:hover:bg-[#e2dacb] text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#3d3227] [html.light_&]:border-[#d5cbb8] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{expT.newFolder}</span>
          </button>
        </div>

        {/* Input inline para crear nueva carpeta */}
        {showNewFolderInput && (
          <div className="p-3 bg-[#181410] [html.light_&]:bg-[#fdfbf7] border-b border-[#332b23] [html.light_&]:border-[#e6dfcf] flex items-center gap-2 animate-in fade-in">
            <Folder className="w-4 h-4 text-[#c69f68] [html.light_&]:text-[#9b7538]" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateNewFolder()}
              placeholder={expT.createNewFolderPlaceholder}
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0b0a09] [html.light_&]:bg-[#ffffff] border border-[#332b23] [html.light_&]:border-[#d5cbb8] text-xs text-[#f5f2eb] [html.light_&]:text-[#1c1917] outline-none focus:border-[#c69f68]"
            />
            <button
              type="button"
              onClick={handleCreateNewFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] font-bold text-xs disabled:opacity-40 cursor-pointer transition-colors"
            >
              {expT.create}
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolderInput(false)}
              className="p-1 text-[#8c7a6b] hover:text-white [html.light_&]:hover:text-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Breadcrumb Path Bar */}
        <div className="px-4 py-2 bg-[#0e0d0b] [html.light_&]:bg-[#f4efe4] border-b border-[#1f1a16] [html.light_&]:border-[#e6dfcf] flex items-center gap-1 overflow-x-auto text-[11px] scrollbar-thin">
          {breadcrumbSegments.map((seg, idx) => (
            <div key={seg.path || idx} className="flex items-center gap-1 shrink-0">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-[#554c42] [html.light_&]:text-[#8c7a6b]" />}
              <button
                type="button"
                onClick={() => loadPath(seg.path)}
                className="px-1.5 py-0.5 rounded hover:bg-[#1f1a16] [html.light_&]:hover:bg-[#e8e2d4] text-[#a89f91] [html.light_&]:text-[#6b5f54] hover:text-[#c69f68] [html.light_&]:hover:text-[#9b7538] font-medium transition-colors cursor-pointer"
              >
                {seg.label}
              </button>
            </div>
          ))}
        </div>

        {/* Search & Selection Controls (en modo files) */}
        {mode === "files" && (
          <div className="px-4 py-2 bg-[#12100e] [html.light_&]:bg-[#faf7f0] border-b border-[#201c18] [html.light_&]:border-[#e6dfcf] flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Filtros rápidos de medios */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMediaFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer", 
                  mediaFilter === "all" 
                    ? "bg-[#c69f68] text-black shadow-xs font-bold" 
                    : "bg-[#1c1814] [html.light_&]:bg-[#ede7da] text-[#8c7a6b] [html.light_&]:text-[#6b5f54] hover:text-white [html.light_&]:hover:text-black"
                )}
              >
                {expT.allFilter} ({files.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter("photos")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer", 
                  mediaFilter === "photos" 
                    ? "bg-[#c69f68] text-black shadow-xs font-bold" 
                    : "bg-[#1c1814] [html.light_&]:bg-[#ede7da] text-[#8c7a6b] [html.light_&]:text-[#6b5f54] hover:text-white [html.light_&]:hover:text-black"
                )}
              >
                {expT.photosFilter} ({files.filter(f => f.mediaType === "photo").length})
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter("videos")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer", 
                  mediaFilter === "videos" 
                    ? "bg-[#c69f68] text-black shadow-xs font-bold" 
                    : "bg-[#1c1814] [html.light_&]:bg-[#ede7da] text-[#8c7a6b] [html.light_&]:text-[#6b5f54] hover:text-white [html.light_&]:hover:text-black"
                )}
              >
                {expT.videosFilter} ({files.filter(f => f.mediaType === "video").length})
              </button>
            </div>

            {/* Acciones de selección masiva */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiles}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#1a1713] [html.light_&]:bg-[#ffffff] hover:bg-[#26201a] [html.light_&]:hover:bg-[#f0ebe0] text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#332b23] [html.light_&]:border-[#d5cbb8] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{expT.selectAll}</span>
              </button>
              <button
                type="button"
                onClick={handleDeselectAllFiles}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#1a1713] [html.light_&]:bg-[#ffffff] hover:bg-[#26201a] [html.light_&]:hover:bg-[#f0ebe0] text-[#8c7a6b] [html.light_&]:text-[#6b5f54] hover:text-white [html.light_&]:hover:text-black border border-[#332b23] [html.light_&]:border-[#d5cbb8] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{expT.deselectAll}</span>
              </button>
              <span className="text-[11px] text-emerald-400 [html.light_&]:text-emerald-700 font-bold ml-1">
                {selectedFileNames.size} {expT.filesSelected}
              </span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="m-4 p-3 rounded-xl bg-red-950/40 [html.light_&]:bg-red-50 border border-red-800/50 [html.light_&]:border-red-200 text-red-300 [html.light_&]:text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 [html.light_&]:text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Explorer Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh] min-h-[300px] bg-[#12100e] [html.light_&]:bg-[#faf7f0]/60">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#c69f68] [html.light_&]:text-[#9b7538]">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs text-[#8c7a6b] [html.light_&]:text-[#786b5e]">{t.loadingText}</span>
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#70665a] [html.light_&]:text-[#786b5e]">
              <FolderOpen className="w-8 h-8 text-[#4a4137] [html.light_&]:text-[#a89f91]" />
              <p className="text-xs">{expT.emptyFolder}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sección Carpetas / Unidades */}
              {folders.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-[#70665a] [html.light_&]:text-[#786b5e] tracking-wider mb-2">
                    {expT.foldersHeader} ({folders.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {folders.map(folder => (
                      <div
                        key={folder.path}
                        onClick={() => loadPath(folder.path)}
                        className="p-2.5 rounded-xl bg-[#161310] [html.light_&]:bg-[#ffffff] hover:bg-[#201c17] [html.light_&]:hover:bg-[#fbf9f4] border border-[#26211c] [html.light_&]:border-[#e6dfcf] hover:border-[#c69f68]/50 [html.light_&]:hover:border-[#9b7538]/60 flex items-center justify-between gap-2.5 cursor-pointer transition-all group shadow-sm hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            folder.hasDcim 
                              ? "bg-amber-950/40 [html.light_&]:bg-amber-50 text-amber-400 [html.light_&]:text-amber-800 border-amber-700/50 [html.light_&]:border-amber-300" 
                              : "bg-[#201c18] [html.light_&]:bg-[#f4efe4] text-[#c69f68] [html.light_&]:text-[#9b7538] border-[#332b23] [html.light_&]:border-[#c69f68]/30"
                          )}>
                            {folder.hasDcim ? <Camera className="w-4 h-4" /> : <Folder className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[#f5f2eb] [html.light_&]:text-[#1c1917] truncate block group-hover:text-[#c69f68] [html.light_&]:group-hover:text-[#9b7538] transition-colors">
                              {folder.name}
                            </span>
                            <div className="text-[10px] text-[#70665a] [html.light_&]:text-[#786b5e] flex items-center gap-1.5">
                              {folder.hasDcim && <span className="text-amber-400 [html.light_&]:text-amber-700 font-bold">DCIM</span>}
                              {folder.photoCount ? <span>{folder.photoCount} {expT.photosCount}</span> : null}
                              {folder.childCount !== undefined && <span>{folder.childCount} {expT.itemsCount}</span>}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#554c42] [html.light_&]:text-[#a89f91] group-hover:text-[#c69f68] [html.light_&]:group-hover:text-[#9b7538] shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Archivos Multimedia */}
              {mode === "files" && files.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-[#70665a] [html.light_&]:text-[#786b5e] tracking-wider mb-2 flex items-center justify-between">
                    <span>{expT.mediaFilesHeader} ({files.length})</span>
                    <span className="text-emerald-400 [html.light_&]:text-emerald-700 font-normal">
                      {expT.selectedOfTotal(selectedFileNames.size, files.length)}
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {files.map(file => {
                      const isSelected = selectedFileNames.has(file.name)
                      return (
                        <div
                          key={file.path}
                          onClick={() => toggleSelectFile(file.name)}
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all",
                            isSelected
                              ? "bg-[#1c1813] [html.light_&]:bg-[#fdf9f0] border-[#c69f68] [html.light_&]:border-[#c69f68] shadow-sm shadow-[#c69f68]/10"
                              : "bg-[#141210] [html.light_&]:bg-[#ffffff] border-[#241f1a] [html.light_&]:border-[#e6dfcf] hover:bg-[#1a1713] [html.light_&]:hover:bg-[#fbf9f4] opacity-85 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors",
                              isSelected 
                                ? "bg-[#c69f68] text-black border-[#c69f68]" 
                                : "bg-[#0b0a09] [html.light_&]:bg-[#f4efe4] text-transparent border-[#3d3227] [html.light_&]:border-[#d5cbb8]"
                            )}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-[#f5f2eb] [html.light_&]:text-[#1c1917] truncate block">
                                {file.name}
                              </span>
                              <div className="text-[10px] text-[#8c7a6b] [html.light_&]:text-[#786b5e] flex items-center gap-1.5">
                                <span className={cn(
                                  "font-bold uppercase text-[9px] px-1 py-0.2 rounded",
                                  file.mediaType === "photo" 
                                    ? "bg-amber-950/50 [html.light_&]:bg-amber-100 text-amber-300 [html.light_&]:text-amber-800" 
                                    : "bg-indigo-950/50 [html.light_&]:bg-indigo-100 text-indigo-300 [html.light_&]:text-indigo-800"
                                )}>
                                  {file.extension || file.mediaType}
                                </span>
                                {file.size && (
                                  <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / Confirm Controls */}
        <div className="p-4 bg-[#141210] [html.light_&]:bg-[#faf7f0] border-t border-[#26211c] [html.light_&]:border-[#e6dfcf] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="min-w-0 text-center sm:text-left rtl:sm:text-right">
            <span className="text-[10px] uppercase font-bold text-[#8c7a6b] [html.light_&]:text-[#786b5e] block">
              {expT.selectedPathLabel}
            </span>
            <span className="text-xs font-mono text-[#c69f68] [html.light_&]:text-[#9b7538] font-bold truncate block max-w-md">
              {currentPath || expT.noneSelected}
            </span>
            {mode === "files" && (
              <span className="text-[11px] text-[#a89f91] [html.light_&]:text-[#786b5e]">
                {selectedFileNames.size} {expT.filesSelected} {expT.forTransfer}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#1c1814] [html.light_&]:bg-[#ffffff] hover:bg-[#26211a] [html.light_&]:hover:bg-[#f0ebe0] text-[#8c7a6b] [html.light_&]:text-[#6b5f54] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917] font-semibold text-xs border border-[#332b23] [html.light_&]:border-[#d5cbb8] transition-colors cursor-pointer shadow-xs"
            >
              {expT.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{mode === "files" ? expT.confirmFiles : expT.selectThisFolder}</span>
            </button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
