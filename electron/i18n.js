/**
 * Dictionnaire de traduction 4 Langues pour l'application Desktop et le System Tray
 * - Français (fr) - Standard Atelier
 * - Español (es)
 * - English (en)
 * - العربية (ar)
 */

const TRAY_I18N = {
  fr: {
    appTitle: "Lam7a Studios Atelier",
    trayTooltip: "Lam7a Studios — Surveillance Matériel & Ingestion Active",
    statusIdle: "Système en veille (Prêt)",
    statusIngesting: "Ingestion en cours...",
    quickIngest: (drive) => `Lancer l'ingestion de la carte (${drive})`,
    openDashboard: "Ouvrir l'Atelier",
    openLocalStorage: "Explorer le stockage SSD local",
    checkNas: "Vérifier l'état du NAS (192.168.11.1)",
    rescanDrives: "Scanner les supports amovibles",
    languageMenu: "Langue",
    quitApp: "Quitter l'Atelier",
    
    // Notifications Windows
    cardDetectedTitle: "Carte mémoire détectée",
    cardDetectedBody: (drive, count) => 
      `Une carte mémoire a été insérée sur ${drive} (${count} photos/vidéos). Cliquez pour démarrer l'ingestion vers le SSD et le NAS.`,
    nasOnlineTitle: "NAS Studio Connecté",
    nasOnlineBody: "Le serveur NAS 192.168.11.1 est en ligne. Le double miroir est actif.",
    nasOfflineTitle: "Alerte NAS Déconnecté",
    nasOfflineBody: "Le NAS 192.168.11.1 n'est pas joignable. Les fichiers seront sécurisés sur le SSD local.",
    minimizedToTrayTitle: "Lam7a Studios reste actif",
    minimizedToTrayBody: "L'application continue de surveiller vos cartes SD et clés USB en arrière-plan.",
    nasSyncMenu: "Synchronisation Auto Local ➔ NAS",
    nasSyncEnabled: "Activée (Temps réel)",
    nasSyncDisabled: "Désactivée",
    nasSyncPausedUntil: (t) => `En pause jusqu'à ${t}`,
    nasSyncResumeNow: "Reprendre maintenant",
    nasSyncPause2h: "Mettre en pause 2 heures",
    nasSyncPause4h: "Mettre en pause 4 heures",
    nasSyncPause8h: "Mettre en pause 8 heures",
    nasSyncPause24h: "Mettre en pause 24 heures",
    nasSyncScanNow: "Vérifier les fichiers non synchronisés...",
  },
  es: {
    appTitle: "Lam7a Studios Atelier",
    trayTooltip: "Lam7a Studios — Vigilancia de Hardware e Ingesta Activa",
    statusIdle: "Sistema en espera (Listo)",
    statusIngesting: "Ingesta en curso...",
    quickIngest: (drive) => `Iniciar ingesta de tarjeta (${drive})`,
    openDashboard: "Abrir Atelier",
    openLocalStorage: "Abrir almacenamiento SSD local",
    checkNas: "Comprobar estado del NAS (192.168.11.1)",
    rescanDrives: "Escanear tarjetas y discos USB",
    languageMenu: "Idioma",
    quitApp: "Salir de Lam7a Studios",

    // Notificaciones Windows
    cardDetectedTitle: "Tarjeta de memoria detectada",
    cardDetectedBody: (drive, count) => 
      `Se ha insertado una tarjeta en ${drive} (${count} fotos/videos). Haz clic para iniciar la ingesta inmediata hacia el SSD y NAS.`,
    nasOnlineTitle: "NAS del Estudio Conectado",
    nasOnlineBody: "El servidor NAS 192.168.11.1 está en línea. La réplica dual está activa.",
    nasOfflineTitle: "Aviso: NAS Desconectado",
    nasOfflineBody: "No se puede conectar al NAS 192.168.11.1. Los archivos se protegerán en el SSD local.",
    minimizedToTrayTitle: "Lam7a Studios sigue activo",
    minimizedToTrayBody: "La aplicación sigue vigilando la inserción de tarjetas SD y discos en segundo plano.",
    nasSyncMenu: "Sincronización Auto Local ➔ NAS",
    nasSyncEnabled: "Activada (Tiempo real)",
    nasSyncDisabled: "Desactivada",
    nasSyncPausedUntil: (t) => `En pausa hasta las ${t}`,
    nasSyncResumeNow: "Reanudar ahora",
    nasSyncPause2h: "Pausar por 2 horas",
    nasSyncPause4h: "Pausar por 4 horas",
    nasSyncPause8h: "Pausar por 8 horas",
    nasSyncPause24h: "Pausar por 24 horas",
    nasSyncScanNow: "Detectar archivos pendientes ahora...",
  },
  en: {
    appTitle: "Lam7a Studios Atelier",
    trayTooltip: "Lam7a Studios — Hardware Monitoring & Ingest Active",
    statusIdle: "System idle (Ready)",
    statusIngesting: "Ingestion in progress...",
    quickIngest: (drive) => `Start card ingestion (${drive})`,
    openDashboard: "Open Atelier",
    openLocalStorage: "Open local SSD storage",
    checkNas: "Check studio NAS status (192.168.11.1)",
    rescanDrives: "Rescan removable media",
    languageMenu: "Language",
    quitApp: "Quit Lam7a Studios",

    // Windows Notifications
    cardDetectedTitle: "Memory card detected",
    cardDetectedBody: (drive, count) => 
      `A memory card was inserted on ${drive} (${count} photos/videos). Click to start immediate ingestion to SSD and NAS.`,
    nasOnlineTitle: "Studio NAS Connected",
    nasOnlineBody: "NAS Server 192.168.11.1 is online. Dual backup mirror is active.",
    nasOfflineTitle: "Warning: NAS Disconnected",
    nasOfflineBody: "Cannot reach NAS 192.168.11.1. Files will be safely preserved on local SSD.",
    minimizedToTrayTitle: "Lam7a Studios is still running",
    minimizedToTrayBody: "The app continues watching for SD cards and USB drives in the background.",
    nasSyncMenu: "Auto Sync Local ➔ NAS",
    nasSyncEnabled: "Enabled (Real-time)",
    nasSyncDisabled: "Disabled",
    nasSyncPausedUntil: (t) => `Paused until ${t}`,
    nasSyncResumeNow: "Resume now",
    nasSyncPause2h: "Pause for 2 hours",
    nasSyncPause4h: "Pause for 4 hours",
    nasSyncPause8h: "Pause for 8 hours",
    nasSyncPause24h: "Pause for 24 hours",
    nasSyncScanNow: "Scan unsynced files now...",
  },
  ar: {
    appTitle: "استوديو لمحة - أتيلييه",
    trayTooltip: "استوديو لمحة — مراقبة الأجهزة واستيراد الذاكرة نشط",
    statusIdle: "النظام في وضع الاستعداد (جاهز)",
    statusIngesting: "الاستيراد قيد المعالجة...",
    quickIngest: (drive) => `بدء استيراد محتوى البطاقة (${drive})`,
    openDashboard: "فتح لوحة التحكم",
    openLocalStorage: "فتح وحدة التخزين المحلية SSD",
    checkNas: "فحص حالة خادم NAS (192.168.11.1)",
    rescanDrives: "فحص وسائط التخزين",
    languageMenu: "اللغة",
    quitApp: "إغلاق التطبيق",

    // إشعارات ويندوز
    cardDetectedTitle: "تم اكتشاف بطاقة ذاكرة",
    cardDetectedBody: (drive, count) => 
      `تم إدخال بطاقة ذاكرة في ${drive} (${count} صورة/فيديو). اضغط لبدء الاستيراد الفوري إلى SSD وNAS.`,
    nasOnlineTitle: "خادم NAS متصل بنجاح",
    nasOnlineBody: "خادم NAS 192.168.11.1 يعمل. ميزة النسخ المتطابق المزدوج مفعلة.",
    nasOfflineTitle: "تنبيه: تعذر الاتصال بخادم NAS",
    nasOfflineBody: "تعذر الوصول إلى NAS 192.168.11.1. سيتم تأمين الملفات في وحدة SSD المحلية.",
    minimizedToTrayTitle: "استوديو لمحة لا يزال قيد التشغيل",
    minimizedToTrayBody: "يواصل التطبيق مراقبة إدخال بطاقات SD وأقراص USB في الخلفية.",
    nasSyncMenu: "مزامنة تلقائية (SSD ➔ NAS)",
    nasSyncEnabled: "مفعلة (الوقت الفعلي)",
    nasSyncDisabled: "معطلة",
    nasSyncPausedUntil: (t) => `متوقفة مؤقتًا حتى ${t}`,
    nasSyncResumeNow: "استئناف الآن",
    nasSyncPause2h: "إيقاف مؤقت لمدة ساعتين",
    nasSyncPause4h: "إيقاف مؤقت لمدة 4 ساعات",
    nasSyncPause8h: "إيقاف مؤقت لمدة 8 ساعات",
    nasSyncPause24h: "إيقاف مؤقت لمدة 24 ساعة",
    nasSyncScanNow: "فحص الملفات غير المتزامنة الآن...",
  },
};

function getTrayText(lang = "fr") {
  const code = (lang === "ar" || lang === "en" || lang === "es" || lang === "fr") ? lang : "fr";
  return TRAY_I18N[code];
}

module.exports = {
  TRAY_I18N,
  getTrayText,
};
