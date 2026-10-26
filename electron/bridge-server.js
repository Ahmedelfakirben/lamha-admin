/**
 * Lamha Studios Ingest Companion — Local Bridge Server
 * 
 * Permite que el portal web (admin.lam7a.ma) o cualquier navegador en este PC
 * detecte la app de escritorio y lance ingestas de tarjetas locales directamente.
 */
const http = require("http")
const url = require("url")

const BRIDGE_PORT = 41890

class LamhaBridgeServer {
  constructor({ onStartIngest, onShowMain, getStatus, getCards }) {
    this.onStartIngest = onStartIngest
    this.onShowMain = onShowMain
    this.getStatus = getStatus
    this.getCards = getCards
    this.server = null
  }

  start() {
    this.server = http.createServer((req, res) => {
      // Cabeceras CORS universales para permitir peticiones desde admin.lam7a.ma o localhost
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
              // Si es NAS, abrir la URL de red FTP en Explorer
              let nasUrl = filePath.startsWith("ftp://") 
                ? filePath 
                : `ftp://192.168.11.1/usb1_1/Lamha-Storage/${filePath.replace(/^[\\\/]/, "")}`
              
              // Si apunta a un archivo específico, abrir la carpeta contenedora en el NAS
              if (/\.[a-zA-Z0-9]{2,5}$/.test(nasUrl)) {
                nasUrl = nasUrl.substring(0, nasUrl.lastIndexOf("/"))
              }

              console.log("[BRIDGE] Abriendo ubicación NAS FTP:", nasUrl)
              await shell.openExternal(nasUrl)
              res.writeHead(200)
              res.end(JSON.stringify({ ok: true, message: "Ubicación de red NAS abierta en el explorador", target: "nas", url: nasUrl }))
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

      // 404 No encontrado
      res.writeHead(404)
      res.end(JSON.stringify({ ok: false, error: "Not found" }))
    })

    this.server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[BRIDGE] Puerto ${BRIDGE_PORT} en uso, reintentando o ya activo por otra instancia.`)
      } else {
        console.error("[BRIDGE] Error en servidor bridge:", err)
      }
    })

    this.server.listen(BRIDGE_PORT, "127.0.0.1", () => {
      console.log(`[BRIDGE] Servidor de enlace web ↔ escritorio escuchando en http://127.0.0.1:${BRIDGE_PORT}`)
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

module.exports = { LamhaBridgeServer, BRIDGE_PORT }
