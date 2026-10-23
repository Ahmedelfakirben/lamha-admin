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
          app: "Lamha Studios Ingest Companion",
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
