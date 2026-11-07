const fs = require("fs")
const path = require("path")
const EventEmitter = require("events")

/**
 * Windows Hardware Watcher para Tarjetas SD y Unidades USB (100% Asíncrono / No Bloqueante)
 * Monitorea letras de unidad (D:\ hasta K:\) buscando la presencia de DCIM o archivos multimedia
 * sin bloquear el hilo principal de Electron.
 */
class WindowsDriveWatcher extends EventEmitter {
  constructor(pollIntervalMs = 3500) {
    super()
    this.pollIntervalMs = pollIntervalMs
    this.timer = null
    this.isScanning = false
    this.knownCards = new Map() // driveLetter -> { dcimPath, fileCount, lastSeen }
    this.driveLetters = ["D", "E", "F", "G", "H", "I", "J", "K"]
    this.extensions = new Set([
      ".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2",
      ".jpg", ".jpeg", ".mp4", ".mov", ".mkv", ".braw", ".prores"
    ])
  }

  start() {
    if (this.timer) return
    this.scan().catch(() => {})
    this.timer = setInterval(() => {
      this.scan().catch(() => {})
    }, this.pollIntervalMs)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async scan() {
    if (this.isScanning) return
    this.isScanning = true
    try {
      const currentFound = new Set()

      for (const letter of this.driveLetters) {
        const driveRoot = `${letter}:\\`
        try {
          await fs.promises.access(driveRoot)

          const dcimPath = path.join(driveRoot, "DCIM")
          let targetPath = null
          let count = 0

          let hasDcim = false
          try {
            await fs.promises.access(dcimPath)
            hasDcim = true
          } catch {}

          if (hasDcim) {
            targetPath = dcimPath
            if (this.knownCards.has(letter)) {
              // Si la tarjeta ya estaba insertada, reutilizar el conteo sin re-escanear todos sus archivos cada 3.5s
              count = this.knownCards.get(letter).count
            } else {
              count = await this.countFilesAsync(dcimPath, 2)
            }
          } else {
            if (this.knownCards.has(letter)) {
              targetPath = driveRoot
              count = this.knownCards.get(letter).count
            } else {
              const rootCount = await this.countFilesAsync(driveRoot, 1)
              if (rootCount >= 5) {
                targetPath = driveRoot
                count = rootCount
              }
            }
          }

          if (targetPath && count > 0) {
            currentFound.add(letter)

            if (!this.knownCards.has(letter)) {
              const cardInfo = {
                letter,
                drive: driveRoot,
                path: targetPath,
                dcimPath: targetPath,
                count,
                detectedAt: Date.now()
              }
              this.knownCards.set(letter, cardInfo)
              this.emit("card-inserted", cardInfo)
            }
          }
        } catch {
          // Unidad no insertada u ocupada
        }
      }

      for (const [letter, info] of this.knownCards.entries()) {
        if (!currentFound.has(letter)) {
          this.knownCards.delete(letter)
          this.emit("card-removed", info)
        }
      }
    } finally {
      this.isScanning = false
    }
  }

  async countFilesAsync(dirPath, maxDepth = 2, currentDepth = 0) {
    if (currentDepth > maxDepth) return 0
    let count = 0
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (this.extensions.has(ext)) count++
        } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
          count += await this.countFilesAsync(path.join(dirPath, entry.name), maxDepth, currentDepth + 1)
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
 * Observador Asíncrono de carpetas 03_Edicion_Master
 * Vigila C:\Lamha-Storage (y secundariamente D:, E:) en busca de archivos nuevos o exportados
 * sin bloquear el hilo principal de Electron.
 */
class MasterFolderWatcher extends EventEmitter {
  constructor(baseRoots = ["C:\\Lamha-Storage", "D:\\Lamha-Storage", "E:\\Lamha-Storage"], pollIntervalMs = 5000) {
    super()
    this.baseRoots = baseRoots
    this.pollIntervalMs = pollIntervalMs
    this.timer = null
    this.isScanning = false
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
    this.initialIndexAsync().then(() => {
      if (!this.timer) {
        this.timer = setInterval(() => {
          this.scan().catch(() => {})
        }, this.pollIntervalMs)
      }
    }).catch(() => {})
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async initialIndexAsync() {
    for (const root of this.baseRoots) {
      try {
        await fs.promises.access(root)
      } catch {
        continue
      }
      try {
        const projects = await fs.promises.readdir(root, { withFileTypes: true })
        for (const proj of projects) {
          if (!proj.isDirectory() || proj.name.startsWith(".")) continue
          const projPath = path.join(root, proj.name)
          let subdirs = []
          try {
            subdirs = await fs.promises.readdir(projPath, { withFileTypes: true })
          } catch {
            continue
          }

          for (const sub of subdirs) {
            if (sub.isDirectory() && this.masterFolderRegex.test(sub.name)) {
              const masterPath = path.join(projPath, sub.name)
              let files = []
              try {
                files = await fs.promises.readdir(masterPath, { withFileTypes: true })
              } catch {
                continue
              }

              for (const f of files) {
                if (f.isFile() && !f.name.startsWith(".")) {
                  const fPath = path.join(masterPath, f.name)
                  try {
                    const st = await fs.promises.stat(fPath)
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

  async scan() {
    if (this.isScanning) return
    this.isScanning = true
    try {
      for (const root of this.baseRoots) {
        try {
          await fs.promises.access(root)
        } catch {
          continue
        }
        try {
          const projects = await fs.promises.readdir(root, { withFileTypes: true })
          for (const proj of projects) {
            if (!proj.isDirectory() || proj.name.startsWith(".")) continue
            const projectFolder = proj.name
            const projPath = path.join(root, projectFolder)

            let masterSubdirs = []
            try {
              masterSubdirs = await fs.promises.readdir(projPath, { withFileTypes: true })
            } catch {
              continue
            }

            for (const sub of masterSubdirs) {
              if (sub.isDirectory() && this.masterFolderRegex.test(sub.name)) {
                const masterPath = path.join(projPath, sub.name)
                let entries = []
                try {
                  entries = await fs.promises.readdir(masterPath, { withFileTypes: true })
                } catch {
                  continue
                }

                for (const entry of entries) {
                  if (!entry.isFile()) continue
                  const fileName = entry.name
                  if (
                    fileName.startsWith(".") ||
                    fileName.startsWith("~$") ||
                    fileName.endsWith(".tmp") ||
                    fileName.endsWith(".crswap")
                  ) {
                    continue
                  }
                  const ext = path.extname(fileName).toLowerCase()
                  if (!this.validExtensions.has(ext)) continue

                  const fullPath = path.join(masterPath, fileName)
                  let stat
                  try {
                    stat = await fs.promises.stat(fullPath)
                  } catch {
                    continue
                  }

                  const prev = this.processedFiles.get(fullPath)
                  if (prev && prev.size === stat.size && prev.mtime === stat.mtimeMs) {
                    continue
                  }

                  const stab = this.stabilizingFiles.get(fullPath)
                  if (!stab) {
                    this.stabilizingFiles.set(fullPath, { size: stat.size, mtime: stat.mtimeMs, checks: 1 })
                    continue
                  }

                  if (stab.size === stat.size && stat.size > 0) {
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
                    this.stabilizingFiles.set(fullPath, {
                      size: stat.size,
                      mtime: stat.mtimeMs,
                      checks: stab.checks + 1,
                    })
                  }
                }
              }
            }
          }
        } catch {}
      }
    } finally {
      this.isScanning = false
    }
  }
}

module.exports = {
  WindowsDriveWatcher,
  MasterFolderWatcher,
}
