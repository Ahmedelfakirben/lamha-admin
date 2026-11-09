const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron")
const path = require("path")
const fs = require("fs")
const http = require("http")
const net = require("net")
const { spawn, exec } = require("child_process")
const {
  getConfig,
  probeTcpPort,
  resolveActiveNasRoute,
  findAvailableSmbShareAsync,
  syncConfigFromSupabase,
} = require("../electron/config")

let mainWindow = null
const STUDIO_PANEL_URL = process.env.LAMHA_PANEL_URL || "https://admin.lam7a.ma"

app.setAppUserModelId("com.lamhastudios.erp")

// Detección nativa de tarjetas SD y unidades de cámara en Windows
function scanConnectedCards() {
  const cards = []
  const driveLetters = ["D", "E", "F", "G", "H", "I", "J", "K"]
  const extensions = new Set([
    ".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2",
    ".jpg", ".jpeg", ".mp4", ".mov", ".mkv", ".braw", ".prores"
  ])

  for (const letter of driveLetters) {
    const driveRoot = `${letter}:\\`
    try {
      if (!fs.existsSync(driveRoot)) continue

      const dcimPath = path.join(driveRoot, "DCIM")
      let targetPath = null
      let count = 0

      if (fs.existsSync(dcimPath)) {
        targetPath = dcimPath
        count = countMediaFiles(dcimPath, extensions, 2)
      } else {
        const rootCount = countMediaFiles(driveRoot, extensions, 1)
        if (rootCount >= 5) {
          targetPath = driveRoot
          count = rootCount
        }
      }

      if (targetPath && count > 0) {
        cards.push({
          letter,
          drive: driveRoot,
          path: targetPath,
          count,
          detectedAt: Date.now()
        })
      }
    } catch {}
  }
  return cards
}

function countMediaFiles(dirPath, extensions, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return 0
  let count = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.has(ext)) count++
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        count += countMediaFiles(path.join(dirPath, entry.name), extensions, maxDepth, currentDepth + 1)
      }
    }
  } catch {}
  return count
}

function createWindow() {
  let iconPath = path.join(__dirname, "assets", "icon.ico")
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, "..", "electron", "assets", "icon.ico")
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: "Lam7a Studios • Studio Atelier",
    backgroundColor: "#0b0a09",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0b0a09",
      symbolColor: "#c69f68",
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload-admin.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
    autoHideMenuBar: true,
    show: true,
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    mainWindow.focus()
  })

  function loadPanel() {
    mainWindow.loadURL(STUDIO_PANEL_URL).catch((err) => {
      console.warn("Error cargando panel remoto, mostrando pantalla offline:", err)
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
    })
  }

  loadPanel()

  // Evitar que el visor de fotos (lightbox fixed inset-0 z-[100]) quede debajo de los botones nativos de ventana de Windows (36px superiores)
  // + Fragmentar lotes grandes (>50 UUIDs) en Server Actions de compartido masivo para evitar 414 URI Too Long en PostgREST
  // + Sincronizar traducciones multi-idioma (FR/ES/EN/AR) en la barra flotante de selección y cuaderno de notas
  mainWindow.webContents.on("did-finish-load", () => {
    try {
      mainWindow.webContents.insertCSS(`
        div.fixed.inset-0.z-\\[100\\]:not(:fullscreen) {
          top: 36px !important;
          height: calc(100vh - 36px) !important;
        }
      `)
      mainWindow.webContents.executeJavaScript(`
        (function() {
          if (window.__lamhaAdminPatchApplied) return;
          window.__lamhaAdminPatchApplied = true;

          // 1. Interceptor de Server Actions para lotes grandes de fotos (evita 414 URI Too Long al compartir >50 fotos)
          //    + Interceptor de creación de colaboradores (POST /api/team) para evitar fallo del trigger legacy public.profiles
          const origFetch = window.fetch;
          window.fetch = async function(input, init) {
            try {
              const reqUrl = typeof input === "string" ? input : (input && input.url ? input.url : "");
              if (
                init &&
                init.method === "POST" &&
                (reqUrl === "/api/team" || reqUrl.endsWith("/api/team")) &&
                typeof init.body === "string" &&
                window.desktopAdminAPI &&
                window.desktopAdminAPI.createTeamMember
              ) {
                const bodyObj = JSON.parse(init.body);
                const result = await window.desktopAdminAPI.createTeamMember(bodyObj);
                return new Response(JSON.stringify(result), {
                  status: result.success ? 200 : 400,
                  headers: { "Content-Type": "application/json" }
                });
              }

              if (init && init.method === "POST" && init.body) {
                const matchSession = window.location.pathname.match(/\\/sessions\\/([0-9a-fA-F-]{36})/);
                const urlSessionId = matchSession ? matchSession[1] : null;

                // Caso A: body es string JSON (ej. [["uuid1","uuid2",...], true, "session-id"])
                if (typeof init.body === "string" && init.body.includes("-")) {
                  try {
                    const parsed = JSON.parse(init.body);
                    if (
                      Array.isArray(parsed) &&
                      parsed.length >= 2 &&
                      Array.isArray(parsed[0]) &&
                      parsed[0].length > 50 &&
                      typeof parsed[0][0] === "string" &&
                      typeof parsed[1] === "boolean"
                    ) {
                      const ids = parsed[0];
                      const shouldShare = parsed[1];
                      const sessionId = parsed[2] || urlSessionId;
                      if (window.desktopAdminAPI && window.desktopAdminAPI.bulkShareSessionAssets && sessionId) {
                        await window.desktopAdminAPI.bulkShareSessionAssets({
                          sessionId,
                          shouldShare,
                          assetIds: ids
                        });
                      }
                      // Enviar solo los primeros 20 IDs al Server Action remoto para que no falle por 414 URI Too Long y ejecute revalidatePath con éxito
                      const shortBody = JSON.stringify([ids.slice(0, 20), shouldShare, sessionId]);
                      return await origFetch.call(this, input, Object.assign({}, init, { body: shortBody }));
                    }
                  } catch {}
                }

                // Caso B: body es FormData (React 19 Flight encodeReply para arrays grandes)
                if (typeof FormData !== "undefined" && init.body instanceof FormData) {
                  let foundIds = null;
                  let foundShare = null;
                  let foundSessionId = urlSessionId;
                  let idsFieldKey = null;

                  for (const [k, v] of init.body.entries()) {
                    if (typeof v === "string" && v.startsWith("[")) {
                      try {
                        const arr = JSON.parse(v);
                        if (Array.isArray(arr) && arr.length > 50 && typeof arr[0] === "string") {
                          foundIds = arr;
                          idsFieldKey = k;
                        } else if (Array.isArray(arr) && arr.length >= 2 && typeof arr[1] === "boolean") {
                          foundShare = arr[1];
                          if (typeof arr[2] === "string") foundSessionId = arr[2];
                          if (Array.isArray(arr[0]) && arr[0].length > 50) {
                            foundIds = arr[0];
                            idsFieldKey = k;
                          }
                        }
                      } catch {}
                    }
                  }

                  if (foundIds && foundIds.length > 50 && foundSessionId) {
                    if (foundShare === null) foundShare = true;
                    if (window.desktopAdminAPI && window.desktopAdminAPI.bulkShareSessionAssets) {
                      await window.desktopAdminAPI.bulkShareSessionAssets({
                        sessionId: foundSessionId,
                        shouldShare: foundShare,
                        assetIds: foundIds
                      });
                    }
                    if (idsFieldKey) {
                      const newFd = new FormData();
                      for (const [k, v] of init.body.entries()) {
                        if (k === idsFieldKey && typeof v === "string") {
                          try {
                            const parsedVal = JSON.parse(v);
                            if (Array.isArray(parsedVal) && typeof parsedVal[0] === "string") {
                              newFd.append(k, JSON.stringify(parsedVal.slice(0, 20)));
                            } else if (Array.isArray(parsedVal) && Array.isArray(parsedVal[0])) {
                              parsedVal[0] = parsedVal[0].slice(0, 20);
                              newFd.append(k, JSON.stringify(parsedVal));
                            } else {
                              newFd.append(k, v);
                            }
                          } catch {
                            newFd.append(k, v);
                          }
                        } else {
                          newFd.append(k, v);
                        }
                      }
                      return await origFetch.call(this, input, Object.assign({}, init, { body: newFd }));
                    }
                  }
                }
              }
            } catch (e) {
              console.warn("[Lam7a Patch] Error chunking bulk share:", e);
            }
            return origFetch.apply(this, arguments);
          };

          // 2. Respaldo directo por IPC Node.js al hacer clic en Compartir / Ocultar (barra flotante o Compartir Todo el Lote)
          document.addEventListener("click", async (ev) => {
            try {
              const btn = ev.target && ev.target.closest ? ev.target.closest("button") : null;
              if (!btn || !window.desktopAdminAPI || !window.desktopAdminAPI.bulkShareSessionAssets) return;
              const matchUrl = window.location.pathname.match(/\\/sessions\\/([0-9a-fA-F-]{36})/);
              if (!matchUrl) return;
              const sessionId = matchUrl[1];
              const txt = (btn.textContent || "").trim();

              const isFloatingBar = Boolean(btn.closest("div.fixed.bottom-5.z-50"));
              const isShareFloater = isFloatingBar && ["Compartir", "Partager", "Share", "مشاركة"].includes(txt);
              const isHideFloater = isFloatingBar && ["Ocultar", "Masquer", "Hide", "إخفاء"].includes(txt);

              const isBulkShareToolbar = !isFloatingBar && ["Compartir Todo el Lote", "Tout Partager", "Share All Batch", "مشاركة الدفعة"].includes(txt);
              const isBulkHideToolbar = !isFloatingBar && ["Ocultar Todo", "Tout Masquer", "Hide All", "إخفاء الكل"].includes(txt);

              if (!isShareFloater && !isHideFloater && !isBulkShareToolbar && !isBulkHideToolbar) return;

              const shouldShare = isShareFloater || isBulkShareToolbar;
              let assetIds = [];

              if (isShareFloater || isHideFloater) {
                // Verificar si están todos seleccionados mirando el botón de contador (ej. 382/382)
                let allSelected = false;
                document.querySelectorAll("button span").forEach((sp) => {
                  const m = (sp.textContent || "").trim().match(/^(\\d+)\\/(\\d+)$/);
                  if (m && m[1] === m[2]) allSelected = true;
                });

                if (!allSelected) {
                  // Recoger los IDs de las tarjetas marcadas en el DOM (tienen ring-2 y un input[name="id"])
                  document.querySelectorAll("div.group.rounded-2xl.ring-2 input[name='id']").forEach((inp) => {
                    if (inp.value) assetIds.push(inp.value);
                  });
                }
              }

              await window.desktopAdminAPI.bulkShareSessionAssets({
                sessionId,
                shouldShare,
                assetIds: assetIds.length > 0 ? assetIds : null
              });
            } catch (err) {
              console.warn("[Lam7a Patch] Error en bulkShareSessionAssets:", err);
            }
          }, true);

          // 3. Sincronizador multi-idioma (FR / ES / EN / AR) para elementos de proyecto
          const DICT = {
            fr: {
              selectedSuffix: "sélectionnés",
              share: "Partager",
              hide: "Masquer",
              copyToSel: "Copier vers 02_Seleccion",
              auditStorage: "Auditer Stockage",
              notesTitle: "Cahier de Notes & Historique de Production",
              notesEmpty: "Aucune note enregistrée pour ce projet.",
              notesAddFirst: "Ajouter une première note",
              notesAddBtn: "Ajouter Note",
              notesCloseBtn: "Fermer",
              notesSaveBtn: "Enregistrer",
              notesCancelBtn: "Annuler",
              notesNewLabel: "Nouvelle consigne ou mise à jour au journal",
              notesAutoTs: "Horodatage automatique"
            },
            es: {
              selectedSuffix: "seleccionados",
              share: "Compartir",
              hide: "Ocultar",
              copyToSel: "Copiar a 02_Seleccion",
              auditStorage: "Auditar Almacenamiento",
              notesTitle: "Cuaderno de Notas e Historial de Producción",
              notesEmpty: "No hay notas registradas para este proyecto.",
              notesAddFirst: "Añadir una primera nota",
              notesAddBtn: "Añadir Nota",
              notesCloseBtn: "Cerrar",
              notesSaveBtn: "Guardar",
              notesCancelBtn: "Cancelar",
              notesNewLabel: "Nueva indicación o actualización en el registro",
              notesAutoTs: "Fecha y hora automáticas"
            },
            en: {
              selectedSuffix: "selected",
              share: "Share",
              hide: "Hide",
              copyToSel: "Copy to 02_Seleccion",
              auditStorage: "Audit Storage",
              notesTitle: "Production Notebook & History",
              notesEmpty: "No notes recorded for this project.",
              notesAddFirst: "Add a first note",
              notesAddBtn: "Add Note",
              notesCloseBtn: "Close",
              notesSaveBtn: "Save",
              notesCancelBtn: "Cancel",
              notesNewLabel: "New instruction or log update",
              notesAutoTs: "Automatic timestamp"
            },
            ar: {
              selectedSuffix: "محدد",
              share: "مشاركة",
              hide: "إخفاء",
              copyToSel: "نسخ إلى 02_Seleccion",
              auditStorage: "تدقيق التخزين",
              notesTitle: "دفتر الملاحظات وسجل الإنتاج",
              notesEmpty: "لا توجد ملاحظات مسجلة لهذا المشروع.",
              notesAddFirst: "إضافة أول ملاحظة",
              notesAddBtn: "إضافة ملاحظة",
              notesCloseBtn: "إغلاق",
              notesSaveBtn: "حفظ",
              notesCancelBtn: "إلغاء",
              notesNewLabel: "تعليمات جديدة أو تحديث في السجل",
              notesAutoTs: "ختم زمني تلقائي"
            }
          };

          function applyTranslations() {
            const lang = localStorage.getItem("lamha_language") || "fr";
            const d = DICT[lang] || DICT.fr;

            // Barra flotante inferior de selección múltiple
            const floatingBar = document.querySelector("div.fixed.bottom-5.z-50");
            if (floatingBar) {
              const badge = floatingBar.querySelector("span.font-mono");
              if (badge) {
                const m = (badge.textContent || "").match(/^(\\d+)/);
                if (m) {
                  const targetBadge = m[1] + " " + d.selectedSuffix;
                  if (badge.textContent !== targetBadge) badge.textContent = targetBadge;
                }
              }
              const buttons = floatingBar.querySelectorAll("button span");
              if (buttons[0] && buttons[0].textContent !== d.share) buttons[0].textContent = d.share;
              if (buttons[1] && buttons[1].textContent !== d.hide) buttons[1].textContent = d.hide;
              if (buttons[2] && buttons[2].textContent !== d.copyToSel) buttons[2].textContent = d.copyToSel;
            }

            // Textos fijos en vista de sesión
            document.querySelectorAll("h3, p, span, button").forEach((el) => {
              if (el.children.length > 0) return;
              const txt = (el.textContent || "").trim();
              if (txt === "Auditar Stockage" && lang === "es") el.textContent = d.auditStorage;
              else if (txt === "Cahier de Notes & Historique de Production" && lang !== "fr") el.textContent = d.notesTitle;
              else if (txt === "Aucune note enregistrée pour ce projet." && lang !== "fr") el.textContent = d.notesEmpty;
              else if (txt === "Ajouter une première note" && lang !== "fr") el.textContent = d.notesAddFirst;
              else if (txt === "Ajouter Note" && lang !== "fr") el.textContent = d.notesAddBtn;
              else if (txt === "Nouvelle consigne ou mise à jour au journal" && lang !== "fr") el.textContent = d.notesNewLabel;
              else if (txt === "Horodatage automatique" && lang !== "fr") el.textContent = d.notesAutoTs;
            });
          }

          applyTranslations();
          const obs = new MutationObserver(() => applyTranslations());
          obs.observe(document.body, { childList: true, subtree: true });
        })();
      `).catch(() => {})
    } catch {}
  })

  // Atajos nativos de teclado en el contenedor de escritorio (F5, Ctrl+R, Ctrl+Shift+R, Ctrl+Shift+I)
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return
    if (input.key === "F5" || (input.control && !input.shift && input.key.toLowerCase() === "r")) {
      event.preventDefault()
      mainWindow.webContents.reload()
    } else if (input.control && input.shift && input.key.toLowerCase() === "r") {
      event.preventDefault()
      mainWindow.webContents.reloadIgnoringCache()
    } else if (input.control && input.shift && input.key.toLowerCase() === "i") {
      event.preventDefault()
      mainWindow.webContents.toggleDevTools()
    }
  })

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (errorCode !== -3) {
      console.warn("Fallo de red al conectar con el servidor:", errorCode, errorDescription)
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Si es una ruta interna de Lamha Studios, mantener dentro de la app
    if (url.startsWith("https://admin.lam7a.ma") || url.startsWith("https://lam7a.ma")) {
      return { action: "allow" }
    }
    // Abrir links externos en el navegador nativo de Windows
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// ─────────────────────────────────────────────────────────────
// PUENTE DE HARDWARE Y ACCESO NATIVO DE WINDOWS
// ─────────────────────────────────────────────────────────────

// 1. Selector nativo de carpetas de Windows
ipcMain.handle("select-folder", async (_event, options = {}) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: options.title || "Seleccionar Carpeta en este Equipo",
    defaultPath: options.defaultPath || undefined,
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

// 2. Selector nativo de archivos (imágenes, vídeos, proyectos)
ipcMain.handle("select-file", async (_event, options = {}) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", options.multiple ? "multiSelections" : "openFile"].filter(Boolean),
    title: options.title || "Seleccionar Archivo",
    defaultPath: options.defaultPath || undefined,
    filters: options.filters || [
      { name: "Todos los archivos", extensions: ["*"] }
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return options.multiple ? result.filePaths : result.filePaths[0]
})

// 3. Abrir carpetas o archivos en el Explorador de Windows (con resolución inteligente de NAS y SSD)
ipcMain.handle("open-local-path", async (_event, targetPath, target = "local") => {
  if (!targetPath || typeof targetPath !== "string") {
    return { success: false, error: "Ruta no especificada" }
  }

  try {
    // A) MODO NAS: Abrir recurso compartido SMB o FTP en el Explorador de Windows (Rutas híbridas LAN + Tailscale)
    if (target === "nas" || targetPath.startsWith("ftp://") || targetPath.startsWith("\\\\") || targetPath.startsWith("Z:") || targetPath.startsWith("z:")) {
      const cleanRel = targetPath
        .replace(/^ftp:\/\/[^/]+/, "")
        .replace(/^\/?usb1_1\/Lamha-Storage\/?/i, "")
        .replace(/^usb1_1[\\\/]Lamha-Storage[\\\/]?/i, "")
        .replace(/^[zZ]:[\\\/]?/i, "")
        .replace(/^\\\\[^\\]+\\[^\\]+[\\\/]?/i, "")
        .replace(/^[\\\/]+/, "")
        .replace(/\//g, "\\")

      // 1. Probar recurso SMB verificado previamente con sondeo TCP 445 (evita congelamientos de Windows)
      const smbBase = await findAvailableSmbShareAsync()
      if (smbBase) {
        const smbCandidate = cleanRel ? path.join(smbBase, cleanRel) : smbBase
        try {
          await fs.promises.access(smbCandidate)
          const st = await fs.promises.stat(smbCandidate)
          if (st.isDirectory()) {
            await shell.openPath(smbCandidate)
          } else {
            shell.showItemInFolder(smbCandidate)
          }
          return { success: true, resolvedPath: smbCandidate }
        } catch {
          await shell.openPath(smbBase)
          return { success: true, resolvedPath: smbBase }
        }
      }

      // 2. Fallback a URL FTP directa en explorer.exe usando la ruta activa (LAN o Tailscale)
      const route = await resolveActiveNasRoute()
      const activeHost = route.activeHost || getConfig().nasHost
      let cleanUrlPart = cleanRel.replace(/\\/g, "/")
      if (/\.[a-zA-Z0-9]{2,5}$/.test(cleanUrlPart)) {
        cleanUrlPart = cleanUrlPart.substring(0, cleanUrlPart.lastIndexOf("/"))
      }
      const ftpUrl = `ftp://${activeHost}/${cleanUrlPart}`
      spawn("explorer.exe", [ftpUrl], { detached: true, stdio: "ignore" }).unref()
      return { success: true, resolvedPath: ftpUrl }
    }

    // B) MODO LOCAL (SSD): Resolver en disco C:\Lamha-Storage y unidades secundarias
    // 1. Si la ruta ya es absoluta y existe
    if (path.isAbsolute(targetPath) && fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath)
      if (stat.isDirectory()) {
        await shell.openPath(targetPath)
      } else {
        shell.showItemInFolder(targetPath)
      }
      return { success: true }
    }

    // 2. Limpiar ruta quitando prefijos de NAS o URLs relativas
    const cleanRel = targetPath
      .replace(/^ftp:\/\/[^/]+/, "")
      .replace(/^\/?usb1_1\/Lamha-Storage\/?/i, "")
      .replace(/^usb1_1[\\\/]Lamha-Storage[\\\/]?/i, "")
      .replace(/^[\\\/]+/, "")
      .replace(/\//g, "\\")

    // 3. Probar en C:\Lamha-Storage y unidades D:, E:, F:, G:
    const drives = ["C", "D", "E", "F", "G"]
    for (const drive of drives) {
      const candidate = path.join(`${drive}:\\Lamha-Storage`, cleanRel)
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate)
        if (stat.isDirectory()) {
          await shell.openPath(candidate)
        } else {
          shell.showItemInFolder(candidate)
        }
        return { success: true, resolvedPath: candidate }
      }
    }

    // 3b. Si es una carpeta de proyecto/subcarpeta (ej: <proyecto>\03_Edicion_Master) y no tiene extensión, crearla automáticamente en C:\Lamha-Storage y abrirla
    if (!path.extname(cleanRel)) {
      try {
        const autoDir = path.join("C:\\Lamha-Storage", cleanRel)
        fs.mkdirSync(autoDir, { recursive: true })
        await shell.openPath(autoDir)
        return { success: true, resolvedPath: autoDir }
      } catch {}
    }

    for (const drive of drives) {
      const candidate = path.join(`${drive}:\\Lamha-Storage`, cleanRel)
      // Probar si existe la carpeta contenedora
      const candidateDir = path.dirname(candidate)
      if (fs.existsSync(candidateDir)) {
        await shell.openPath(candidateDir)
        return { success: true, resolvedPath: candidateDir }
      }
    }

    // 4. Probar abriendo la carpeta raíz del proyecto
    const projectFolder = cleanRel.split("\\")[0]
    if (projectFolder) {
      for (const drive of drives) {
        const candidateProj = path.join(`${drive}:\\Lamha-Storage`, projectFolder)
        if (fs.existsSync(candidateProj)) {
          await shell.openPath(candidateProj)
          return { success: true, resolvedPath: candidateProj }
        }
      }
    }

    // 5. Fallback general: Abrir C:\Lamha-Storage
    const defaultRoot = "C:\\Lamha-Storage"
    if (fs.existsSync(defaultRoot)) {
      await shell.openPath(defaultRoot)
      return { success: true, message: "Abierta raíz C:\\Lamha-Storage" }
    }

    return { success: false, error: `No se encontró la ruta: ${targetPath}` }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 4. Resaltar archivo específico dentro de la carpeta en Windows
ipcMain.handle("reveal-item", async (_event, targetPath) => {
  if (targetPath && typeof targetPath === "string") {
    try {
      shell.showItemInFolder(targetPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
  return { success: false, error: "Ruta inválida" }
})

// 5. Detección en tiempo real de tarjetas SD insertadas en el PC
ipcMain.handle("get-active-cards", async () => {
  try {
    return scanConnectedCards()
  } catch {
    return []
  }
})

// 6. Comprobar existencia y detalles de ruta local
ipcMain.handle("check-local-path", async (_event, targetPath) => {
  if (!targetPath || typeof targetPath !== "string") return { exists: false }
  try {
    const exists = fs.existsSync(targetPath)
    if (!exists) return { exists: false }
    const stat = fs.statSync(targetPath)
    return {
      exists: true,
      isDirectory: stat.isDirectory(),
      sizeBytes: stat.size,
    }
  } catch {
    return { exists: false }
  }
})

// Función auxiliar para localizar la carpeta del proyecto en el SSD local de Windows
function resolveLocalProjectFolder(folderName) {
  if (!folderName) return null
  const letters = ["C", "D", "E", "F", "G", "H", "I", "J", "K"]
  for (const letter of letters) {
    const candidate1 = path.join(`${letter}:\\Lamha-Storage`, folderName)
    if (fs.existsSync(candidate1)) return candidate1
    const candidate2 = path.join(`${letter}:\\`, folderName)
    if (fs.existsSync(candidate2)) return candidate2
  }
  return path.join("C:\\Lamha-Storage", folderName)
}

// Función auxiliar asíncrona para localizar la carpeta del proyecto en el QNAP NAS (SMB LAN o Tailscale con TCP 445 verificado)
async function resolveNasProjectFolderAsync(folderName) {
  if (!folderName) return null
  const smbBase = await findAvailableSmbShareAsync()
  if (!smbBase) return null
  const candidate = path.join(smbBase, folderName)
  try {
    await fs.promises.access(candidate)
    return candidate
  } catch {
    return null
  }
}

// Escanea recursivamente una carpeta y desglosa por subcarpetas (01_RAW, etc.)
function scanFolderRecursive(dirPath) {
  let count = 0
  let totalBytes = 0
  const subMap = {}

  function walk(current, relSub) {
    let entries = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch { return }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(current, entry.name)
      const rel = relSub ? `${relSub}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        walk(full, rel)
      } else if (entry.isFile()) {
        try {
          const st = fs.statSync(full)
          count++
          totalBytes += st.size
          const topFolder = relSub ? relSub.split("/")[0] : "Raíz"
          if (!subMap[topFolder]) {
            subMap[topFolder] = { count: 0, bytes: 0 }
          }
          subMap[topFolder].count++
          subMap[topFolder].bytes += st.size
        } catch {}
      }
    }
  }

  if (dirPath && fs.existsSync(dirPath)) {
    walk(dirPath, "")
  }

  return { count, totalBytes, subMap }
}

// 7. Escanear estado físico real dual (SSD C:\Lamha-Storage y QNAP NAS Z:\)
ipcMain.handle("scan-project-storage", async (_event, folderName) => {
  if (!folderName) return { exists: false, error: "Nombre de carpeta no especificado" }
  try {
    const localDirPath = resolveLocalProjectFolder(folderName)
    const nasDirPath = await resolveNasProjectFolderAsync(folderName)

    const localScan = scanFolderRecursive(localDirPath)
    const nasScan = scanFolderRecursive(nasDirPath)

    const standardSubfolders = [
      "01_RAW/Fotos",
      "01_RAW/Videos",
      "02_Seleccion_Cliente",
      "03_Edicion_Master",
      "04_Entregas_Finales",
    ]

    const allSubKeys = new Set([
      ...standardSubfolders.map(s => s.split("/")[0]),
      ...Object.keys(localScan.subMap),
      ...Object.keys(nasScan.subMap),
    ])

    const subfolders = Array.from(allSubKeys).map((name) => {
      const l = localScan.subMap[name] || { count: 0, bytes: 0 }
      const n = nasScan.subMap[name] || { count: 0, bytes: 0 }
      return {
        name,
        localCount: l.count,
        localSizeMB: Number((l.bytes / (1024 * 1024)).toFixed(1)),
        nasCount: n.count,
        nasSizeMB: Number((n.bytes / (1024 * 1024)).toFixed(1)),
        isSynced: (l.count === 0 && n.count > 0) || (n.count >= l.count && l.count > 0),
      }
    })

    const localSizeMB = Number((localScan.totalBytes / (1024 * 1024)).toFixed(1))
    const localSizeGB = Number((localScan.totalBytes / (1024 * 1024 * 1024)).toFixed(2))
    const nasSizeMB = Number((nasScan.totalBytes / (1024 * 1024)).toFixed(1))
    const nasSizeGB = Number((nasScan.totalBytes / (1024 * 1024 * 1024)).toFixed(2))

    let status = "pending"
    if (localScan.count === 0 && nasScan.count > 0) {
      status = "archived_in_nas"
    } else if (nasScan.count >= localScan.count && localScan.count > 0) {
      status = "synced"
    } else if (nasScan.count > 0) {
      status = "syncing"
    }

    return {
      exists: Boolean(localScan.count > 0 || nasScan.count > 0),
      localExists: Boolean(localDirPath && fs.existsSync(localDirPath) && localScan.count > 0),
      nasExists: Boolean(nasDirPath && fs.existsSync(nasDirPath) && nasScan.count > 0),
      localPath: localDirPath,
      nasPath: nasDirPath,
      filesCount: localScan.count,
      totalSizeBytes: localScan.totalBytes,
      sizeMB: localSizeMB,
      sizeGB: localSizeGB,
      nasFilesCount: nasScan.count,
      nasTotalSizeBytes: nasScan.totalBytes,
      nasSizeMB,
      nasSizeGB,
      status,
      subfolders,
    }
  } catch (err) {
    return { exists: false, error: err.message }
  }
})

// 8. Listar archivos de una subcarpeta local de un proyecto
ipcMain.handle("list-project-subfolder", async (_event, folderName, subfolderName = "") => {
  if (!folderName) return []
  try {
    const root = resolveLocalProjectFolder(folderName)
    const targetDir = subfolderName ? path.join(root, subfolderName.replace(/\//g, "\\")) : root
    if (!fs.existsSync(targetDir)) return []

    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
    const photoExts = new Set([".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2", ".jpg", ".jpeg", ".png", ".webp"])
    const videoExts = new Set([".mp4", ".mov", ".mkv", ".braw", ".prores", ".avi"])

    return entries
      .filter(e => !e.name.startsWith("."))
      .map(entry => {
        const full = path.join(targetDir, entry.name)
        let size = null
        let modified = null
        try {
          const st = fs.statSync(full)
          size = st.size
          modified = st.mtime.toISOString()
        } catch {}

        const ext = path.extname(entry.name).toLowerCase()
        let mediaType = "other"
        if (entry.isDirectory()) mediaType = "directory"
        else if (photoExts.has(ext)) mediaType = "photo"
        else if (videoExts.has(ext)) mediaType = "video"

        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size,
          modified,
          mediaType,
        }
      })
  } catch {
    return []
  }
})

// 9. Crear carpetas estructuradas de proyecto en C:\Lamha-Storage\<folder>
ipcMain.handle("create-project-folders", async (_event, folderName) => {
  if (!folderName) return { success: false, error: "Nombre vacío" }
  const root = path.join("C:\\Lamha-Storage", folderName)
  const subdirs = [
    "01_RAW\\Fotos",
    "01_RAW\\Videos",
    "02_Seleccion_Cliente",
    "03_Edicion_Master",
    "04_Entregas_Finales"
  ]
  try {
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true })
    for (const sub of subdirs) {
      const full = path.join(root, sub)
      if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true })
    }
    return { success: true, path: root }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 10. Comprobar conectividad con NAS (Rutas Híbridas LAN Local + Tailscale VPN)
ipcMain.handle("check-nas-connection", async (_event, host = "", port = 21, timeoutMs = 1200) => {
  if (host && typeof host === "string" && host.trim()) {
    const res = await probeTcpPort(host.trim(), port, timeoutMs)
    return { reachable: res.reachable, activeHost: host.trim(), host: host.trim(), port, latencyMs: res.latencyMs }
  }
  const route = await resolveActiveNasRoute({ force: true })
  return {
    reachable: route.activeRoute !== "offline",
    activeRoute: route.activeRoute,
    activeHost: route.activeHost,
    host: route.activeHost,
    port: getConfig().nasPort || 21,
    latencyMs: route.latencyMs,
    lan: route.lan,
    tailscale: route.tailscale,
  }
})

// 11. Iniciar o comunicar con Ingest Companion en local (solo preselecciona el proyecto, sin arrancar la copia)
ipcMain.handle("launch-ingest-companion", async (_event, params = {}) => {
  const folder = params.folderName || params.folder || ""
  const protocolUrl = `lamha://ingest?session_id=${encodeURIComponent(params.sessionId || "")}&client_name=${encodeURIComponent(params.clientName || "")}&folder=${encodeURIComponent(folder)}&auto=false`

  // 1. Intentar registrar y activar por protocolo de Windows
  try {
    const opened = await shell.openExternal(protocolUrl)
    if (opened) return { success: true, method: "protocol" }
  } catch {}

  // 2. Si el protocolo aún no estuviera registrado en el sistema, lanzar el ejecutable directo
  const candidates = [
    "C:\\Program Files\\Lam7a Studios - Ingest Companion\\Lam7a Studios - Ingest Companion.exe",
    path.join(process.cwd(), "..", "Lamha_Studio_PC3_Suite", "1_Ingest_Companion_Portable.exe"),
    path.join(process.cwd(), "Lamha_Studio_PC3_Suite", "1_Ingest_Companion_Portable.exe"),
    path.join(__dirname, "..", "..", "Lamha_Studio_PC3_Suite", "1_Ingest_Companion_Portable.exe"),
  ]

  for (const exePath of candidates) {
    if (fs.existsSync(exePath)) {
      try {
        spawn(exePath, [protocolUrl], { detached: true, stdio: "ignore" }).unref()
        return { success: true, method: "direct_spawn", path: exePath }
      } catch {}
    }
  }

  // 3. Fallback: shell.openExternal general
  try {
    await shell.openExternal(protocolUrl)
    return { success: true, method: "protocol_fallback" }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 12. Copiar automáticamente los archivos originales (RAW + JPG) seleccionados por el cliente a 02_Seleccion_Cliente
ipcMain.handle("copy-client-selection", async (_event, params = {}) => {
  const { folderName, filenames = [] } = params
  if (!folderName || !Array.isArray(filenames) || filenames.length === 0) {
    return { success: false, error: "Sin carpeta o archivos especificados" }
  }

  try {
    const projectRoot = resolveLocalProjectFolder(folderName)
    if (!projectRoot || !fs.existsSync(projectRoot)) {
      return { success: false, error: `No se encontró la carpeta local: ${projectRoot || folderName}` }
    }

    const destDir = path.join(projectRoot, "02_Seleccion_Cliente")
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    // Construir conjunto de nombres base (sin extensión) y nombres exactos en minúscula
    const targetStems = new Set()
    const targetExact = new Set()
    for (const rawName of filenames) {
      if (!rawName || typeof rawName !== "string") continue
      const base = path.basename(rawName).toLowerCase()
      const stem = path.basename(base, path.extname(base)).toLowerCase()
      targetExact.add(base)
      if (stem) targetStems.add(stem)
    }

    // Buscar en 01_RAW y subcarpetas (excepto 02_Seleccion_Cliente)
    const matchedFiles = []
    function findMatches(dir) {
      let entries = []
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name.toLowerCase() === "02_seleccion_cliente") continue
          findMatches(full)
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase()
          const stem = path.basename(lowerName, path.extname(lowerName))
          if (targetExact.has(lowerName) || targetStems.has(stem)) {
            matchedFiles.push(full)
          }
        }
      }
    }

    findMatches(projectRoot)

    let copiedCount = 0
    for (const srcFile of matchedFiles) {
      try {
        const destFile = path.join(destDir, path.basename(srcFile))
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile)
          copiedCount++
        } else {
          copiedCount++
        }
      } catch {}
    }

    // Abrir la carpeta 02_Seleccion_Cliente en el Explorador de Windows
    await shell.openPath(destDir)
    return {
      success: true,
      copiedCount,
      destDir,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.on("retry-connect", () => {
  if (mainWindow) {
    mainWindow.loadURL(STUDIO_PANEL_URL).catch(() => {
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
    })
  }
})

// 13. Leer contenido binario de un archivo local del proyecto para subida directa a Google Drive
ipcMain.handle("read-project-file", async (_event, folderName, subfolderName = "03_Edicion_Master", fileName = "") => {
  if (!folderName || !fileName) return null
  try {
    const root = resolveLocalProjectFolder(folderName)
    if (!root) return null
    const cleanFile = path.basename(fileName)
    const candidates = [
      path.join(root, subfolderName.replace(/\//g, "\\"), cleanFile),
      path.join(root, "03_Edicion_Master", cleanFile),
      path.join(root, "03_Édition_Master", cleanFile),
      path.join(root, "03_Edition_Master", cleanFile),
    ]
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return fs.readFileSync(c)
      }
    }
    return null
  } catch {
    return null
  }
})

// Servidor HTTP local de puente (puertos 41891 y 41890) para que tanto la app como el navegador web lean C:\Lamha-Storage
function startAdminLocalFileBridge(port) {
  const url = require("url")
  const ALLOWED_ORIGINS = new Set([
    "https://admin.lam7a.ma",
    "https://lam7a.ma",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ])

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || ""
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      res.writeHead(403, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: false, error: "Forbidden origin" }))
      return
    }

    res.setHeader("Access-Control-Allow-Origin", origin || "https://admin.lam7a.ma")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Access-Control-Request-Private-Network")
    res.setHeader("Access-Control-Allow-Private-Network", "true")

    if (req.method === "OPTIONS") {
      res.writeHead(204)
      res.end()
      return
    }

    const parsedUrl = url.parse(req.url, true)
    const pathname = parsedUrl.pathname

    if (req.method === "GET" && pathname === "/master-files") {
      const folderName = parsedUrl.query.folder || ""
      const subfolder = parsedUrl.query.sub || "03_Edicion_Master"
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      if (!folderName) {
        res.writeHead(400)
        res.end(JSON.stringify({ ok: false, error: "folder required" }))
        return
      }
      const root = resolveLocalProjectFolder(folderName) || path.join("C:\\Lamha-Storage", folderName)
      const candidates = [
        path.join(root, subfolder),
        path.join(root, "03_Edicion_Master"),
        path.join(root, "03_Édition_Master"),
        path.join(root, "03_Edition_Master"),
      ]
      let resolvedDir = candidates.find(c => fs.existsSync(c))
      if (!resolvedDir) {
        resolvedDir = path.join(root, "03_Edicion_Master")
        try { fs.mkdirSync(resolvedDir, { recursive: true }) } catch {}
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

    if (req.method === "GET" && pathname === "/master-file-content") {
      const folderName = parsedUrl.query.folder || ""
      const subfolder = parsedUrl.query.sub || "03_Edicion_Master"
      const fileName = path.basename(parsedUrl.query.file || "")
      if (!folderName || !fileName) {
        res.writeHead(400)
        res.end("Missing params")
        return
      }
      const root = resolveLocalProjectFolder(folderName) || path.join("C:\\Lamha-Storage", folderName)
      const candidates = [
        path.join(root, subfolder, fileName),
        path.join(root, "03_Edicion_Master", fileName),
        path.join(root, "03_Édition_Master", fileName),
        path.join(root, "03_Edition_Master", fileName),
      ]
      const targetFile = candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile())
      if (!targetFile) {
        res.writeHead(404)
        res.end("Not found")
        return
      }
      const st = fs.statSync(targetFile)
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": st.size,
        "Access-Control-Allow-Origin": "*",
      })
      fs.createReadStream(targetFile).pipe(res)
      return
    }

    if (req.method === "POST" && pathname === "/open") {
      let body = ""
      req.on("data", chunk => { body += chunk })
      req.on("end", async () => {
        res.setHeader("Content-Type", "application/json; charset=utf-8")
        try {
          const params = body ? JSON.parse(body) : {}
          const rel = (params.path || "").replace(/^[\\\/]+/, "").replace(/\//g, "\\")
          const cfg = getConfig()
          const baseStorage = path.resolve(cfg.ssdPath || "C:\\Lamha-Storage")
          const targetDir = path.resolve(path.isAbsolute(rel) ? rel : path.join(baseStorage, rel))

          // Validar que la ruta solicitada permanezca dentro del directorio de almacenamiento
          if (!targetDir.toLowerCase().startsWith(baseStorage.toLowerCase())) {
            res.writeHead(403)
            res.end(JSON.stringify({ ok: false, error: "Acceso denegado: ruta fuera del directorio de almacenamiento" }))
            return
          }

          if (!fs.existsSync(targetDir) && !path.extname(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
          }
          await shell.openPath(targetDir)
          res.writeHead(200)
          res.end(JSON.stringify({ ok: true, path: targetDir }))
        } catch (err) {
          res.writeHead(500)
          res.end(JSON.stringify({ ok: false, error: err.message }))
        }
      })
      return
    }

    res.writeHead(404)
    res.end("Not found")
  })

  server.on("error", () => {})
  server.listen(port, "127.0.0.1")
}

// Single Instance Lock
ipcMain.handle("bulk-share-session-assets", async (_event, params = {}) => {
  try {
    const { sessionId, shouldShare, assetIds } = params
    if (!sessionId || typeof shouldShare !== "boolean") {
      return { success: false, error: "Parámetros inválidos" }
    }
    const { createClient } = require("@supabase/supabase-js")
    const cfg = getConfig()
    const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })

    let targetIds = Array.isArray(assetIds) && assetIds.length > 0 ? assetIds : []
    if (targetIds.length === 0) {
      const { data: rows, error: fetchErr } = await sb
        .from("media_assets")
        .select("id")
        .eq("session_id", sessionId)
      if (fetchErr) return { success: false, error: fetchErr.message }
      targetIds = (rows || []).map((r) => r.id)
    }

    const CHUNK_SIZE = 80
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const chunk = targetIds.slice(i, i + CHUNK_SIZE)
      const { error: updErr } = await sb
        .from("media_assets")
        .update({ is_shared: shouldShare })
        .in("id", chunk)
      if (updErr) return { success: false, error: updErr.message }
    }

    return { success: true, count: targetIds.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle("create-team-member", async (_event, params = {}) => {
  try {
    const { email, password, full_name, role, phone, creatorContext } = params
    if (!email || !password || !full_name) {
      return { success: false, error: "Email, contraseña y nombre completo son obligatorios." }
    }

    const { createClient } = require("@supabase/supabase-js")
    const cfg = getConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || cfg.supabaseServiceKey
    if (!serviceRoleKey) {
      return { success: false, error: "Clave de servicio no configurada en las variables de entorno." }
    }
    const sb = createClient(cfg.SUPABASE_URL || cfg.supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const assignedRole = role || "assistant"

    // 1. Crear en Auth sin 'role' en el INSERT inicial para evitar el fallo del trigger legacy public.profiles
    const { data: authUser, error: authError } = await sb.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password).trim(),
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name).trim(),
      },
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    const userId = authUser.user.id

    // 1b. Asignar el rol en user_metadata mediante updateUserById
    await sb.auth.admin
      .updateUserById(userId, {
        user_metadata: {
          full_name: String(full_name).trim(),
          role: assignedRole,
        },
      })
      .catch(() => {})

    // 2. Insertar o actualizar en team_profiles
    await sb
      .from("team_profiles")
      .upsert({
        id: userId,
        email: String(email).trim(),
        full_name: String(full_name).trim(),
        role: assignedRole,
        phone: phone ? String(phone).trim() : null,
        is_active: true,
      })
      .catch(() => {})

    // 3. Registrar en audit_logs
    await sb
      .from("audit_logs")
      .insert({
        user_id: creatorContext?.userId || null,
        user_name: creatorContext?.userName || "Admin Lam7a Studio",
        user_email: creatorContext?.userEmail || "admin@lamhastudios.com",
        user_role: creatorContext?.userRole || "super_admin",
        action: "TEAM_MEMBER_INVITED",
        entity_type: "team",
        entity_id: userId,
        entity_title: String(full_name).trim(),
        details: {
          email: String(email).trim(),
          role: assignedRole,
          phone: phone || null,
        },
      })
      .catch(() => {})

    return {
      success: true,
      member: {
        id: userId,
        email: String(email).trim(),
        full_name: String(full_name).trim(),
        role: assignedRole,
        phone: phone ? String(phone).trim() : null,
        is_active: true,
      },
      message: `Usuario ${full_name} creado con éxito. Ya puede iniciar sesión.`,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    await syncConfigFromSupabase().catch(() => {})
    startAdminLocalFileBridge(41891)
    startAdminLocalFileBridge(41890)
    createWindow()
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
