const { app, Menu, Tray, nativeImage, Notification, shell } = require("electron")
const path = require("path")
const { getTrayText } = require("./i18n")

class LamhaSystemTray {
  constructor({ onOpenDashboard, onStartIngest, onLanguageChange, currentLanguage = "fr" }) {
    this.tray = null
    this.currentLanguage = currentLanguage
    this.activeCards = []
    this.onOpenDashboard = onOpenDashboard
    this.onStartIngest = onStartIngest
    this.onLanguageChange = onLanguageChange
  }

  init() {
    try {
      const fs = require("fs")
      let iconPath = path.join(__dirname, "assets", "tray-icon.ico")
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(__dirname, "assets", "tray-icon.png")
      }
      
      // En Windows se debe pasar la ruta directa al archivo .ico
      this.tray = new Tray(iconPath)
      this.tray.setToolTip(getTrayText(this.currentLanguage).trayTooltip)

      // Tanto clic simple como doble clic abren la ventana principal
      this.tray.on("click", () => {
        if (this.onOpenDashboard) this.onOpenDashboard()
      })
      this.tray.on("double-click", () => {
        if (this.onOpenDashboard) this.onOpenDashboard()
      })

      this.updateMenu()
      console.log("[TRAY_SUCCESS] Icono de bandeja de Windows inicializado correctamente con:", iconPath)
    } catch (trayErr) {
      console.error("[TRAY_ERROR] Error al crear el icono de la bandeja de Windows:", trayErr)
    }
  }

  setLanguage(lang) {
    this.currentLanguage = lang
    if (this.tray) {
      this.tray.setToolTip(getTrayText(this.currentLanguage).trayTooltip)
      this.updateMenu()
    }
  }

  setActiveCards(cards = []) {
    this.activeCards = cards
    this.updateMenu()
  }

  notifyCardInserted(cardInfo) {
    const t = getTrayText(this.currentLanguage)
    const title = t.cardDetectedTitle
    const body = t.cardDetectedBody(cardInfo.drive, cardInfo.count)

    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: path.join(__dirname, "assets", "icon.png"),
      })

      notification.on("click", () => {
        if (this.onStartIngest) this.onStartIngest(cardInfo)
      })

      notification.show()
    } else {
      this.tray.displayBalloon({
        title,
        content: body,
      })
    }
  }

  notifyMinimized() {
    const t = getTrayText(this.currentLanguage)
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: t.minimizedToTrayTitle,
        body: t.minimizedToTrayBody,
        icon: path.join(__dirname, "assets", "icon.png"),
        silent: true,
      })
      notification.show()
    }
  }

  updateMenu() {
    if (!this.tray) return
    const t = getTrayText(this.currentLanguage)

    const menuItems = [
      {
        label: t.appTitle,
        enabled: false,
      },
      {
        label: this.activeCards.length > 0 ? t.statusIngesting : t.statusIdle,
        enabled: false,
      },
      { type: "separator" },
    ]

    // Si hay tarjetas detectadas en Windows, poner botón de ingesta directa
    if (this.activeCards.length > 0) {
      this.activeCards.forEach((card) => {
        menuItems.push({
          label: t.quickIngest(`${card.letter}: — ${card.count} fichiers`),
          click: () => {
            if (this.onStartIngest) this.onStartIngest(card)
          },
        })
      })
      menuItems.push({ type: "separator" })
    }

    // Opciones del panel y almacenamiento
    menuItems.push(
      {
        label: t.openDashboard,
        click: () => {
          if (this.onOpenDashboard) this.onOpenDashboard()
        },
      },
      {
        label: t.openLocalStorage,
        click: () => {
          const fs = require("fs")
          const { getConfig } = require("./config")
          const ssdPath = getConfig().ssdPath || "C:\\Lamha-Storage"
          try {
            if (!fs.existsSync(ssdPath)) fs.mkdirSync(ssdPath, { recursive: true })
          } catch {}
          shell.openPath(ssdPath).catch(() => {
            shell.openPath(app.getPath("desktop"))
          })
        },
      },
      {
        label: t.checkNas,
        click: () => {
          shell.openExternal("http://192.168.11.1")
        },
      },
      { type: "separator" },
      {
        label: t.languageMenu,
        submenu: [
          {
            label: "Français",
            type: "radio",
            checked: this.currentLanguage === "fr",
            click: () => {
              this.setLanguage("fr")
              if (this.onLanguageChange) this.onLanguageChange("fr")
            },
          },
          {
            label: "Español",
            type: "radio",
            checked: this.currentLanguage === "es",
            click: () => {
              this.setLanguage("es")
              if (this.onLanguageChange) this.onLanguageChange("es")
            },
          },
          {
            label: "English",
            type: "radio",
            checked: this.currentLanguage === "en",
            click: () => {
              this.setLanguage("en")
              if (this.onLanguageChange) this.onLanguageChange("en")
            },
          },
          {
            label: "العربية",
            type: "radio",
            checked: this.currentLanguage === "ar",
            click: () => {
              this.setLanguage("ar")
              if (this.onLanguageChange) this.onLanguageChange("ar")
            },
          },
        ],
      },
      { type: "separator" },
      {
        label: t.quitApp,
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      }
    )

    const contextMenu = Menu.buildFromTemplate(menuItems)
    this.tray.setContextMenu(contextMenu)
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

module.exports = {
  LamhaSystemTray,
}
