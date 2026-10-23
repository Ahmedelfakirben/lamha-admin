/**
 * Dictionnaire de traduction 4 Langues pour l'application Desktop et le System Tray
 * - Français (fr) - Standard Atelier
 * - Español (es)
 * - English (en)
 * - العربية (ar)
 */

const TRAY_I18N = {
  fr: {
    appTitle: "Lamha Studios Atelier",
    trayTooltip: "Lamha Studios — Surveillance Matériel & Ingestion Active",
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
    minimizedToTrayTitle: "Lamha Studios reste actif",
    minimizedToTrayBody: "L'application continue de surveiller vos cartes SD et clés USB en arrière-plan.",
  },
  es: {
    appTitle: "Lamha Studios Atelier",
    trayTooltip: "Lamha Studios — Vigilancia de Hardware e Ingesta Activa",
    statusIdle: "Sistema en espera (Listo)",
    statusIngesting: "Ingesta en curso...",
    quickIngest: (drive) => `Iniciar ingesta de tarjeta (${drive})`,
    openDashboard: "Abrir Atelier",
    openLocalStorage: "Abrir almacenamiento SSD local",
    checkNas: "Comprobar estado del NAS (192.168.11.1)",
    rescanDrives: "Escanear tarjetas y discos USB",
    languageMenu: "Idioma",
    quitApp: "Salir de Lamha Studios",

    // Notificaciones Windows
    cardDetectedTitle: "Tarjeta de memoria detectada",
    cardDetectedBody: (drive, count) => 
      `Se ha insertado una tarjeta en ${drive} (${count} fotos/videos). Haz clic para iniciar la ingesta inmediata hacia el SSD y NAS.`,
    nasOnlineTitle: "NAS del Estudio Conectado",
    nasOnlineBody: "El servidor NAS 192.168.11.1 está en línea. La réplica dual está activa.",
    nasOfflineTitle: "Aviso: NAS Desconectado",
    nasOfflineBody: "No se puede conectar al NAS 192.168.11.1. Los archivos se protegerán en el SSD local.",
    minimizedToTrayTitle: "Lamha Studios sigue activo",
    minimizedToTrayBody: "La aplicación sigue vigilando la inserción de tarjetas SD y discos en segundo plano.",
  },
  en: {
    appTitle: "Lamha Studios Atelier",
    trayTooltip: "Lamha Studios — Hardware Monitoring & Ingest Active",
    statusIdle: "System idle (Ready)",
    statusIngesting: "Ingestion in progress...",
    quickIngest: (drive) => `Start card ingestion (${drive})`,
    openDashboard: "Open Atelier",
    openLocalStorage: "Open local SSD storage",
    checkNas: "Check studio NAS status (192.168.11.1)",
    rescanDrives: "Rescan removable media",
    languageMenu: "Language",
    quitApp: "Quit Lamha Studios",

    // Windows Notifications
    cardDetectedTitle: "Memory card detected",
    cardDetectedBody: (drive, count) => 
      `A memory card was inserted on ${drive} (${count} photos/videos). Click to start immediate ingestion to SSD and NAS.`,
    nasOnlineTitle: "Studio NAS Connected",
    nasOnlineBody: "NAS Server 192.168.11.1 is online. Dual backup mirror is active.",
    nasOfflineTitle: "Warning: NAS Disconnected",
    nasOfflineBody: "Cannot reach NAS 192.168.11.1. Files will be safely preserved on local SSD.",
    minimizedToTrayTitle: "Lamha Studios is still running",
    minimizedToTrayBody: "The app continues watching for SD cards and USB drives in the background.",
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
