/**
 * Lamha Studios Ingest Companion — Local Bridge Server
 * 
 * Permite que el portal web (admin.lam7a.ma) o cualquier navegador en este PC
 * detecte la app de escritorio y lance ingestas de tarjetas locales directamente.
 */
const http = require("http")
const url = require("url")
const {
  getConfig,
  probeTcpPort,
  resolveActiveNasRoute,
  findAvailableSmbShareAsync,
  syncConfigFromSupabase,
} = require("./config")

const BRIDGE_PORT = 41890

class LamhaBridgeServer {
  constructor({ onStartIngest, onShowMain, onConfigReloaded, getStatus, getCards, getRetentionStatus }) {
    this.onStartIngest = onStartIngest
    this.onShowMain = onShowMain
    this.onConfigReloaded = onConfigReloaded
    this.getStatus = getStatus
    this.getCards = getCards
    this.getRetentionStatus = getRetentionStatus
    this.server = null
  }

  start() {
    this.server = http.createServer((req, res) => {
      // Cabeceras CORS universales para permitir peticiones desde admin.lam7a.ma / admin.lam7a.com o localhost
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Access-Control-Request-Private-Network")
      res.setHeader("Access-Control-Allow-Private-Network", "true")
      res.setHeader("Content-Type", "application/json; charset=utf-8")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      const parsedUrl = url.parse(req.url, true)
      const pathname = parsedUrl.pathname

      // GET /status — Comprobar si la app está abierta y lista
      if (req.method === "GET" && (pathname === "/status" || pathname === "/health")) {
        const status = this.getStatus ? this.getStatus() : {}
        const cards = this.getCards ? this.getCards() : []
        res.writeHead(200)
        res.end(JSON.stringify({
          ok: true,
          app: "Lam7a Studios Ingest Companion",
          version: "1.0.0",
          connected: true,
          activeCards: cards,
          ...status,
        }))
        return
      }

      // GET /cards — Listar tarjetas SD y discos detectados en este PC
      if (req.method === "GET" && pathname === "/cards") {
        const cards = this.getCards ? this.getCards() : []
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true, cards }))
        return
      }

      // POST /reload-config — Recargar la configuración centralizada de Supabase inmediatamente
      if (req.method === "POST" && pathname === "/reload-config") {
        syncConfigFromSupabase()
          .then((cfg) => {
            if (this.onConfigReloaded) this.onConfigReloaded(cfg)
            res.writeHead(200)
            res.end(JSON.stringify({ ok: true, message: "Configuración recargada desde Supabase" }))
          })
          .catch((err) => {
            res.writeHead(500)
            res.end(JSON.stringify({ ok: false, error: err.message }))
          })
        return
      }

      // GET /check-nas — Comprobar estado híbrido del NAS (Red Local LAN + Tailscale VPN)
      if (req.method === "GET" && pathname === "/check-nas") {
        const customHost = parsedUrl.query.host ? String(parsedUrl.query.host).trim() : ""
        const customPort = parseInt(parsedUrl.query.port, 10) || 21
        if (customHost) {
          probeTcpPort(customHost, customPort, 1200).then((r) => {
            res.writeHead(200)
            res.end(
              JSON.stringify({
                reachable: r.reachable,
                activeHost: customHost,
                host: customHost,
                port: customPort,
                latencyMs: r.latencyMs,
              })
            )
          })
          return
        }

        resolveActiveNasRoute({ force: true })
          .then((route) => {
            res.writeHead(200)
            res.end(
              JSON.stringify({
                reachable: route.activeRoute !== "offline",
                activeRoute: route.activeRoute,
                activeHost: route.activeHost,
                host: route.activeHost,
                port: getConfig().nasPort || 21,
                latencyMs: route.latencyMs,
                lan: route.lan,
                tailscale: route.tailscale,
              })
            )
          })
          .catch((err) => {
            res.writeHead(200)
            res.end(JSON.stringify({ reachable: false, error: err.message }))
          })
        return
      }

      // GET /project-nas — Estado y conteo exacto de un proyecto en el NAS (vía SMB o FTP de forma asíncrona)
      if (req.method === "GET" && pathname === "/project-nas") {
        const folderName = parsedUrl.query.folder
        if (!folderName) {
          res.writeHead(400)
          res.end(JSON.stringify({ ok: false, error: "folder query required" }))
          return
        }

        ;(async () => {
          const fs = require("fs")
          const path = require("path")
          const smbRoot = await findAvailableSmbShareAsync()
          if (smbRoot) {
            const foundPath = path.join(smbRoot, folderName)
            try {
              await fs.promises.access(foundPath)
              let filesCount = 0
              let totalSizeBytes = 0
              const walk = async (dir) => {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true })
                for (const e of entries) {
                  if (e.name.startsWith(".")) continue
                  const full = path.join(dir, e.name)
                  if (e.isDirectory()) await walk(full)
                  else if (e.isFile()) {
                    filesCount++
                    try {
                      const st = await fs.promises.stat(full)
                      totalSizeBytes += st.size
                    } catch {}
                  }
                }
              }
              await walk(foundPath)
              res.writeHead(200)
              res.end(
                JSON.stringify({
                  ok: true,
                  exists: true,
                  folderName,
                  path: foundPath,
                  filesCount,
                  bytes: totalSizeBytes,
                  sizeMB: Number((totalSizeBytes / (1024 * 1024)).toFixed(1)),
                  sizeGB: Number((totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)),
                  source: "smb",
                })
              )
              return
            } catch {}
          }

          if (this.getRetentionStatus) {
            try {
              const status = await Promise.resolve(this.getRetentionStatus(false))
              const p = status && status.projects ? status.projects.find((x) => x.folderName === folderName) : null
              if (p) {
                res.writeHead(200)
                res.end(
                  JSON.stringify({
                    ok: true,
                    exists: true,
                    folderName,
                    filesCount: p.filesCount || 0,
                    bytes: p.bytes || 0,
                    sizeMB: Number(((p.bytes || 0) / (1024 * 1024)).toFixed(1)),
                    sizeGB: Number(((p.bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)),
                    source: status.source || "retention_scan",
                  })
                )
                return
              }
            } catch {}
          }

          res.writeHead(200)
          res.end(JSON.stringify({ ok: true, exists: false, folderName, filesCount: 0, bytes: 0 }))
        })()
        return
      }

      // GET /nas-status — Estado y carpetas reales del NAS escaneado localmente
      if (req.method === "GET" && pathname === "/nas-status") {
        if (this.getRetentionStatus) {
          const force = parsedUrl.query.force === "true"
          Promise.resolve(this.getRetentionStatus(force))
            .then((status) => {
              res.writeHead(200)
              res.end(JSON.stringify(status || { ok: false }))
            })
            .catch((err) => {
              res.writeHead(500)
              res.end(JSON.stringify({ ok: false, error: err.message }))
            })
          return
        }
        res.writeHead(404)
        res.end(JSON.stringify({ ok: false, error: "Retention manager not initialized" }))
        return
      }

      // POST /show — Abrir o enfocar la app de escritorio
      if (req.method === "POST" && pathname === "/show") {
        if (this.onShowMain) this.onShowMain()
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true, message: "Desktop companion focused" }))
        return
      }

      // POST /ingest — Lanzar la ingesta desde la web
      if (req.method === "POST" && pathname === "/ingest") {
        let body = ""
        req.on("data", chunk => { body += chunk })
        req.on("end", async () => {
          try {
            const params = body ? JSON.parse(body) : {}
            console.log("[BRIDGE] Recibida orden de ingesta desde la web:", params)
            
            if (!params.sessionId) {
              res.writeHead(400)
              res.end(JSON.stringify({ ok: false, error: "sessionId is required" }))
              return
            }

            // Si no se especifica sourcePath, buscar tarjeta SD activa automáticamente
            if (!params.sourcePath && this.getCards) {
              const cards = this.getCards()
              if (cards && cards.length > 0) {
                params.sourcePath = cards[0].dcimPath || cards[0].drive
                console.log("[BRIDGE] Usando tarjeta detectada automáticamente:", params.sourcePath)
              }
            }

            // Responder inmediatamente a la web para confirmar la recepción
            res.writeHead(202)
            res.end(JSON.stringify({
              ok: true,
              message: "Ingest job accepted by desktop companion",
              sessionId: params.sessionId,
              sourcePath: params.sourcePath || null,
            }))

            // Arrancar el motor en segundo plano y desplegar la mini ventana
            if (this.onStartIngest) {
              setTimeout(() => {
                this.onStartIngest(params)
              }, 100)
            }
          } catch (err) {
            console.error("[BRIDGE] Error procesando POST /ingest:", err)
            res.writeHead(500)
            res.end(JSON.stringify({ ok: false, error: err.message }))
          }
        })
        return
      }

      // POST /open — Abrir carpeta o archivo en Explorador de Windows o NAS
      if (req.method === "POST" && pathname === "/open") {
        let body = ""
        req.on("data", chunk => { body += chunk })
        req.on("end", async () => {
          try {
            const params = body ? JSON.parse(body) : {}
            const { shell } = require("electron")
            const fs = require("fs")
            const path = require("path")

            const target = params.target || "local" // 'local' | 'nas'
            const mode = params.mode || "reveal"    // 'reveal' | 'open'
            let filePath = params.path || ""

            if (target === "nas") {
              const cleanRel = filePath
                .replace(/^ftp:\/\/[^/]+/, "")
                .replace(/^[\\\/]+/, "")
                .replace(/^Lamha-Storage[\\\/]/i, "")
              const smbBase = await findAvailableSmbShareAsync()
              if (smbBase) {
                const cand = cleanRel ? path.join(smbBase, cleanRel) : smbBase
                try {
                  await fs.promises.access(cand)
                  console.log("[BRIDGE] Abriendo ubicación NAS SMB:", cand)
                  await shell.openPath(cand)
                  res.writeHead(200)
                  res.end(JSON.stringify({ ok: true, message: "Ubicación de red NAS abierta vía SMB", target: "nas", path: cand }))
                  return
                } catch {
                  await shell.openPath(smbBase)
                  res.writeHead(200)
                  res.end(JSON.stringify({ ok: true, message: "Raíz de red NAS abierta vía SMB", target: "nas", path: smbBase }))
                  return
                }
              }

              const route = await resolveActiveNasRoute()
              const activeHost = route.activeHost || getConfig().nasHost
              const nasUrl = filePath.startsWith("ftp://")
                ? filePath
                : `ftp://${activeHost}/${cleanRel.replace(/\\/g, "/")}`
              console.log("[BRIDGE] Abriendo ubicación NAS FTP:", nasUrl)
              await shell.openExternal(nasUrl)
              res.writeHead(200)
              res.end(JSON.stringify({ ok: true, message: "Ubicación de red NAS abierta vía FTP", target: "nas", url: nasUrl }))
              return
            }

            // Local folder resolution
            let resolvedLocalPath = filePath

            // Si es relativa, resolver contra C:\Lamha-Storage o unidades del PC
            if (!path.isAbsolute(resolvedLocalPath)) {
              const defaultRoot = "C:\\Lamha-Storage"
              const candidate = path.join(defaultRoot, resolvedLocalPath)
              if (fs.existsSync(candidate)) {
                resolvedLocalPath = candidate
              } else {
                // Probar letras de unidad comunes (D, E, F, etc.)
                let found = false
                for (const drive of ["D", "E", "F", "G", "C"]) {
                  const testP = path.join(`${drive}:\\Lamha-Storage`, resolvedLocalPath)
                  if (fs.existsSync(testP)) {
                    resolvedLocalPath = testP
                    found = true
                    break
                  }
                }
                if (!found) {
                  // Si no existe el archivo exacto, probar con la carpeta padre
                  const dirCandidate = path.dirname(candidate)
                  if (fs.existsSync(dirCandidate)) {
                    resolvedLocalPath = dirCandidate
                  } else {
                    resolvedLocalPath = candidate
                  }
                }
              }
            }

            console.log("[BRIDGE] Abriendo en Explorador local:", resolvedLocalPath, "mode:", mode)

            if (fs.existsSync(resolvedLocalPath)) {
              const stat = fs.statSync(resolvedLocalPath)
              if (stat.isDirectory()) {
                await shell.openPath(resolvedLocalPath)
                res.writeHead(200)
                res.end(JSON.stringify({ ok: true, message: "Carpeta local abierta en el Explorador", path: resolvedLocalPath }))
              } else {
                if (mode === "open") {
                  await shell.openPath(resolvedLocalPath)
                } else {
                  shell.showItemInFolder(resolvedLocalPath)
                }
                res.writeHead(200)
                res.end(JSON.stringify({ ok: true, message: "Archivo revelado en el Explorador de Windows", path: resolvedLocalPath }))
              }
            } else {
              // Si es una carpeta dentro de Lamha-Storage (ej. 03_Edicion_Master), crearla automáticamente y abrirla
              try {
                if (resolvedLocalPath.toLowerCase().includes("lamha-storage") && !path.extname(resolvedLocalPath)) {
                  fs.mkdirSync(resolvedLocalPath, { recursive: true })
                  await shell.openPath(resolvedLocalPath)
                  res.writeHead(200)
                  res.end(JSON.stringify({ ok: true, message: "Carpeta creada y abierta en el Explorador", path: resolvedLocalPath }))
                  return
                }
              } catch {}

              // Intentar abrir la carpeta padre si existe
              const parentDir = path.dirname(resolvedLocalPath)
              if (fs.existsSync(parentDir)) {
                await shell.openPath(parentDir)
                res.writeHead(200)
                res.end(JSON.stringify({ ok: true, message: "Carpeta del proyecto abierta en el Explorador", path: parentDir }))
              } else {
                res.writeHead(404)
                res.end(JSON.stringify({ ok: false, error: `No se encontró la ruta física: ${resolvedLocalPath}` }))
              }
            }
          } catch (err) {
            console.error("[BRIDGE] Error en POST /open:", err)
            res.writeHead(500)
            res.end(JSON.stringify({ ok: false, error: err.message }))
          }
        })
        return
      }

      // GET /master-files — Listar archivos en C:\Lamha-Storage\<folder>\03_Edicion_Master
      if (req.method === "GET" && pathname === "/master-files") {
        const fs = require("fs")
        const path = require("path")
        const folderName = parsedUrl.query.folder || ""
        const subfolder = parsedUrl.query.sub || "03_Edicion_Master"
        if (!folderName) {
          res.writeHead(400)
          res.end(JSON.stringify({ ok: false, error: "folder query parameter required" }))
          return
        }

        const drives = ["C", "D", "E", "F", "G"]
        let resolvedDir = null
        for (const d of drives) {
          const candidates = [
            path.join(`${d}:\\Lamha-Storage`, folderName, subfolder),
            path.join(`${d}:\\Lamha-Storage`, folderName, "03_Edicion_Master"),
            path.join(`${d}:\\Lamha-Storage`, folderName, "03_Édition_Master"),
            path.join(`${d}:\\Lamha-Storage`, folderName, "03_Edition_Master"),
          ]
          for (const c of candidates) {
            if (fs.existsSync(c)) {
              resolvedDir = c
              break
            }
          }
          if (resolvedDir) break
        }

        if (!resolvedDir) {
          resolvedDir = path.join("C:\\Lamha-Storage", folderName, subfolder)
          try {
            fs.mkdirSync(resolvedDir, { recursive: true })
          } catch {}
        }

        try {
          const entries = fs.existsSync(resolvedDir) ? fs.readdirSync(resolvedDir, { withFileTypes: true }) : []
          const files = []
          let totalBytes = 0
          for (const e of entries) {
            if (e.isFile() && !e.name.startsWith(".")) {
              const full = path.join(resolvedDir, e.name)
              const st = fs.statSync(full)
              totalBytes += st.size
              files.push({
                name: e.name,
                size: st.size,
                sizeMb: Number((st.size / (1024 * 1024)).toFixed(2)),
                modified: st.mtime.toISOString(),
              })
            }
          }
          res.writeHead(200)
          res.end(JSON.stringify({
            ok: true,
            folderName,
            subfolder,
            path: resolvedDir,
            files,
            totalFiles: files.length,
            totalBytes,
            totalMb: Number((totalBytes / (1024 * 1024)).toFixed(1)),
          }))
        } catch (err) {
          res.writeHead(500)
          res.end(JSON.stringify({ ok: false, error: err.message }))
        }
        return
      }

      // GET /master-file-content — Leer binario de un archivo local de 03_Edicion_Master para subir a Google Drive
      if (req.method === "GET" && pathname === "/master-file-content") {
        const fs = require("fs")
        const path = require("path")
        const folderName = parsedUrl.query.folder || ""
        const subfolder = parsedUrl.query.sub || "03_Edicion_Master"
        const fileName = path.basename(parsedUrl.query.file || "")
        if (!folderName || !fileName) {
          res.writeHead(400)
          res.end(JSON.stringify({ ok: false, error: "folder and file required" }))
          return
        }

        const drives = ["C", "D", "E", "F", "G"]
        let targetFile = null
        for (const d of drives) {
          const candidates = [
            path.join(`${d}:\\Lamha-Storage`, folderName, subfolder, fileName),
            path.join(`${d}:\\Lamha-Storage`, folderName, "03_Edicion_Master", fileName),
            path.join(`${d}:\\Lamha-Storage`, folderName, "03_Édition_Master", fileName),
            path.join(`${d}:\\Lamha-Storage`, folderName, "03_Edition_Master", fileName),
          ]
          for (const c of candidates) {
            if (fs.existsSync(c)) {
              targetFile = c
              break
            }
          }
          if (targetFile) break
        }

        if (!targetFile || !fs.existsSync(targetFile)) {
          res.writeHead(404)
          res.end(JSON.stringify({ ok: false, error: "File not found" }))
          return
        }

        try {
          const st = fs.statSync(targetFile)
          res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": st.size,
            "Access-Control-Allow-Origin": "*",
          })
          fs.createReadStream(targetFile).pipe(res)
        } catch (err) {
          res.writeHead(500)
          res.end(JSON.stringify({ ok: false, error: err.message }))
        }
        return
      }

      // 404 No encontrado
      res.writeHead(404)
      res.end(JSON.stringify({ ok: false, error: "Not found" }))
    })

    let currentPort = BRIDGE_PORT
    this.server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && currentPort === BRIDGE_PORT) {
        currentPort = 41891
        console.warn(`[BRIDGE] Puerto ${BRIDGE_PORT} en uso, escuchando en puerto secundario http://127.0.0.1:${currentPort}`)
        try {
          this.server.listen(currentPort, "127.0.0.1", () => {
            console.log(`[BRIDGE] Servidor de enlace web ↔ escritorio escuchando en http://127.0.0.1:${currentPort}`)
          })
        } catch {}
      } else if (err.code === "EADDRINUSE") {
        console.warn(`[BRIDGE] Puerto ${currentPort} ya activo por otra instancia.`)
      } else {
        console.error("[BRIDGE] Error en servidor bridge:", err)
      }
    })

    this.server.listen(currentPort, "127.0.0.1", () => {
      console.log(`[BRIDGE] Servidor de enlace web ↔ escritorio escuchando en http://127.0.0.1:${currentPort}`)
    })
  }

  stop() {
    if (this.server) {
      try {
        this.server.close()
      } catch {}
      this.server = null
    }
  }
}

if (require.main === module) {
  const srv = new LamhaBridgeServer({})
  srv.start()
}

module.exports = { LamhaBridgeServer, BRIDGE_PORT }
