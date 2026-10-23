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

module.exports = {
  WindowsDriveWatcher,
}
