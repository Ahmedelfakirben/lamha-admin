const fs = require("fs")
const path = require("path")
const EventEmitter = require("events")

/**
 * Windows Hardware Watcher para Tarjetas SD y Unidades USB
 * Monitorea letras de unidad (D:\ hasta J:\) buscando la presencia de DCIM o archivos multimedia
 */
class WindowsDriveWatcher extends EventEmitter {
  constructor(pollIntervalMs = 2500) {
    super()
    this.pollIntervalMs = pollIntervalMs
    this.timer = null
    this.knownCards = new Map() // driveLetter -> { dcimPath, fileCount, lastSeen }
    this.driveLetters = ["D", "E", "F", "G", "H", "I", "J", "K"]
    this.extensions = new Set([
      ".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2",
      ".jpg", ".jpeg", ".mp4", ".mov", ".mkv", ".braw", ".prores"
    ])
  }

  start() {
    if (this.timer) return
    this.scan()
    this.timer = setInterval(() => this.scan(), this.pollIntervalMs)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  scan() {
    const currentFound = new Set()

    for (const letter of this.driveLetters) {
      const driveRoot = `${letter}:\\`
      try {
        if (!fs.existsSync(driveRoot)) continue

        const dcimPath = path.join(driveRoot, "DCIM")
        let targetPath = null
        let count = 0

        if (fs.existsSync(dcimPath)) {
          targetPath = dcimPath
          count = this.countFiles(dcimPath, 2)
        } else {
          // Si no hay DCIM directo, revisar si tiene fotos en la raíz
          const rootCount = this.countFiles(driveRoot, 1)
          if (rootCount >= 5) {
            targetPath = driveRoot
            count = rootCount
          }
        }

        if (targetPath && count > 0) {
          currentFound.add(letter)

          if (!this.knownCards.has(letter)) {
            // ¡Nueva tarjeta insertada!
            const cardInfo = {
              letter,
              drive: driveRoot,
              path: targetPath,
              count,
              detectedAt: Date.now()
            }
            this.knownCards.set(letter, cardInfo)
            this.emit("card-inserted", cardInfo)
          }
        }
      } catch (err) {
        // La unidad puede estar ocupada o bloqueada temporalmente
      }
    }

    // Detectar extracciones
    for (const [letter, info] of this.knownCards.entries()) {
      if (!currentFound.has(letter)) {
        this.knownCards.delete(letter)
        this.emit("card-removed", info)
      }
    }
  }

  countFiles(dirPath, maxDepth = 2, currentDepth = 0) {
    if (currentDepth > maxDepth) return 0
    let count = 0
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (this.extensions.has(ext)) count++
        } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
          count += this.countFiles(path.join(dirPath, entry.name), maxDepth, currentDepth + 1)
        }
      }
    } catch {}
    return count
  }

  getActiveCards() {
    return Array.from(this.knownCards.values())
  }
}

/**
 * Observador de carpetas 03_Edicion_Master
 * Vigila C:\Lamha-Storage (y secundariamente D:, E:) en busca de archivos nuevos o exportados
 */
class MasterFolderWatcher extends EventEmitter {
  constructor(baseRoots = ["C:\\Lamha-Storage", "D:\\Lamha-Storage", "E:\\Lamha-Storage"], pollIntervalMs = 3000) {
    super()
    this.baseRoots = baseRoots
    this.pollIntervalMs = pollIntervalMs
    this.timer = null
    this.processedFiles = new Map() // filePath -> { size, mtime }
    this.stabilizingFiles = new Map() // filePath -> { size, mtime, checks }
    this.validExtensions = new Set([
      ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff",
      ".mp4", ".mov", ".mkv", ".mxf", ".braw", ".prores", ".avi"
    ])
    this.masterFolderRegex = /03[_-\s]?(?:Edicion|Edition|Édition)[_-\s]?Master/i
  }

  start() {
    if (this.timer) return
    this.initialIndex()
    this.timer = setInterval(() => this.scan(), this.pollIntervalMs)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  // Indexar archivos ya existentes al arrancar para no volver a sincronizarlos
  initialIndex() {
    for (const root of this.baseRoots) {
      if (!fs.existsSync(root)) continue
      try {
        const projects = fs.readdirSync(root, { withFileTypes: true })
        for (const proj of projects) {
          if (!proj.isDirectory() || proj.name.startsWith(".")) continue
          const projPath = path.join(root, proj.name)
          let subdirs = []
          try {
            subdirs = fs.readdirSync(projPath, { withFileTypes: true })
          } catch { continue }

          for (const sub of subdirs) {
            if (sub.isDirectory() && this.masterFolderRegex.test(sub.name)) {
              const masterPath = path.join(projPath, sub.name)
              let files = []
              try {
                files = fs.readdirSync(masterPath, { withFileTypes: true })
              } catch { continue }

              for (const f of files) {
                if (f.isFile() && !f.name.startsWith(".")) {
                  const fPath = path.join(masterPath, f.name)
                  try {
                    const st = fs.statSync(fPath)
                    this.processedFiles.set(fPath, { size: st.size, mtime: st.mtimeMs })
                  } catch {}
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  scan() {
    for (const root of this.baseRoots) {
      if (!fs.existsSync(root)) continue
      try {
        const projects = fs.readdirSync(root, { withFileTypes: true })
        for (const proj of projects) {
          if (!proj.isDirectory() || proj.name.startsWith(".")) continue
          const projectFolder = proj.name
          const projPath = path.join(root, projectFolder)

          let masterSubdirs = []
          try {
            masterSubdirs = fs.readdirSync(projPath, { withFileTypes: true })
          } catch { continue }

          for (const sub of masterSubdirs) {
            if (sub.isDirectory() && this.masterFolderRegex.test(sub.name)) {
              const masterPath = path.join(projPath, sub.name)
              let entries = []
              try {
                entries = fs.readdirSync(masterPath, { withFileTypes: true })
              } catch { continue }

              for (const entry of entries) {
                if (!entry.isFile()) continue
                const fileName = entry.name
                if (fileName.startsWith(".") || fileName.startsWith("~$") || fileName.endsWith(".tmp") || fileName.endsWith(".crswap")) {
                  continue
                }
                const ext = path.extname(fileName).toLowerCase()
                if (!this.validExtensions.has(ext)) continue

                const fullPath = path.join(masterPath, fileName)
                let stat
                try {
                  stat = fs.statSync(fullPath)
                } catch { continue }

                // Si ya fue procesado con el mismo tamaño y mtime, omitir
                const prev = this.processedFiles.get(fullPath)
                if (prev && prev.size === stat.size && prev.mtime === stat.mtimeMs) {
                  continue
                }

                // Debounce para asegurar que el archivo terminó de copiarse/exportarse
                const stab = this.stabilizingFiles.get(fullPath)
                if (!stab) {
                  this.stabilizingFiles.set(fullPath, { size: stat.size, mtime: stat.mtimeMs, checks: 1 })
                  continue
                }

                if (stab.size === stat.size && stat.size > 0) {
                  // ¡Archivo completado y estable!
                  this.stabilizingFiles.delete(fullPath)
                  this.processedFiles.set(fullPath, { size: stat.size, mtime: stat.mtimeMs })
                  
                  const isVideo = [".mp4", ".mov", ".mkv", ".mxf", ".braw", ".prores", ".avi"].includes(ext)
                  this.emit("master-file-added", {
                    projectFolder,
                    masterSubfolder: sub.name,
                    masterPath,
                    filePath: fullPath,
                    fileName,
                    ext,
                    size: stat.size,
                    isVideo,
                  })
                } else {
                  // Todavía se está escribiendo (el tamaño cambió)
                  this.stabilizingFiles.set(fullPath, { size: stat.size, mtime: stat.mtimeMs, checks: stab.checks + 1 })
                }
              }
            }
          }
        }
      } catch {}
    }
  }
}

module.exports = {
  WindowsDriveWatcher,
  MasterFolderWatcher,
}
