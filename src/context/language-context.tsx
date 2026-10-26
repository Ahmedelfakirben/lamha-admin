"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type Language = "es" | "fr" | "en" | "ar"

export interface Translations {
  // Navigation & General
  dashboard: string
  calendar: string
  calendarTitle: string
  calendarSubtitle: string
  planner: string
  plannerTitle: string
  plannerSubtitle: string
  sessionNotes: string
  saveNotes: string
  unifiedView: string
  photoSessions: string
  videoProduction: string
  clientDirectory: string
  categoriesMenu: string
  categoriesTitle: string
  categoriesSubtitle: string
  newCategoryBtn: string
  newSubcategoryBtn: string
  subcategories: string
  addSubcategory: string
  editCategory: string
  deleteCategory: string
  editSubcategory: string
  deleteSubcategory: string
  categoryPhotos: string
  uploadPhoto: string
  setAsCover: string
  featuredOnWeb: string
  noSubcategoriesText: string
  noCategoriesFound: string
  categoryNameLabel: string
  subcategoryNameLabel: string
  slugLabel: string
  descriptionLabel: string
  saveChanges: string
  confirmDeleteCategory: string
  confirmDeleteSubcategory: string
  categoriesCatalogLoading: string
  categoriesEmptyHelp: string
  noDescription: string
  inactiveBadge: string
  activeBadge: string
  photosWord: string
  subcategoriesOf: string
  managePhotosTooltip: string
  editCategoryTooltip: string
  deleteCategoryTooltip: string
  editSubcategoryTooltip: string
  deleteSubcategoryTooltip: string
  nameTranslationsHelp: string
  subNameTranslationsHelp: string
  displayOrderLabel: string
  categoryActiveLabel: string
  parentCategoryLabel: string
  cancelBtn: string
  closeBtn: string
  uploadPhotosTitle: string
  uploadingPhotos: string
  uploadFormatsHint: string
  featuredPhotosHint: string
  noPhotosYet: string
  coverBadge: string
  featuredBadge: string
  makeCoverBtn: string
  unfeatureBtn: string
  featureBtn: string
  viewFullScreen: string
  deletePhotoTooltip: string
  uploadModalDesc: string
  nasStorage: string
  auditTrail: string
  settings: string
  studioManagement: string
  infrastructure: string
  openClientPortal: string
  languageLabel: string
  themeLabel: string
  darkTheme: string
  lightTheme: string
  logout: string
  login: string
  adminRole: string
  newSession: string
  addSessionBtn: string
  editSessionBtn: string
  editProject: string
  ingestSd: string
  ingestShortBtn: string
  searchPlaceholder: string
  allCategories: string
  allSubcategories: string
  allStatuses: string
  clearFilters: string
  showing: string
  to: string
  of: string
  itemsPerPage: string
  previous: string
  next: string
  actions: string
  manage: string
  viewFile: string
  status: string
  category: string
  date: string
  client: string
  pin: string
  drive: string
  total: string
  pending: string
  delivered: string
  inEditing: string
  shooting: string
  
  // Dialog & Form Strings
  createSessionTitle: string
  editSessionTitle: string
  sessionDialogDesc: string
  clientNameLabel: string
  phoneLabel: string
  clientEmailLabel: string
  dateLabel: string
  typeLabel: string
  categoryLabel: string
  subCategoryLabel: string
  selectSubCategory: string
  statusLabel: string
  commentsLabel: string
  commentsPlaceholder: string
  tagsLabel: string
  tagsPlaceholder: string
  portalPinLabel: string
  portalPinPlaceholder: string
  createSessionSubmitBtn: string
  saveChangesBtn: string

  // Session Pin Card & Detail Page
  espacePriveAccess: string
  newPin: string
  clientPinCode: string
  copyPin: string
  photosChosenByClient: string
  copyWhatsappInvite: string
  testPortalWithPin: string
  requestedQuota: string
  quotaHelp: string
  saveQuota: string
  clientEmailIdentifier: string
  noEmailWarning: string
  customQuotaLabel: string
  quotaStrictLimit: string
  savedIndicator: string
  collapsePanels: string
  expandPanels: string
  copyPinTooltip: string
  clientSelectionLabel: string
  notesLabel: string
  activeLog: string
  zeroNotes: string
  pinTabLabel: string
  storageTabLabel: string
  deliveryLink: string
  storageHeader: string
  ingestFromSdCard: string
  createFoldersBtn: string
  statusDeliveredToClient: string

  // Clients Page
  clientsTitle: string
  clientsSubtitle: string
  totalClients: string
  sessionsCount: string
  sessionSingle: string
  sessionsPlural: string
  linkedSessions: string
  lastActivity: string
  contactNone: string
  viewCard: string
  allSpecialties: string
  photoOnly: string
  videoOnly: string

  // Photos Page
  photosTitle: string
  photosSubtitle: string
  totalSessions: string
  inProcessEditing: string
  deliveredSuccess: string
  selectedPhotos: string
  portalPin: string
  driveRaw: string

  // Videos Page
  videosTitle: string
  videosSubtitle: string
  totalProjects: string
  inEditingRoom: string
  videosDelivered: string
  videoType: string
  finalDelivery: string
  viewVideo: string

  // Projects Page
  projectsTitle: string
  projectsSubtitle: string
  allProjects: string
  photoSessionsTab: string
  videoProductionsTab: string
  selectionReady: string
  clientSelection: string
  
  // Common Filter Options
  sortRecent: string
  sortOldest: string
  sortNameAsc: string
  sortNameDesc: string
  sortSessionsDesc: string
  wedding: string
  newborn: string
  portrait: string
  maternity: string
  birthday: string
  event: string
  product: string
  graduation: string

  // Ingest Dialog
  ingestTitle: string
  ingestSubtitle: string
  createNewProjectTab: string
  assignExistingSessionTab: string
  projectNameLabel: string
  projectNamePlaceholder: string
  assignClientLabel: string
  assignClientPlaceholder: string
  sdOriginLabel: string
  rescanBtn: string
  verifyingBtn: string
  verifyBtn: string
  unitReady: string
  photosCount: string
  videosCount: string
  automatedDestination: string
  structureTag: string
  startIngestBtn: string
  processingSdCard: string
  realtimeConsole: string
  eventsCount: string
  ingestFinishedTitle: string
  ingestFinishedSubtitle: string
  rawPhotos: string
  rawVideos: string
  transferred: string
  projectDirectory: string
  exploreFolder: string
  downloadLogsBtn: string
  goToGalleryBtn: string

  // Ingest Dialog: Client & Session selection
  assignToThisSession: string
  browseSourceBtn: string
  browseTargetBtn: string
  explorerTitleSource: string
  explorerTitleTarget: string
  selectThisFolder: string
  createNewFolder: string
  upOneLevel: string
  selectAllFiles: string
  deselectAll: string
  filesSelectedCount: string
  selectedFilesBadge: string
  searchSessionPlaceholder: string
  orEnterUuidManually: string
  changeSessionBtn: string
  assignedBadge: string
  existingClientTab: string
  newClientTab: string
  searchClientPlaceholder: string
  clientSuggestions: string
  noClientFound: string
  createAsNewClientBtn: string
  closeSuggestions: string
  existingClientAlert: string
  assignBtn: string

  // Ingest Dialog: SSD Destination & Drive Selector
  targetSsdTitle: string
  targetSsdDesc: string
  detectedDrivesLabel: string
  detectingBtn: string
  refreshDrivesBtn: string
  ssdExternalBadge: string
  systemDriveBadge: string
  sameDriveAsOrigin: string
  targetBasePathLabel: string
  resetBtn: string
  proStructureOnSsd: string
  nasSyncLater: string
  samePathErrorTitle: string
  samePathErrorDesc: string
  sameDriveWarningTitle: string
  sameDriveWarningDesc: string
  insufficientSpaceTitle: string
  capacityWarningTitle: string
  startIngestOnSsd: string
  writingToSsd: string
  freeGBLabel: string
  ofTotalLabel: string
  sourcePathNotExist: string
  proStructureDescRaw: string
  proStructureDescEdits: string
  proStructureDescFinal: string
  automatedTag: string
  checkingSourceAndFolders: string
  startingIngestFrom: string
  fillProjectAndClient: string
  ingestStepBadge: string
  selectClientHelper: string
  loadingText: string

  // Media Manager
  photosTab: string
  videosTab: string
  editionMasterTab: string
  sharedWithClientTab: string
  clientSelectionTab: string
  driveTab: string
  syncMasterBtn: string
  uploadMasterBtn: string
  searchMediaPlaceholder: string
  shareBatchBtn: string
  hideBatchBtn: string
  noMediaInTab: string
  useIngestInstruction: string
  inBookBadge: string
  unnamedFile: string
  clientNoteLabel: string
  sharedStatus: string
  hiddenStatus: string
  openWithApp: string
  revealInFolder: string
  openInLocalFolder: string
  openInNasFolder: string
  rotatePhoto: string
  zoomIn: string
  zoomOut: string
  resetView: string
  deleteFromSession: string
  withNoteBadge: string
  clientRetouchInstruction: string
  selectedPhotosForBook: string
  photosWithRetouchNotes: string
  commentedPhotosHint: string
  masterTag: string
  networkOriginal: string
  filterAll: string
  filterPhotos: string
  filterVideos: string
  syncingText: string
  uploadingText: string
  noMasterFiles: string
  masterInstructions: string
  masterFolderDescription: string

  // NAS Storage Dashboard
  nasInfrastructure: string
  nasTitle: string
  nasSubtitle: string
  routerZteOnline: string
  localMode: string
  usbNasCapacity: string
  used: string
  free: string
  foldersInStorage: string
  scannedFiles: string
  supabaseIndex: string
  storageRootPath: string
  activePathLabel: string
  copyPathBtn: string
  copiedBtn: string
  openInWindows: string
  modifyRootPath: string
  closeConfig: string
  presetZte: string
  presetLocal: string
  presetBackup: string
  hostIpLabel: string
  ftpUserLabel: string
  ftpPasswordLabel: string
  ftpBaseFolderLabel: string
  localFallbackPathLabel: string
  testingConn: string
  testConnBtn: string
  savingConfig: string
  saveActivePathBtn: string
  projectsInStorageTab: string
  supabaseIndexTab: string
  searchNasPlaceholder: string
  linkedToSupabase: string
  viewSessionBtn: string
  emptyDirectory: string

  // Settings Page
  studioSettingsTag: string
  generalSettingsTitle: string
  generalSettingsSubtitle: string
  studioIdentity: string
  artisticDirection: string
  atelierStudioLabel: string
  officialPhonesLabel: string
  emailLabel: string
  supabaseInfra: string
  postgresConnection: string
  linkStatus: string
  connectedOperative: string
  connError: string
  disconnected: string
  securityRls: string
  rlsActive: string
  rlsDesc: string
  clientPortalParams: string
  defaultPortalRules: string
  bookQuota: string
  bookQuotaValue: string
  bookQuotaDesc: string
  accessSecurity: string
  pinSecurityValue: string
  pinSecurityDesc: string
  localPortalServer: string
  portalServerDesc: string

  // Dual Storage & Deliveries
  dualStorageEnvTitle: string
  dualStorageEnvSubtitle: string
  activeModeLabel: string
  activeModeNas: string
  activeModeCloud: string
  modeCloudTitle: string
  modeCloudDesc: string
  modeNasTitle: string
  modeNasDesc: string
  modeAutoTitle: string
  modeAutoDesc: string
  nasServerStatus: string
  nasOnlineLabel: string
  nasOfflineLabel: string
  nasFtpAvailable: string
  nasNoConnection: string
  changeAccount: string
  disconnect: string
  connectedOAuth: string
  unlinked: string
  connectGoogleDrive: string
  unlimitedQuotaNote: string
  deliveryRetention: string
  daysInCloud: string
  retentionNotice: string
  manualRecycleBtn: string
  cleaningInProgress: string
  saveStoragePreferences: string
  saving: string

  // Dashboard Overview
  atelierTag: string
  overviewTitle: string
  overviewDesc: string
  viewPhotoSessionsBtn: string
  totalSessionsKpi: string
  inActiveProduction: string
  photoCollectionsKpi: string
  manageGallery: string
  videoProductionKpi: string
  projectsAndReels: string
  clientSelectionsKpi: string
  selectionReadyDesc: string
  waitingSelectionsDesc: string
  recentSessionsTitle: string
  recentSessionsSubtitle: string
  viewAllSessionsLink: string
  workflowStatus: string
  noSessionsFound: string
  categoryDistributionTitle: string
  categoryDistributionSubtitle: string
  workflowFunnelTitle: string
  workflowFunnelSubtitle: string
  noSessionsData: string
  noWorkflowData: string
  
  // Google Drive Upload
  syncAlbumToDrive: string
  transferPhotosFrom: string
  syncInProgress: string
  syncToDriveBtn: string
  uploadCompletedTitle: string
  uploadErrorTitle: string
  uploadingToDrive: string
  filesCountStr: string

  // Master / Dual NAS Upload & Sync Modal
  uploadMasterDualNas: string
  masterDeliveryManagerTitle: string
  ingestStyleBadge: string
  masterDeliveryManagerSubtitle: string
  verifyingNas: string
  nasOnline: string
  nasOfflineLocalOnly: string
  recheckNasTooltip: string
  tabUploadNewFiles: string
  tabSyncLocalToNas: string
  folderMasterDesc: string
  folderDeliveryDesc: string
  dualCopyLabel: string
  replicaNasActivated: string
  localOnly: string
  selectEditedMediaTitle: string
  supportedFormatsDesc: string
  selectFilesBtn: string
  selectFolderBtn: string
  selectedFilesCount: string
  clearList: string
  startDualUploadBtn: string
  syncLocalEditedTitle: string
  syncLocalEditedDesc: string
  localSourceLabel: string
  nasDestLabel: string
  scanAndReplicateBtn: string
  nasNotAccessible: string
  liveConsoleLogs: string
  transferSuccessTitle: string
  transferSuccessDesc: string
  acceptAndClose: string

  // Tags and badges
  clientDirectoryTag: string
  videoProductionTag: string
  photoCollectionsTag: string
  atelierUnifiedTag: string
  totalSuffix: string

  // Common filters and status labels
  allWord: string
  allWordFeminine: string
  withFinalVideo: string
  pendingVideo: string
  withGeneratedPin: string
  withSelection: string
  withSelectionMade: string
  awaitingSelection: string
  noPin: string
  noDrive: string
  noVideoProductionsFound: string
  noPhotoSessionsFound: string
  photosAndVideosCataloged: string
  editorialAndWeddings: string
  teasersClipsMaster: string
  readyForAlbum: string

  // Audit Page Translations
  auditGovernanceTag: string
  auditTitle: string
  auditSubtitle: string
  refreshBtn: string
  exportCsvBtn: string
  eventsToday: string
  eventsTodayDesc: string
  photoUploads: string
  photoUploadsDesc: string
  projectChanges: string
  projectChangesDesc: string
  activeUsers: string
  activeUsersDesc: string
  auditSearchPlaceholder: string
  allModules: string
  moduleSessions: string
  moduleMedia: string
  modulePlanner: string
  moduleClients: string
  moduleDeliveries: string
  allActions: string
  actionSessionCreated: string
  actionMediaUploaded: string
  actionMediaDeleted: string
  actionPlannerChanged: string
  actionStatusChanged: string
  actionClientCreated: string
  filterBtn: string
  recordsFound: string
  currentPageLast100: string
  queryingAuditLogs: string
  noAuditLogsFound: string
  colDateTime: string
  colUser: string
  colAction: string
  colModule: string
  colAffectedItem: string
  colDetails: string
  inspectDetails: string
  auditModalTitle: string
  userLabel: string
  dateAndAction: string
  affectedElementLabel: string
  payloadDiffLabel: string
  closeDetailBtn: string
  badgeUpload: string
  badgeDeleted: string
  badgePlanner: string
  badgeStatus: string
  badgeShared: string
  badgeCreated: string
  badgeModified: string

  // Live Console & Progress Translations
  calculatingEta: string
  remainingWord: string
  syncingWithCloud: string
  copyCompletedDesc: string
  connectingDriveAndPrep: string
  startingDriveGateway: string
  uploadingFileProgress: string
  driveTransferSuccess: string
  photosUploadedCount: string
  finalDeliveryPublished: string
  deliveryActiveBadge: string
  driveHighResAlbum: string
  copied: string
  copyLink: string
  openInDrive: string
  deliveryModeLabel: string
  syncedFromNas: string
  directCloudWeb: string
  filesAndWeight: string
  deliveryDateLabel: string
  cloudExpirationLabel: string
  noDriveDeliveryYet: string
  todayWord: string
  noDateWord: string
  previewEngineTitle: string
  previewsGenerated: string
  processingFilesCount: string
  driveSyncSuccessMsg: string
}

const translations: Record<Language, Translations> = {
  es: {
    dashboard: "Dashboard",
    calendar: "Calendario",
    calendarTitle: "Calendario de Sesiones & Rodajes",
    calendarSubtitle: "Organización de citas, rodajes de autor y notas de producción por cliente.",
    planner: "Tickets Planner",
    plannerTitle: "Planner de Proyectos & Tickets",
    plannerSubtitle: "Gestión de flujo de trabajo estilo tablero, notas de producción y entrega por etapas.",
    sessionNotes: "Notas de la Sesión",
    saveNotes: "Guardar Notas",
    unifiedView: "Vista Conjunta",
    photoSessions: "Fotos de Autor",
    videoProduction: "Producción Video",
    clientDirectory: "Directorio Clientes",
    categoriesMenu: "Categorías",
    categoriesTitle: "Categorías & Portfolio Web",
    categoriesSubtitle: "Gestión de taxonomía, subcategorías temáticas y fotos de muestra para clientes.",
    newCategoryBtn: "Nueva Categoría",
    newSubcategoryBtn: "Nueva Subcategoría",
    subcategories: "Subcategorías",
    addSubcategory: "Añadir Subcategoría",
    editCategory: "Editar Categoría",
    deleteCategory: "Eliminar Categoría",
    editSubcategory: "Editar Subcategoría",
    deleteSubcategory: "Eliminar Subcategoría",
    categoryPhotos: "Fotos de Galería / Portfolio",
    uploadPhoto: "Subir Foto",
    setAsCover: "Definir Portada",
    featuredOnWeb: "Destacado en Web",
    noSubcategoriesText: "Sin subcategorías (categoría directa)",
    noCategoriesFound: "No se encontraron categorías.",
    categoryNameLabel: "Nombre de Categoría",
    subcategoryNameLabel: "Nombre de Subcategoría",
    slugLabel: "Slug (Identificador URL)",
    descriptionLabel: "Descripción",
    saveChanges: "Guardar Cambios",
    confirmDeleteCategory: "¿Estás seguro de eliminar esta categoría y todas sus subcategorías asociadas?",
    confirmDeleteSubcategory: "¿Estás seguro de eliminar esta subcategoría?",
    categoriesCatalogLoading: "Cargando catálogo de categorías...",
    categoriesEmptyHelp: "Empieza creando tu primera categoría principal para organizar sesiones editoriales y fotos de clientes.",
    noDescription: "Sin descripción",
    inactiveBadge: "Inactivo",
    activeBadge: "Activo",
    photosWord: "fotos",
    subcategoriesOf: "Subcategorías de",
    managePhotosTooltip: "Administrar fotos de esta categoría",
    editCategoryTooltip: "Editar categoría",
    deleteCategoryTooltip: "Eliminar categoría",
    editSubcategoryTooltip: "Editar subcategoría",
    deleteSubcategoryTooltip: "Eliminar subcategoría",
    nameTranslationsHelp: "Traducciones de Nombre (Opcionales para la Web)",
    subNameTranslationsHelp: "Traducciones de Subcategoría (Opcionales)",
    displayOrderLabel: "Orden de Visualización",
    categoryActiveLabel: "Activa (Visible en formularios de sesiones y catálogo web)",
    parentCategoryLabel: "Categoría Padre",
    cancelBtn: "Cancelar",
    closeBtn: "Cerrar",
    uploadPhotosTitle: "Haz clic o arrastra fotos aquí",
    uploadingPhotos: "Subiendo imágenes a Supabase...",
    uploadFormatsHint: "Formatos: JPG, PNG, WebP • Se almacenarán en el bucket público de Supabase",
    featuredPhotosHint: "Las fotos marcadas con estrella se destacan en la web",
    noPhotosYet: "No hay fotos en esta sección aún. Sube la primera fotografía arriba.",
    coverBadge: "Portada",
    featuredBadge: "★ Destacada",
    makeCoverBtn: "Hacer Portada",
    unfeatureBtn: "No Destacar",
    featureBtn: "★ Destacar",
    viewFullScreen: "Ver en tamaño completo",
    deletePhotoTooltip: "Eliminar foto",
    uploadModalDesc: "Sube fotos para mostrar en el catálogo y portfolio de tu web para clientes.",
    nasStorage: "Almacenamiento NAS",
    auditTrail: "Auditoría & Trazabilidad",
    settings: "Configuración",
    studioManagement: "Gestión de Estudio",
    infrastructure: "Infraestructura",
    openClientPortal: "Espace Privé",
    languageLabel: "Idioma",
    themeLabel: "Estilo Visual",
    darkTheme: "Oscuro",
    lightTheme: "Claro",
    logout: "Cerrar Sesión",
    login: "Iniciar Sesión",
    adminRole: "Administrador",
    newSession: "Nueva Sesión",
    addSessionBtn: "Añadir Sesión",
    editSessionBtn: "Editar Sesión",
    editProject: "Editar Proyecto",
    ingestSd: "Ingesta SD / NAS",
    ingestShortBtn: "Ingesta",
    searchPlaceholder: "Buscar...",
    allCategories: "Todas las Categorías",
    allSubcategories: "Todas las Subcategorías",
    allStatuses: "Todos los Estados",
    clearFilters: "Limpiar Filtros",
    showing: "Mostrando",
    to: "a",
    of: "de",
    itemsPerPage: "por página",
    previous: "Anterior",
    next: "Siguiente",
    actions: "Acciones",
    manage: "Gestionar",
    viewFile: "Ver Ficha",
    status: "Estado",
    category: "Categoría",
    date: "Fecha",
    client: "Cliente",
    pin: "PIN Portal",
    drive: "Drive RAW",
    total: "Total",
    pending: "Pendiente",
    delivered: "Entregado",
    inEditing: "En Edición",
    shooting: "En Sesión / Rodaje",

    createSessionTitle: "Crear Nueva Sesión",
    editSessionTitle: "Editar Sesión",
    sessionDialogDesc: "Completa los detalles a continuación. Haz clic en guardar cuando termines.",
    clientNameLabel: "Nombre del Cliente",
    phoneLabel: "Teléfono",
    clientEmailLabel: "Email del Cliente",
    dateLabel: "Fecha de la Sesión",
    typeLabel: "Tipo de Sesión",
    categoryLabel: "Categoría Principal",
    subCategoryLabel: "Subcategoría",
    selectSubCategory: "Seleccionar subcategoría",
    statusLabel: "Estado de Producción",
    commentsLabel: "Comentarios / Notas",
    commentsPlaceholder: "Peticiones especiales o detalles...",
    tagsLabel: "Etiquetas (separadas por comas)",
    tagsPlaceholder: "usb, reel, album...",
    portalPinLabel: "PIN de Acceso al Portal",
    portalPinPlaceholder: "ej. 8942",
    createSessionSubmitBtn: "Crear Sesión",
    saveChangesBtn: "Guardar Cambios",

    espacePriveAccess: "ACCESO ESPACE PRIVÉ",
    newPin: "Nuevo PIN",
    clientPinCode: "CÓDIGO PIN DEL CLIENTE",
    copyPin: "Copiar PIN",
    photosChosenByClient: "Fotos Elegidas por Cliente",
    copyWhatsappInvite: "Copiar Invitación WhatsApp",
    testPortalWithPin: "Probar Portal con este PIN",
    requestedQuota: "Cupo de fotos a elegir",
    quotaHelp: "Límite de fotografías para este cliente",
    saveQuota: "Guardar cupo",
    clientEmailIdentifier: "Identificador (Email del Cliente):",
    noEmailWarning: "Sin email (requerido para conexión)",
    customQuotaLabel: "Personalizado:",
    quotaStrictLimit: "el cliente solo podrá validar exactamente esta cantidad de fotografías.",
    savedIndicator: "¡Guardado!",
    collapsePanels: "Plegar",
    expandPanels: "Desplegar Código y Almacenamiento",
    copyPinTooltip: "Clic para copiar el código PIN",
    clientSelectionLabel: "Selección:",
    notesLabel: "Notas:",
    activeLog: "Activas",
    zeroNotes: "0 notas",
    pinTabLabel: "Código PIN",
    storageTabLabel: "Almacenamiento",
    deliveryLink: "Entrega",
    storageHeader: "ALMACENAMIENTO NAS",
    ingestFromSdCard: "Ingestar desde Tarjeta SD",
    createFoldersBtn: "Crear Carpetas",
    statusDeliveredToClient: "Entregado al Cliente",

    clientsTitle: "Directorio de Clientes",
    clientsSubtitle: "Registro de novios, familias y retratos editoriales con historial de sesiones y PINs.",
    totalClients: "Total Clientes",
    sessionsCount: "Sesiones",
    sessionSingle: "Sesión",
    sessionsPlural: "Sesiones",
    linkedSessions: "Sesiones Vinculadas",
    lastActivity: "Última actividad",
    contactNone: "Sin contacto registrado",
    viewCard: "Ver Ficha",
    allSpecialties: "Todas las especialidades",
    photoOnly: "Solo Fotografía",
    videoOnly: "Solo Video",

    photosTitle: "Sesiones de Foto de Autor",
    photosSubtitle: "Gestión de clientes, credenciales PIN, carpetas RAW en Drive y estado de entrega.",
    totalSessions: "Total Sesiones",
    inProcessEditing: "En Proceso / Edición",
    deliveredSuccess: "Entregadas con Éxito",
    selectedPhotos: "fotos seleccionadas en Espace Privé",
    portalPin: "PIN Portal",
    driveRaw: "Drive RAW",

    videosTitle: "Sesiones de Video & Teasers",
    videosSubtitle: "Seguimiento de montajes, reels de Instagram, etalonaje y enlaces de entrega final 4K.",
    totalProjects: "Total Proyectos",
    inEditingRoom: "En Sala de Montaje",
    videosDelivered: "Videos Entregados",
    videoType: "Tipo de Video",
    finalDelivery: "Entrega Final",
    viewVideo: "Ver Video",

    projectsTitle: "Proyectos & Sesiones Globales",
    projectsSubtitle: "Gestión unificada de foto y video: ingesta SD a red, curaduría y estado del portal.",
    allProjects: "Todos los Proyectos",
    photoSessionsTab: "Fotos",
    videoProductionsTab: "Videos",
    selectionReady: "Selección Cliente Lista",
    clientSelection: "Selección del Cliente",

    sortRecent: "Más reciente primero",
    sortOldest: "Más antiguo primero",
    sortNameAsc: "Nombre (A - Z)",
    sortNameDesc: "Nombre (Z - A)",
    sortSessionsDesc: "Mayor N° de sesiones",
    wedding: "Boda",
    newborn: "Recién Nacido",
    portrait: "Retrato Editorial",
    maternity: "Maternidad",
    birthday: "Chadda / Cumpleaños",
    event: "Evento / Gala",
    product: "Producto",
    graduation: "Graduación",

    // Ingest Dialog
    ingestTitle: "Asistente de Ingesta SD y Almacenamiento",
    ingestSubtitle: "Vaciado de tarjeta de cámara, organización RAW en red y vistas previas WebP automáticas.",
    createNewProjectTab: "Crear Nuevo Proyecto",
    assignExistingSessionTab: "Asignar a Sesión Existente",
    projectNameLabel: "Nombre del Proyecto *",
    projectNamePlaceholder: "ej. Boda Zainab & Karim",
    assignClientLabel: "Asignar al Cliente *",
    assignClientPlaceholder: "Nombre del cliente o novios",
    sdOriginLabel: "Origen: Tarjeta SD / Carpeta Cámara",
    rescanBtn: "Reanalizar",
    verifyingBtn: "Verificando...",
    verifyBtn: "Verificar",
    unitReady: "Unidad lista",
    photosCount: "fotos",
    videosCount: "videos",
    automatedDestination: "Destino Automatizado (NAS / Red)",
    structureTag: "Estructura 01-04",
    startIngestBtn: "Iniciar Ingesta y Generación WebP",
    processingSdCard: "Procesando tarjeta de memoria...",
    realtimeConsole: "Consola de Eventos en Tiempo Real",
    eventsCount: "eventos",
    ingestFinishedTitle: "¡Ingesta y Curation Suite Completadas!",
    ingestFinishedSubtitle: "Los archivos se han distribuido en la red y las vistas previas WebP están listas.",
    rawPhotos: "Fotos RAW",
    rawVideos: "Videos RAW",
    transferred: "Transferido",
    projectDirectory: "Directorio del Proyecto",
    exploreFolder: "Explorar",
    downloadLogsBtn: "Descargar Registros (.txt)",
    goToGalleryBtn: "Ir a Galería de la Sesión",

    // Ingest Dialog: Selección de Cliente y Sesión
    searchSessionPlaceholder: "Buscar sesión por cliente, categoría o fecha...",
    orEnterUuidManually: "O introducir un UUID manualmente:",
    changeSessionBtn: "Cambiar",
    assignedBadge: "Asignada",
    existingClientTab: "Existente",
    newClientTab: "Nuevo",
    searchClientPlaceholder: "Buscar por nombre, teléfono, email...",
    clientSuggestions: "Sugerencias de Clientes",
    noClientFound: "No se encontró ningún cliente para",
    createAsNewClientBtn: "+ Crear como nuevo cliente",
    closeSuggestions: "Cerrar",
    existingClientAlert: "Cliente existente:",
    assignBtn: "Asignar",
    assignToThisSession: "Asignar a esta sesión",
    browseSourceBtn: "Explorar Archivos...",
    browseTargetBtn: "Explorar Carpetas...",
    explorerTitleSource: "Explorador de Tarjeta SD / Carpeta de Origen",
    explorerTitleTarget: "Explorador de Disco SSD / Carpeta de Destino",
    selectThisFolder: "Seleccionar esta carpeta",
    createNewFolder: "Nueva carpeta",
    upOneLevel: "Subir nivel",
    selectAllFiles: "Seleccionar todos",
    deselectAll: "Deseleccionar todos",
    filesSelectedCount: "archivos seleccionados",
    selectedFilesBadge: "archivos elegidos",

    // Ingest Dialog: SSD Destino y Unidades
    targetSsdTitle: "Destino de Trabajo (SSD Externo de Producción)",
    targetSsdDesc: "Selecciona la unidad física donde se organizarán los negativos originales. La ingesta escribirá en el SSD y después se sincronizará a la Red (NAS).",
    detectedDrivesLabel: "Unidades conectadas detectadas:",
    detectingBtn: "Detectando...",
    refreshDrivesBtn: "Actualizar",
    ssdExternalBadge: "SSD / Externo",
    systemDriveBadge: "Sistema C:",
    sameDriveAsOrigin: "Misma unidad que el Origen",
    targetBasePathLabel: "Ruta base en SSD / Carpeta raíz:",
    resetBtn: "Restablecer",
    proStructureOnSsd: "Estructura profesional en SSD:",
    nasSyncLater: "Sincronización NAS posterior:",
    samePathErrorTitle: "Error de seguridad: Origen y Destino idénticos",
    samePathErrorDesc: "La carpeta de origen y la de destino no pueden ser la misma para evitar sobreescrituras accidentales.",
    sameDriveWarningTitle: "¡Atención! Origen y Destino comparten la misma unidad",
    sameDriveWarningDesc: "Asegúrate de haber seleccionado tu disco SSD externo como destino y NO la tarjeta SD de la cámara.",
    insufficientSpaceTitle: "Espacio Insuficiente en SSD Destino",
    capacityWarningTitle: "Aviso de Capacidad",
    startIngestOnSsd: "Iniciar Ingesta en SSD",
    writingToSsd: "Destino de trabajo:",
    freeGBLabel: "libres",
    ofTotalLabel: "de",
    sourcePathNotExist: "La ruta de origen no existe o la tarjeta fue extraída.",
    proStructureDescRaw: "01_RAW/Fotos & Videos (Copia original de cámara)",
    proStructureDescEdits: "02_Seleccion_Cliente & 03_Edicion_Master",
    proStructureDescFinal: "04_Entregas_Finales",
    automatedTag: "01-04 Automatizado",
    checkingSourceAndFolders: "Verificando origen y preparando carpetas...",
    startingIngestFrom: "Iniciando ingesta desde:",
    fillProjectAndClient: "Por favor introduce el nombre del proyecto y el cliente.",
    ingestStepBadge: "Ingesta",
    selectClientHelper: "Selecciona un cliente existente para rellenar automáticamente sus datos.",
    loadingText: "Cargando...",

    // Media Manager
    photosTab: "Fotos",
    videosTab: "Vídeos",
    editionMasterTab: "Montaje",
    sharedWithClientTab: "Compartidas",
    clientSelectionTab: "Selección del Cliente",
    driveTab: "Drive",
    syncMasterBtn: "Sincronizar 03_Édition_Master",
    uploadMasterBtn: "Subir a Édition Master",
    searchMediaPlaceholder: "Buscar por archivo o notas...",
    shareBatchBtn: "Compartir Todo el Lote",
    hideBatchBtn: "Ocultar Todo",
    noMediaInTab: "Sin archivos en esta pestaña",
    useIngestInstruction: "Utiliza el botón superior 'Ingestar desde Tarjeta SD' para vaciar la tarjeta y sincronizar automáticamente.",
    inBookBadge: "En el Libro",
    unnamedFile: "Archivo sin nombre",
    clientNoteLabel: "Nota del Cliente:",
    sharedStatus: "Compartida",
    hiddenStatus: "Oculta",
    openWithApp: "Abrir en software de edición",
    revealInFolder: "Mostrar en carpeta del sistema",
    openInLocalFolder: "Abrir en Carpeta Local (SSD)",
    openInNasFolder: "Abrir en Servidor NAS (Red / FTP)",
    rotatePhoto: "Rotar Imagen",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    resetView: "Restablecer Vista",
    deleteFromSession: "Eliminar de la sesión",
    withNoteBadge: "Con Nota",
    clientRetouchInstruction: "Instrucción de Retoque del Cliente:",
    selectedPhotosForBook: "fotografías seleccionadas por el cliente para el libro",
    photosWithRetouchNotes: "con notas de retoque",
    commentedPhotosHint: "Las fotos comentadas tienen el distintivo naranja 'Con Nota'",
    masterTag: "Master",
    networkOriginal: "Original en Red",
    filterAll: "Todos",
    filterPhotos: "Fotos",
    filterVideos: "Videos",
    syncingText: "Sincronizando...",
    uploadingText: "Subiendo...",
    noMasterFiles: "No hay archivos en 03_Édition_Master",
    masterInstructions: "Guarda las fotos editadas o videos montados en la carpeta física '03_Edicion_Master' y pulsa 'Sincronizar 03_Édition_Master', o utiliza el botón 'Subir a Édition Master'.",
    masterFolderDescription: "Fotos retocadas y videos montados guardados en la carpeta física 03_Edicion_Master y sincronizados en Supabase con WebP.",

    // NAS Storage Dashboard
    nasInfrastructure: "Infraestructura NAS de Producción",
    nasTitle: "Almacenamiento en Red & Respaldos",
    nasSubtitle: "Gestión centralizada de negativos digitales, entregas finales y catálogo de proyectos en red.",
    routerZteOnline: "Router ZTE NAS (En Línea)",
    localMode: "Modo Local (C:\\Lamha-Storage)",
    usbNasCapacity: "Capacidad USB NAS",
    used: "Usado",
    free: "Libre",
    foldersInStorage: "Carpetas en Almacenamiento",
    scannedFiles: "Archivos en Disco/NAS",
    supabaseIndex: "Índice Supabase",
    storageRootPath: "Ruta Raíz del Almacenamiento",
    activePathLabel: "Ruta Activa:",
    copyPathBtn: "Copiar Ruta",
    copiedBtn: "Copiado",
    openInWindows: "Abrir en Windows",
    modifyRootPath: "Modificar Ruta Raíz",
    closeConfig: "Cerrar Configuración",
    presetZte: "Router ZTE NAS (192.168.11.1 /usb1_1)",
    presetLocal: "Disco Local (C:\\Lamha-Storage)",
    presetBackup: "Carpeta Respaldo NAS",
    hostIpLabel: "Host / IP del NAS",
    ftpUserLabel: "Usuario FTP",
    ftpPasswordLabel: "Contraseña FTP",
    ftpBaseFolderLabel: "Carpeta Raíz NAS",
    localFallbackPathLabel: "Ruta Local de Respaldo / Fallback",
    testingConn: "Probando conexión...",
    testConnBtn: "Probar Conexión",
    savingConfig: "Guardando...",
    saveActivePathBtn: "Establecer como Ruta Activa",
    projectsInStorageTab: "Proyectos en Almacenamiento",
    supabaseIndexTab: "Índice Supabase",
    searchNasPlaceholder: "Buscar proyecto, cliente o archivo...",
    linkedToSupabase: "Vinculado a Supabase",
    viewSessionBtn: "Ver Sesión",
    emptyDirectory: "Directorio vacío",

    // Settings Page
    studioSettingsTag: "Configuración del Estudio",
    generalSettingsTitle: "Parámetros Generales y Conectividad",
    generalSettingsSubtitle: "Ajustes de marca, estado de la base de datos Supabase y configuración de Espace Privé.",
    studioIdentity: "Identidad de Lam7a Studios",
    artisticDirection: "Dirección artística por Afaf Elaribi",
    atelierStudioLabel: "Atelier & Estudio",
    officialPhonesLabel: "Teléfonos Oficiales",
    emailLabel: "Correo Electrónico",
    supabaseInfra: "Infraestructura Supabase",
    postgresConnection: "Conexión PostgreSQL y Storage",
    linkStatus: "Estado del Enlace",
    connectedOperative: "Conectado y Operativo",
    connError: "Error de conexión",
    disconnected: "Desconectado",
    securityRls: "Seguridad y RLS",
    rlsActive: "Reglas Row Level Security (RLS) Activas",
    rlsDesc: "Los clientes solo pueden ver sus sesiones activas y fotografías seleccionadas.",
    clientPortalParams: "Parámetros del Portal Cliente (Espace Privé)",
    defaultPortalRules: "Reglas por defecto para la confección de libros de arte y galerías",
    bookQuota: "Cuota Base del Libro",
    bookQuotaValue: "20 Fotografías",
    bookQuotaDesc: "Límite estándar de confección para encuadernación artesanal en lino.",
    accessSecurity: "Seguridad de Acceso",
    pinSecurityValue: "Código PIN Numérico (4 Dígitos)",
    pinSecurityDesc: "Autenticación rápida sin contraseñas complejas para clientes.",
    localPortalServer: "Servidor Local del Portal",
    portalServerDesc: "Página de bienvenida pública e interfaz de selección de fotos.",

    // Dual Storage & Deliveries
    dualStorageEnvTitle: "Entorno Dual de Almacenamiento & Entregas",
    dualStorageEnvSubtitle: "Conmuta libremente entre el Modo Nube (viajes/portátil) y el Modo Estudio (NAS físico local).",
    activeModeLabel: "Modo Activo:",
    activeModeNas: "🏢 Estudio (NAS)",
    activeModeCloud: "☁️ Nube (Drive Directo)",
    modeCloudTitle: "☁️ Modo Nube / Remoto",
    modeCloudDesc: "Sube directamente a Google Drive desde el navegador. Ideal para viajar, trabajar con portátil o sin NAS disponible.",
    modeNasTitle: "🏢 Modo Estudio / NAS",
    modeNasDesc: "Prioriza el NAS local en el router (192.168.11.1) y sincroniza desde la carpeta 04_Entregas_Finales.",
    modeAutoTitle: "⚡ Auto-Detección",
    modeAutoDesc: "Detecta si el NAS está online. Si estás en el estudio usa el NAS; si estás de viaje conmuta automáticamente a la Nube.",
    nasServerStatus: "Estado Servidor NAS",
    nasOnlineLabel: "En Línea (192.168.11.1)",
    nasOfflineLabel: "Desconectado / Modo Remoto",
    nasFtpAvailable: "Acceso FTP disponible en red local",
    nasNoConnection: "Sin conexión al router del estudio",
    changeAccount: "Cambiar cuenta",
    disconnect: "Desconectar",
    connectedOAuth: "Conectado (OAuth 2.0)",
    unlinked: "Sin vincular",
    connectGoogleDrive: "🔗 Conectar Google Drive",
    unlimitedQuotaNote: "Cuota ilimitada de tu cuenta personal activa.",
    deliveryRetention: "Retención de Entregas",
    daysInCloud: "días en la nube",
    retentionNotice: "Tras este plazo se moverá a la papelera de Drive.",
    manualRecycleBtn: "🗑️ Ejecutar Reciclaje Manual de Carpetas Caducadas",
    cleaningInProgress: "Procesando limpieza...",
    saveStoragePreferences: "Guardar Preferencias de Almacenamiento",
    saving: "Guardando...",

    // Dashboard Overview
    atelierTag: "Atelier de Haute Photographie",
    overviewTitle: "Vista General",
    overviewDesc: "Panel de curaduría de libros de autor, control de entregas directas a clientes y respaldo Synology NAS RAID 6.",
    viewPhotoSessionsBtn: "Ver Sesiones de Foto",
    totalSessionsKpi: "Total Sesiones",
    inActiveProduction: "en producción activa",
    photoCollectionsKpi: "Colecciones de Fotos",
    manageGallery: "Gestionar galería",
    videoProductionKpi: "Producción Video",
    projectsAndReels: "Proyectos y Reels",
    clientSelectionsKpi: "Selecciones de Clientes",
    selectionReadyDesc: "Fotos elegidas listas para álbum",
    waitingSelectionsDesc: "En espera de selecciones en el portal",
    recentSessionsTitle: "Sesiones Recientes y Estado del Portal",
    recentSessionsSubtitle: "Clientes activos, códigos PIN configurados y fotos seleccionadas en Espace Privé",
    viewAllSessionsLink: "Ver todas las sesiones",
    workflowStatus: "Estado del Flujo de Trabajo",
    noSessionsFound: "No se encontraron sesiones en la base de datos Supabase.",
    categoryDistributionTitle: "Distribución por Categoría",
    categoryDistributionSubtitle: "Proyectos por tipo de sesión editorial",
    workflowFunnelTitle: "Embudo de Workflow",
    workflowFunnelSubtitle: "Estado actual de entregas y confección",
    noSessionsData: "No hay sesiones registradas aún.",
    noWorkflowData: "Sin datos de workflow.",

    // Google Drive Upload
    syncAlbumToDrive: "Sincronizar Álbum a Google Drive",
    transferPhotosFrom: "Transfiere las fotos desde",
    syncInProgress: "Sincronización en curso...",
    syncToDriveBtn: "⚡ Sincronizar a Google Drive",
    uploadCompletedTitle: "Subida Completada",
    uploadErrorTitle: "Error en la subida",
    uploadingToDrive: "Subiendo a Google Drive",
    filesCountStr: "archivos",

    // Master / Dual NAS Upload & Sync Modal
    uploadMasterDualNas: "Subir / Sincronizar Master (Dual NAS)",
    masterDeliveryManagerTitle: "Gestor de Entrega Master & Réplica Dual",
    ingestStyleBadge: "Estilo Ingesta",
    masterDeliveryManagerSubtitle: "Guarda tus fotos y videos en SSD local y duplica automáticamente en el NAS del estudio.",
    verifyingNas: "Verificando NAS...",
    nasOnline: "NAS Online",
    nasOfflineLocalOnly: "NAS Desconectado (Solo Local)",
    recheckNasTooltip: "Volver a comprobar NAS",
    tabUploadNewFiles: "1. Subir Nuevos Archivos",
    tabSyncLocalToNas: "2. Sincronizar Carpeta con NAS",
    folderMasterDesc: "Fotos y Videos procesados tras el montaje.",
    folderDeliveryDesc: "Exportación final lista para entregar al cliente.",
    dualCopyLabel: "Copia dual: Guardar en SSD local y enviar copia al NAS (192.168.11.1)",
    replicaNasActivated: "Réplica NAS Activada",
    localOnly: "Solo Local",
    selectEditedMediaTitle: "Selecciona las fotos o videos editados",
    supportedFormatsDesc: "Formatos RAW (NEF, CR2, ARW), JPEG, PNG y MP4/MOV de alta resolución.",
    selectFilesBtn: "Seleccionar Archivos",
    selectFolderBtn: "Seleccionar Carpeta Completa",
    selectedFilesCount: "archivos seleccionados",
    clearList: "Limpiar lista",
    startDualUploadBtn: "Iniciar Subida Dual",
    syncLocalEditedTitle: "Sincronizar archivos locales ya editados al NAS",
    syncLocalEditedDesc: "Si editaste fotos en tu ordenador (en Lightroom o Photoshop) o trabajaste sin conexión, esta función lee la carpeta física local y envía al NAS cualquier archivo que falte.",
    localSourceLabel: "Origen Local:",
    nasDestLabel: "Destino NAS:",
    scanAndReplicateBtn: "Escanear y Replicar al NAS ZTE",
    nasNotAccessible: "El NAS no está accesible en la red local",
    liveConsoleLogs: "Consola de Registro en Vivo",
    transferSuccessTitle: "¡Transferencia completada con éxito!",
    transferSuccessDesc: "archivos sincronizados correctamente entre el SSD local y el almacenamiento de red NAS.",
    acceptAndClose: "Aceptar y Cerrar",

    clientDirectoryTag: "Fichero de Alta Costura",
    videoProductionTag: "Producción Cinematográfica",
    photoCollectionsTag: "Colecciones de Fotografía",
    atelierUnifiedTag: "Vista Conjunta del Atelier",
    totalSuffix: "totales",

    allWord: "Todos",
    allWordFeminine: "Todas",
    withFinalVideo: "Con Video Final",
    pendingVideo: "Pendiente",
    withGeneratedPin: "Con PIN Generado",
    withSelection: "Con Selección",
    withSelectionMade: "Con Selección Realizada",
    awaitingSelection: "En Espera de Selección",
    noPin: "Sin PIN",
    noDrive: "Sin Drive",
    noVideoProductionsFound: "No se encontraron producciones de video con los filtros aplicados.",
    noPhotoSessionsFound: "No se encontraron sesiones fotográficas con los filtros aplicados.",
    photosAndVideosCataloged: "Fotos y Videos catalogados",
    editorialAndWeddings: "Retrato editorial y bodas",
    teasersClipsMaster: "Teasers, clips y master",
    readyForAlbum: "Listas para confección de álbum",

    auditGovernanceTag: "ERP Multi-User Governance",
    auditTitle: "Auditoría & Trazabilidad Estricta",
    auditSubtitle: "Registro cronológico inmutable de actividad: quién creó proyectos, quién subió o eliminó fotos, y quién modificó el planner.",
    refreshBtn: "Actualizar",
    exportCsvBtn: "Exportar CSV",
    eventsToday: "Eventos Hoy",
    eventsTodayDesc: "Registros de actividad hoy",
    photoUploads: "Subidas de Fotos",
    photoUploadsDesc: "Lotes multimedia subidos",
    projectChanges: "Cambios en Proyectos",
    projectChangesDesc: "Estados o fechas modificadas",
    activeUsers: "Usuarios Activos",
    activeUsersDesc: "Colaboradores conectados hoy",
    auditSearchPlaceholder: "Buscar por nombre de proyecto, archivo, cliente o usuario...",
    allModules: "Todos los Módulos",
    moduleSessions: "Proyectos / Sesiones",
    moduleMedia: "Fotos & Videos",
    modulePlanner: "Planner / Kanban",
    moduleClients: "Clientes",
    moduleDeliveries: "Entregas",
    allActions: "Todas las Acciones",
    actionSessionCreated: "Creación de Proyectos",
    actionMediaUploaded: "Subida de Fotos",
    actionMediaDeleted: "Eliminación de Fotos",
    actionPlannerChanged: "Avance en Planner",
    actionStatusChanged: "Cambio de Estado",
    actionClientCreated: "Alta de Clientes",
    filterBtn: "Filtrar",
    recordsFound: "Registros Encontrados",
    currentPageLast100: "Página actual: últimos 100 registros",
    queryingAuditLogs: "Consultando registros de auditoría en la base de datos...",
    noAuditLogsFound: "No se encontraron registros de auditoría con los filtros aplicados.",
    colDateTime: "Fecha & Hora",
    colUser: "Usuario Responsable",
    colAction: "Acción Realizada",
    colModule: "Módulo",
    colAffectedItem: "Elemento Afectado",
    colDetails: "Detalles",
    inspectDetails: "Inspeccionar detalles",
    auditModalTitle: "Detalle del Evento de Auditoría",
    userLabel: "Usuario",
    dateAndAction: "Fecha y Acción",
    affectedElementLabel: "Elemento Afectado",
    payloadDiffLabel: "Carga de Datos Modificada (JSON Diff / Payload)",
    closeDetailBtn: "Cerrar Detalle",
    badgeUpload: "Subida de Fotos",
    badgeDeleted: "Borrado",
    badgePlanner: "Planner Kanban",
    badgeStatus: "Cambio de Estado",
    badgeShared: "Compartir Selección",
    badgeCreated: "Creación",
    badgeModified: "Modificación",

    calculatingEta: "calculando...",
    remainingWord: "quedan",
    syncingWithCloud: "Registrando archivos en Supabase Cloud...",
    copyCompletedDesc: "¡Copia completada! Las vistas previas se generan en segundo plano.",
    connectingDriveAndPrep: "Conectando con Google Drive y preparando archivos...",
    startingDriveGateway: "🚀 Iniciando pasarela hacia Google Drive en segundo plano...",
    uploadingFileProgress: "Subiendo",
    driveTransferSuccess: "¡Entrega transferida a Google Drive con éxito!",
    photosUploadedCount: "fotos subidas.",
    finalDeliveryPublished: "Entrega Final Publicada al Cliente",
    deliveryActiveBadge: "ACTIVA",
    driveHighResAlbum: "Álbum de Alta Resolución en Google Drive",
    copied: "Copiado",
    copyLink: "Copiar Enlace",
    openInDrive: "Abrir en Drive",
    deliveryModeLabel: "Modo de Entrega",
    syncedFromNas: "Sincronizado desde NAS",
    directCloudWeb: "Nube Directa (Web)",
    filesAndWeight: "Archivos / Peso",
    deliveryDateLabel: "Fecha de Entrega",
    cloudExpirationLabel: "Expiración en Nube",
    noDriveDeliveryYet: "Esta sesión aún no tiene una entrega final en Google Drive activa para el cliente.",
    todayWord: "Hoy",
    noDateWord: "Sin fecha",
    previewEngineTitle: "Motor de Vistas Previas",
    previewsGenerated: "Vistas previas generadas",
    processingFilesCount: "Procesando",
    driveSyncSuccessMsg: "¡Éxito! Transferencia completada hacia Google Drive.",
  },
  fr: {
    dashboard: "Tableau de Bord",
    calendar: "Calendrier",
    calendarTitle: "Calendrier des Séances & Tournages",
    calendarSubtitle: "Organisation des rendez-vous, tournages et notes de production par client.",
    planner: "Tickets Planner",
    plannerTitle: "Planner de Projets & Tickets",
    plannerSubtitle: "Gestion de flux de production style tableau, suivi des notes et validation client par étape.",
    sessionNotes: "Notes de la Séance",
    saveNotes: "Enregistrer les Notes",
    unifiedView: "Vue Ensemble",
    photoSessions: "Photos d'Auteur",
    videoProduction: "Production Vidéo",
    clientDirectory: "Répertoire Clients",
    categoriesMenu: "Catégories",
    categoriesTitle: "Catégories & Portfolio Web",
    categoriesSubtitle: "Gestion de la taxonomie, sous-catégories thématiques et photos d'exposition client.",
    newCategoryBtn: "Nouvelle Catégorie",
    newSubcategoryBtn: "Nouvelle Sous-catégorie",
    subcategories: "Sous-catégories",
    addSubcategory: "Ajouter Sous-catégorie",
    editCategory: "Modifier la Catégorie",
    deleteCategory: "Supprimer la Catégorie",
    editSubcategory: "Modifier la Sous-catégorie",
    deleteSubcategory: "Supprimer la Sous-catégorie",
    categoryPhotos: "Photos Galerie / Portfolio",
    uploadPhoto: "Ajouter une Photo",
    setAsCover: "Définir comme Couverture",
    featuredOnWeb: "Mis en avant sur le Web",
    noSubcategoriesText: "Aucune sous-catégorie (catégorie directe)",
    noCategoriesFound: "Aucune catégorie trouvée.",
    categoryNameLabel: "Nom de la Catégorie",
    subcategoryNameLabel: "Nom de la Sous-catégorie",
    slugLabel: "Slug (Identifiant URL)",
    descriptionLabel: "Description",
    saveChanges: "Enregistrer les Modifications",
    confirmDeleteCategory: "Êtes-vous sûr de vouloir supprimer cette catégorie et toutes ses sous-catégories associées ?",
    confirmDeleteSubcategory: "Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?",
    categoriesCatalogLoading: "Chargement du catalogue de catégories...",
    categoriesEmptyHelp: "Commencez par créer votre première catégorie principale pour organiser les séances et les photos clients.",
    noDescription: "Sans description",
    inactiveBadge: "Inactif",
    activeBadge: "Actif",
    photosWord: "photos",
    subcategoriesOf: "Sous-catégories de",
    managePhotosTooltip: "Gérer les photos de cette catégorie",
    editCategoryTooltip: "Modifier la catégorie",
    deleteCategoryTooltip: "Supprimer la catégorie",
    editSubcategoryTooltip: "Modifier la sous-catégorie",
    deleteSubcategoryTooltip: "Supprimer la sous-catégorie",
    nameTranslationsHelp: "Traductions du Nom (Optionnel pour le Web)",
    subNameTranslationsHelp: "Traductions de la Sous-catégorie (Optionnel)",
    displayOrderLabel: "Ordre d'Affichage",
    categoryActiveLabel: "Active (Visible dans les formulaires et le catalogue web)",
    parentCategoryLabel: "Catégorie Parente",
    cancelBtn: "Annuler",
    closeBtn: "Fermer",
    uploadPhotosTitle: "Cliquez ou glissez des photos ici",
    uploadingPhotos: "Téléchargement d'images vers Supabase...",
    uploadFormatsHint: "Formats: JPG, PNG, WebP • Stockées dans le bucket public Supabase",
    featuredPhotosHint: "Les photos étoilées sont mises en valeur sur le site",
    noPhotosYet: "Aucune photo dans cette section pour l'instant. Ajoutez une première photo ci-dessus.",
    coverBadge: "Couverture",
    featuredBadge: "★ À la une",
    makeCoverBtn: "Définir comme Couverture",
    unfeatureBtn: "Retirer",
    featureBtn: "★ Mettre en avant",
    viewFullScreen: "Voir en taille réelle",
    deletePhotoTooltip: "Supprimer la photo",
    uploadModalDesc: "Téléchargez des photos pour le catalogue et le portfolio de votre site client.",
    nasStorage: "Stockage NAS",
    auditTrail: "Audit & Traçabilité",
    settings: "Paramètres",
    studioManagement: "Gestion de l'Atelier",
    infrastructure: "Infrastructure",
    openClientPortal: "Espace Privé",
    languageLabel: "Langue",
    themeLabel: "Style Visuel",
    darkTheme: "Sombre",
    lightTheme: "Clair",
    logout: "Déconnexion",
    login: "Connexion",
    adminRole: "Administrateur",
    newSession: "Nouvelle Session",
    addSessionBtn: "Ajouter Session",
    editSessionBtn: "Modifier Session",
    editProject: "Modifier le Projet",
    ingestSd: "Ingestion SD / NAS",
    ingestShortBtn: "Ingestion",
    searchPlaceholder: "Rechercher...",
    allCategories: "Toutes les Catégories",
    allSubcategories: "Toutes les Sous-catégories",
    allStatuses: "Tous les Statuts",
    clearFilters: "Réinitialiser Filtres",
    showing: "Affichage de",
    to: "à",
    of: "sur",
    itemsPerPage: "par page",
    previous: "Précédent",
    next: "Suivant",
    actions: "Actions",
    manage: "Gérer",
    viewFile: "Voir Fiche",
    status: "Statut",
    category: "Catégorie",
    date: "Date",
    client: "Client",
    pin: "Code PIN",
    drive: "Drive RAW",
    total: "Total",
    pending: "En attente",
    delivered: "Livré",
    inEditing: "En Édition",
    shooting: "En Séance / Tournage",

    createSessionTitle: "Créer une Nouvelle Session",
    editSessionTitle: "Modifier la Session",
    sessionDialogDesc: "Remplissez les détails ci-dessous. Cliquez sur enregistrer une fois terminé.",
    clientNameLabel: "Nom du Client",
    phoneLabel: "Téléphone",
    clientEmailLabel: "E-mail du Client",
    dateLabel: "Date de la Session",
    typeLabel: "Type de Session",
    categoryLabel: "Catégorie Principale",
    subCategoryLabel: "Sous-catégorie",
    selectSubCategory: "Sélectionner sous-catégorie",
    statusLabel: "Statut de Production",
    commentsLabel: "Commentaires / Remarques",
    commentsPlaceholder: "Demandes particulières ou détails...",
    tagsLabel: "Tags (séparés par des virgules)",
    tagsPlaceholder: "usb, reel, album...",
    portalPinLabel: "Code PIN d'Accès Portail",
    portalPinPlaceholder: "ex. 8942",
    createSessionSubmitBtn: "Créer la Session",
    saveChangesBtn: "Enregistrer les modifications",

    espacePriveAccess: "ACCÈS ESPACE PRIVÉ",
    newPin: "Nouveau PIN",
    clientPinCode: "CODE PIN DU CLIENT",
    copyPin: "Copier PIN",
    photosChosenByClient: "Photos choisies par le client",
    copyWhatsappInvite: "Copier invitation WhatsApp",
    testPortalWithPin: "Tester le Portail avec ce PIN",
    requestedQuota: "Quota de photos à sélectionner",
    quotaHelp: "Limite de photographies pour ce client",
    saveQuota: "Enregistrer le quota",
    clientEmailIdentifier: "Identifiant (Email Client) :",
    noEmailWarning: "Aucun email (requis pour connexion)",
    customQuotaLabel: "Personnalisé :",
    quotaStrictLimit: "le client ne pourra valider qu'exactement ce nombre de photographies.",
    savedIndicator: "Enregistré !",
    collapsePanels: "Réduire",
    expandPanels: "Développer Code & Stockage",
    copyPinTooltip: "Cliquer pour copier le code PIN",
    clientSelectionLabel: "Sélection client :",
    notesLabel: "Notes :",
    activeLog: "Journal Actif",
    zeroNotes: "0 notes",
    pinTabLabel: "Espace Privé",
    storageTabLabel: "Stockage Studio",
    deliveryLink: "Livraison",
    storageHeader: "STOCKAGE NAS",
    ingestFromSdCard: "Ingérer depuis la carte SD",
    createFoldersBtn: "Créer des dossiers",
    statusDeliveredToClient: "Livré au Client",

    clientsTitle: "Répertoire des Clients",
    clientsSubtitle: "Registre des mariés, familles et portraits éditoriaux avec historique des sessions et PIN.",
    totalClients: "Total Clients",
    sessionsCount: "Sessions",
    sessionSingle: "Session",
    sessionsPlural: "Sessions",
    linkedSessions: "Sessions Associées",
    lastActivity: "Dernière activité",
    contactNone: "Aucun contact enregistré",
    viewCard: "Voir Fiche",
    allSpecialties: "Toutes spécialités",
    photoOnly: "Photo uniquement",
    videoOnly: "Vidéo uniquement",

    photosTitle: "Sessions Photos d'Auteur",
    photosSubtitle: "Gestion des clients, codes PIN, dossiers Drive RAW et statut de livraison.",
    totalSessions: "Total Sessions",
    inProcessEditing: "En Édition / Retouche",
    deliveredSuccess: "Livrées avec Succès",
    selectedPhotos: "photos sélectionnées dans l'Espace Privé",
    portalPin: "Code PIN",
    driveRaw: "Drive RAW",

    videosTitle: "Sessions Vidéos & Teasers",
    videosSubtitle: "Suivi des montages, reels Instagram, étalonnage et liens de livraison 4K.",
    totalProjects: "Total Projets",
    inEditingRoom: "En Salle de Montage",
    videosDelivered: "Vidéos Livrées",
    videoType: "Type de Vidéo",
    finalDelivery: "Livraison Finale",
    viewVideo: "Voir Vidéo",

    projectsTitle: "Projets & Sessions Globales",
    projectsSubtitle: "Gestion unifiée photo et vidéo : ingestion SD, curation et statut du portail.",
    allProjects: "Tous les Projets",
    photoSessionsTab: "Photos",
    videoProductionsTab: "Vidéos",
    selectionReady: "Sélection Client Prête",
    clientSelection: "Sélection Client",

    sortRecent: "Plus récent en premier",
    sortOldest: "Plus ancien en premier",
    sortNameAsc: "Nom (A - Z)",
    sortNameDesc: "Nom (Z - A)",
    sortSessionsDesc: "Plus grand nombre de sessions",
    wedding: "Mariage",
    newborn: "Nouveau-né",
    portrait: "Portrait Éditorial",
    maternity: "Maternité",
    birthday: "Chadda / Anniversaire",
    event: "Événement / Gala",
    product: "Produit",
    graduation: "Remise de Diplôme",

    // Ingest Dialog
    ingestTitle: "Assistant d'Ingestion SD & Stockage",
    ingestSubtitle: "Vider la carte de l'appareil, organisation RAW réseau et aperçus WebP automatiques.",
    createNewProjectTab: "Créer un Nouveau Projet",
    assignExistingSessionTab: "Assigner à une Session Existante",
    projectNameLabel: "Nom du Projet *",
    projectNamePlaceholder: "ex. Mariage Zainab & Karim",
    assignClientLabel: "Assigner au Client *",
    assignClientPlaceholder: "Nom du client ou des mariés",
    sdOriginLabel: "Source : Carte SD / Dossier Appareil",
    rescanBtn: "Réanalyser",
    verifyingBtn: "Vérification...",
    verifyBtn: "Vérifier",
    unitReady: "Disque prêt",
    photosCount: "photos",
    videosCount: "vidéos",
    automatedDestination: "Destination Automatisée (NAS / Réseau)",
    structureTag: "Structure 01-04",
    startIngestBtn: "Lancer l'Ingestion & Génération WebP",
    processingSdCard: "Traitement de la carte mémoire...",
    realtimeConsole: "Console d'Événements en Temps Réel",
    eventsCount: "événements",
    ingestFinishedTitle: "Ingestion & Suite de Curation Terminées !",
    ingestFinishedSubtitle: "Les fichiers ont été distribués sur le réseau et les aperçus WebP sont prêts.",
    rawPhotos: "Photos RAW",
    rawVideos: "Vidéos RAW",
    transferred: "Transféré",
    projectDirectory: "Répertoire du Projet",
    exploreFolder: "Explorer",
    downloadLogsBtn: "Télécharger les Logs (.txt)",
    goToGalleryBtn: "Aller à la Galerie de la Session",

    // Ingest Dialog: Sélection de Client et Session
    searchSessionPlaceholder: "Rechercher une session par client, catégorie, date...",
    orEnterUuidManually: "Ou saisir un UUID manuellement :",
    changeSessionBtn: "Changer",
    assignedBadge: "Assignée",
    existingClientTab: "Existant",
    newClientTab: "Nouveau",
    searchClientPlaceholder: "Rechercher par nom, téléphone, email...",
    clientSuggestions: "Suggestions Clients",
    noClientFound: "Aucun client trouvé pour",
    createAsNewClientBtn: "+ Créer comme nouveau client",
    closeSuggestions: "Fermer",
    existingClientAlert: "Client existant :",
    assignBtn: "Assigner",
    assignToThisSession: "Assigner à cette session",
    browseSourceBtn: "Parcourir Fichiers...",
    browseTargetBtn: "Parcourir Dossiers...",
    explorerTitleSource: "Explorateur de Carte SD / Dossier Source",
    explorerTitleTarget: "Explorateur de Disque SSD / Dossier Destination",
    selectThisFolder: "Sélectionner ce dossier",
    createNewFolder: "Nouveau dossier",
    upOneLevel: "Dossier parent",
    selectAllFiles: "Tout sélectionner",
    deselectAll: "Tout désélectionner",
    filesSelectedCount: "fichiers sélectionnés",
    selectedFilesBadge: "fichiers choisis",

    // Ingest Dialog: SSD Destination et Lecteurs
    targetSsdTitle: "Destination de Travail (SSD Externe de Production)",
    targetSsdDesc: "Sélectionnez le lecteur physique où seront organisés les négatifs originaux. L'ingestion écrira sur le SSD puis se synchronisera avec le réseau (NAS).",
    detectedDrivesLabel: "Lecteurs connectés détectés :",
    detectingBtn: "Détection...",
    refreshDrivesBtn: "Actualiser",
    ssdExternalBadge: "SSD / Externe",
    systemDriveBadge: "Système C:",
    sameDriveAsOrigin: "Même lecteur que la Source",
    targetBasePathLabel: "Chemin racine sur le SSD :",
    resetBtn: "Réinitialiser",
    proStructureOnSsd: "Structure professionnelle sur SSD :",
    nasSyncLater: "Synchronisation NAS ultérieure :",
    samePathErrorTitle: "Erreur de sécurité : Source et Destination identiques",
    samePathErrorDesc: "Le dossier source et le dossier de destination ne peuvent pas être identiques pour éviter tout écrasement accidentel.",
    sameDriveWarningTitle: "Attention ! La Source et la Destination partagent le même lecteur",
    sameDriveWarningDesc: "Assurez-vous d'avoir sélectionné votre SSD externe comme destination et NON la carte SD de l'appareil.",
    insufficientSpaceTitle: "Espace Insuffisant sur le SSD Destination",
    capacityWarningTitle: "Avis de Capacité",
    startIngestOnSsd: "Lancer l'Ingestion sur SSD",
    writingToSsd: "Destination de travail :",
    freeGBLabel: "libres",
    ofTotalLabel: "sur",
    sourcePathNotExist: "Le chemin source n'existe pas ou la carte a été retirée.",
    proStructureDescRaw: "01_RAW/Photos & Vidéos (Copie originale de caméra)",
    proStructureDescEdits: "02_Sélection_Client & 03_Édition_Master",
    proStructureDescFinal: "04_Livraisons_Finales",
    automatedTag: "01-04 Automatisé",
    checkingSourceAndFolders: "Vérification de la source et préparation des dossiers...",
    startingIngestFrom: "Démarrage de l'ingestion depuis :",
    fillProjectAndClient: "Veuillez saisir le nom du projet et du client.",
    ingestStepBadge: "Ingestion",
    selectClientHelper: "Sélectionnez un client existant pour préremplir automatiquement ses coordonnées.",
    loadingText: "Chargement...",

    // Media Manager
    photosTab: "Photos",
    videosTab: "Vidéos",
    editionMasterTab: "Montage",
    sharedWithClientTab: "Partagées",
    clientSelectionTab: "Choix du Client",
    driveTab: "Drive",
    syncMasterBtn: "Synchroniser 03_Édition_Master",
    uploadMasterBtn: "Importer dans Édition Master",
    searchMediaPlaceholder: "Rechercher par fichier ou notes...",
    shareBatchBtn: "Partager Tout le Lot",
    hideBatchBtn: "Masquer Tout",
    noMediaInTab: "Aucun fichier dans cet onglet",
    useIngestInstruction: "Utilisez le bouton supérieur 'Ingérer depuis la carte SD' pour vider la carte et synchroniser automatiquement.",
    inBookBadge: "Dans le Livre",
    unnamedFile: "Fichier sans nom",
    clientNoteLabel: "Note du Client :",
    sharedStatus: "Partagée",
    hiddenStatus: "Masquée",
    openWithApp: "Ouvrir dans le logiciel de retouche",
    revealInFolder: "Afficher dans le dossier système",
    openInLocalFolder: "Ouvrir dans le dossier local (SSD)",
    openInNasFolder: "Ouvrir sur le serveur NAS (Réseau / FTP)",
    rotatePhoto: "Faire pivoter la photo",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    resetView: "Réinitialiser",
    deleteFromSession: "Supprimer de la session",
    withNoteBadge: "Avec Note",
    clientRetouchInstruction: "Instruction de Retouche du Client :",
    selectedPhotosForBook: "photographies sélectionnées par le client pour le livre",
    photosWithRetouchNotes: "avec notes de retouche",
    commentedPhotosHint: "Les photos commentées portent le badge orange 'Avec Note'",
    masterTag: "Master",
    networkOriginal: "Original Réseau",
    filterAll: "Tous",
    filterPhotos: "Photos",
    filterVideos: "Vidéos",
    syncingText: "Synchronisation...",
    uploadingText: "Téléversement...",
    noMasterFiles: "Aucun fichier dans 03_Édition_Master",
    masterInstructions: "Enregistrez les photos retouchées ou vidéos montées dans le dossier physique '03_Edicion_Master' et cliquez sur 'Synchroniser', ou utilisez le bouton 'Téléverser'.",
    masterFolderDescription: "Photos retouchées et vidéos montées enregistrées dans le dossier physique 03_Edicion_Master et synchronisées sur Supabase en WebP.",

    // NAS Storage Dashboard
    nasInfrastructure: "Infrastructure NAS de Production",
    nasTitle: "Stockage Réseau & Sauvegarde",
    nasSubtitle: "Gestion centralisée du stockage des négatifs numériques, livraisons finales et catalogue des projets.",
    routerZteOnline: "Routeur ZTE NAS (En Ligne)",
    localMode: "Mode Local (C:\\Lamha-Storage)",
    usbNasCapacity: "Capacité USB NAS",
    used: "Utilisé",
    free: "Libre",
    foldersInStorage: "Dossiers dans le Stockage",
    scannedFiles: "Fichiers sur Disque/NAS",
    supabaseIndex: "Index Supabase",
    storageRootPath: "Chemin Racine du Stockage",
    activePathLabel: "Chemin Actif :",
    copyPathBtn: "Copier le Chemin",
    copiedBtn: "Copié",
    openInWindows: "Ouvrir dans Windows",
    modifyRootPath: "Modifier le Chemin Racine",
    closeConfig: "Fermer la Configuration",
    presetZte: "Routeur ZTE NAS (192.168.11.1 /usb1_1)",
    presetLocal: "Disque Local (C:\\Lamha-Storage)",
    presetBackup: "Dossier Sauvegarde NAS",
    hostIpLabel: "Hôte / IP du NAS",
    ftpUserLabel: "Utilisateur FTP",
    ftpPasswordLabel: "Mot de passe FTP",
    ftpBaseFolderLabel: "Dossier Racine NAS",
    localFallbackPathLabel: "Chemin Local de Secours / Fallback",
    testingConn: "Test en cours...",
    testConnBtn: "Tester la Connexion",
    savingConfig: "Enregistrement...",
    saveActivePathBtn: "Définir comme Chemin Actif",
    projectsInStorageTab: "Projets dans le Stockage",
    supabaseIndexTab: "Index Supabase",
    searchNasPlaceholder: "Rechercher un projet, client ou fichier...",
    linkedToSupabase: "Lié à Supabase",
    viewSessionBtn: "Voir Session",
    emptyDirectory: "Répertoire vide",

    // Settings Page
    studioSettingsTag: "Configuration de l'Atelier",
    generalSettingsTitle: "Paramètres Généraux & Connectivité",
    generalSettingsSubtitle: "Paramètres de marque, état de la base de données Supabase et configuration de l'Espace Privé.",
    studioIdentity: "Identité de Lam7a Studios",
    artisticDirection: "Direction artistique par Afaf Elaribi",
    atelierStudioLabel: "Atelier & Studio",
    officialPhonesLabel: "Téléphones Officiels",
    emailLabel: "Courrier Électronique",
    supabaseInfra: "Infrastructure Supabase",
    postgresConnection: "Connexion PostgreSQL & Storage",
    linkStatus: "Statut de la Liaison",
    connectedOperative: "Connecté et Opérationnel",
    connError: "Erreur de connexion",
    disconnected: "Déconnecté",
    securityRls: "Sécurité & RLS",
    rlsActive: "Règles Row Level Security (RLS) Actives",
    rlsDesc: "Les clients ne peuvent consulter que leurs sessions actives et leurs photos sélectionnées.",
    clientPortalParams: "Paramètres du Portail Client (Espace Privé)",
    defaultPortalRules: "Règles par défaut pour la confection des livres d'art et galeries",
    bookQuota: "Quota de Base du Livre",
    bookQuotaValue: "20 Photographies",
    bookQuotaDesc: "Limite standard de confection pour la reliure artisanale en lin.",
    accessSecurity: "Sécurité d'Accès",
    pinSecurityValue: "Code PIN Numérique (4 Chiffres)",
    pinSecurityDesc: "Authentification rapide sans mot de passe complexe pour les clients.",
    localPortalServer: "Serveur Local du Portail",
    portalServerDesc: "Page d'accueil publique et interface de sélection des photos.",

    // Dual Storage & Deliveries
    dualStorageEnvTitle: "Environnement Dual de Stockage & Livraisons",
    dualStorageEnvSubtitle: "Basculez librement entre le Mode Cloud (déplacements/portable) et le Mode Studio (NAS local physique).",
    activeModeLabel: "Mode Actif :",
    activeModeNas: "🏢 Studio (NAS)",
    activeModeCloud: "☁️ Cloud (Drive Direct)",
    modeCloudTitle: "☁️ Mode Cloud / Distant",
    modeCloudDesc: "Téléversement direct vers Google Drive depuis le navigateur. Idéal pour les voyages, travail sur PC portable ou sans NAS disponible.",
    modeNasTitle: "🏢 Mode Studio / NAS",
    modeNasDesc: "Priorise le NAS local sur le routeur (192.168.11.1) et synchronise depuis le dossier 04_Entregas_Finales.",
    modeAutoTitle: "⚡ Détection Automatique",
    modeAutoDesc: "Détecte si le NAS est en ligne. Si vous êtes au studio, utilise le NAS ; en déplacement, bascule automatiquement sur le Cloud.",
    nasServerStatus: "État du Serveur NAS",
    nasOnlineLabel: "En Ligne (192.168.11.1)",
    nasOfflineLabel: "Déconnecté / Mode Distant",
    nasFtpAvailable: "Accès FTP disponible sur le réseau local",
    nasNoConnection: "Aucune connexion au routeur du studio",
    changeAccount: "Changer de compte",
    disconnect: "Déconnecter",
    connectedOAuth: "Connecté (OAuth 2.0)",
    unlinked: "Non associé",
    connectGoogleDrive: "🔗 Associer Google Drive",
    unlimitedQuotaNote: "Quota illimité de votre compte personnel actif.",
    deliveryRetention: "Rétention des Livraisons",
    daysInCloud: "jours dans le cloud",
    retentionNotice: "Passé ce délai, le dossier sera déplacé vers la corbeille Drive.",
    manualRecycleBtn: "🗑️ Exécuter le Recyclage Manuel des Dossiers Expirés",
    cleaningInProgress: "Nettoyage en cours...",
    saveStoragePreferences: "Enregistrer les Préférences de Stockage",
    saving: "Enregistrement...",

    // Dashboard Overview
    atelierTag: "Atelier de Haute Photographie",
    overviewTitle: "Vue d'Ensemble",
    overviewDesc: "Panneau de curation des livres d'auteur, contrôle des livraisons clients et sauvegarde Synology NAS RAID 6.",
    viewPhotoSessionsBtn: "Voir Sessions Photo",
    totalSessionsKpi: "Total Sessions",
    inActiveProduction: "en production active",
    photoCollectionsKpi: "Collections Photos",
    manageGallery: "Gérer la galerie",
    videoProductionKpi: "Production Vidéo",
    projectsAndReels: "Projets & Reels",
    clientSelectionsKpi: "Sélections Clients",
    selectionReadyDesc: "Photos choisies prêtes pour l'album",
    waitingSelectionsDesc: "En attente des choix du client",
    recentSessionsTitle: "Sessions Récents & Statut Portail",
    recentSessionsSubtitle: "Clients actifs, codes PIN configurés et photos choisies dans l'Espace Privé",
    viewAllSessionsLink: "Voir toutes les sessions",
    workflowStatus: "Statut du Workflow",
    noSessionsFound: "Aucune session trouvée dans la base de données Supabase.",
    categoryDistributionTitle: "Répartition par Catégorie",
    categoryDistributionSubtitle: "Projets par type de session éditoriale",
    workflowFunnelTitle: "Entonnoir de Workflow",
    workflowFunnelSubtitle: "Statut actuel des livraisons et confection",
    noSessionsData: "Aucune session enregistrée pour le moment.",
    noWorkflowData: "Aucune donnée de workflow.",

    // Google Drive Upload
    syncAlbumToDrive: "Synchroniser l'Album vers Google Drive",
    transferPhotosFrom: "Transférer les photos depuis",
    syncInProgress: "Synchronisation en cours...",
    syncToDriveBtn: "⚡ Synchroniser vers Google Drive",
    uploadCompletedTitle: "Téléversement Terminé",
    uploadErrorTitle: "Erreur de téléversement",
    uploadingToDrive: "Téléversement vers Google Drive",
    filesCountStr: "fichiers",

    // Master / Dual NAS Upload & Sync Modal
    uploadMasterDualNas: "Téléverser / Synchroniser Master (Dual NAS)",
    masterDeliveryManagerTitle: "Gestionnaire de Livraison Master & Réplique Duale",
    ingestStyleBadge: "Mode Ingestion",
    masterDeliveryManagerSubtitle: "Sauvegardez vos photos et vidéos sur le SSD local et répliquez automatiquement sur le NAS du studio.",
    verifyingNas: "Vérification du NAS...",
    nasOnline: "NAS En Ligne",
    nasOfflineLocalOnly: "NAS Déconnecté (Local Uniquement)",
    recheckNasTooltip: "Revérifier le NAS",
    tabUploadNewFiles: "1. Téléverser de nouveaux fichiers",
    tabSyncLocalToNas: "2. Synchroniser le dossier avec le NAS",
    folderMasterDesc: "Photos et vidéos traitées après le montage.",
    folderDeliveryDesc: "Exportation finale prête pour la livraison au client.",
    dualCopyLabel: "Copie duale : Enregistrer sur le SSD local et envoyer une copie au NAS (192.168.11.1)",
    replicaNasActivated: "Réplication NAS Activée",
    localOnly: "Local Uniquement",
    selectEditedMediaTitle: "Sélectionnez les photos ou vidéos éditées",
    supportedFormatsDesc: "Formats RAW (NEF, CR2, ARW), JPEG, PNG et MP4/MOV haute résolution.",
    selectFilesBtn: "Sélectionner des fichiers",
    selectFolderBtn: "Sélectionner un dossier complet",
    selectedFilesCount: "fichiers sélectionnés",
    clearList: "Effacer la liste",
    startDualUploadBtn: "Démarrer le téléversement dual",
    syncLocalEditedTitle: "Synchroniser les fichiers locaux déjà édités avec le NAS",
    syncLocalEditedDesc: "Si vous avez édité des photos sur votre ordinateur (Lightroom ou Photoshop) ou travaillé hors ligne, cette fonction lit le dossier physique local et envoie au NAS les fichiers manquants.",
    localSourceLabel: "Source Locale :",
    nasDestLabel: "Destination NAS :",
    scanAndReplicateBtn: "Scanner et répliquer vers le NAS",
    nasNotAccessible: "Le NAS n'est pas accessible sur le réseau local",
    liveConsoleLogs: "Console de journal en direct",
    transferSuccessTitle: "Transfert terminé avec succès !",
    transferSuccessDesc: "fichiers synchronisés avec succès entre le SSD local et le stockage réseau NAS.",
    acceptAndClose: "Accepter et Fermer",

    clientDirectoryTag: "Répertoire de Haute Couture",
    videoProductionTag: "Production Cinématographique",
    photoCollectionsTag: "Collections de Photographie",
    atelierUnifiedTag: "Vue d'Ensemble de l'Atelier",
    totalSuffix: "totaux",

    allWord: "Tous",
    allWordFeminine: "Toutes",
    withFinalVideo: "Avec Vidéo Finale",
    pendingVideo: "En attente",
    withGeneratedPin: "Avec PIN Généré",
    withSelection: "Avec Sélection",
    withSelectionMade: "Avec Sélection Effectuée",
    awaitingSelection: "En Attente de Sélection",
    noPin: "Sans PIN",
    noDrive: "Sans Drive",
    noVideoProductionsFound: "Aucune production vidéo trouvée avec les filtres appliqués.",
    noPhotoSessionsFound: "Aucune session photo trouvée avec les filtres appliqués.",
    photosAndVideosCataloged: "Photos et Vidéos cataloguées",
    editorialAndWeddings: "Portraits éditoriaux et mariages",
    teasersClipsMaster: "Teasers, clips et master",
    readyForAlbum: "Prêtes pour la création de l'album",

    auditGovernanceTag: "Gouvernance Multi-Utilisateurs ERP",
    auditTitle: "Audit & Traçabilité Stricte",
    auditSubtitle: "Journal chronologique immuable d'activité : qui a créé les projets, téléversé ou supprimé les photos, et modifié le planner.",
    refreshBtn: "Actualiser",
    exportCsvBtn: "Exporter CSV",
    eventsToday: "Événements Aujourd'hui",
    eventsTodayDesc: "Journaux d'activité enregistrés aujourd'hui",
    photoUploads: "Téléversements Photos",
    photoUploadsDesc: "Lots multimédias téléversés",
    projectChanges: "Modifications Projets",
    projectChangesDesc: "Statuts ou dates modifiés",
    activeUsers: "Utilisateurs Actifs",
    activeUsersDesc: "Collaborateurs connectés aujourd'hui",
    auditSearchPlaceholder: "Rechercher par projet, fichier, client ou collaborateur...",
    allModules: "Tous les Modules",
    moduleSessions: "Projets / Sessions",
    moduleMedia: "Photos & Vidéos",
    modulePlanner: "Planner / Kanban",
    moduleClients: "Clients",
    moduleDeliveries: "Livraisons",
    allActions: "Toutes les Actions",
    actionSessionCreated: "Création de Projets",
    actionMediaUploaded: "Téléversement de Photos",
    actionMediaDeleted: "Suppression de Photos",
    actionPlannerChanged: "Avancement Planner",
    actionStatusChanged: "Changement de Statut",
    actionClientCreated: "Création de Clients",
    filterBtn: "Filtrer",
    recordsFound: "Enregistrements Trouvés",
    currentPageLast100: "Page actuelle : 100 derniers enregistrements",
    queryingAuditLogs: "Consultation des journaux d'audit dans la base de données...",
    noAuditLogsFound: "Aucun journal d'audit trouvé avec les filtres appliqués.",
    colDateTime: "Date & Heure",
    colUser: "Utilisateur Responsable",
    colAction: "Action Effectuée",
    colModule: "Module",
    colAffectedItem: "Élément Concerné",
    colDetails: "Détails",
    inspectDetails: "Inspecter les détails",
    auditModalTitle: "Détail de l'Événement d'Audit",
    userLabel: "Utilisateur",
    dateAndAction: "Date et Action",
    affectedElementLabel: "Élément Concerné",
    payloadDiffLabel: "Données Modifiées (JSON Diff / Payload)",
    closeDetailBtn: "Fermer le Détail",
    badgeUpload: "Téléversement Photos",
    badgeDeleted: "Suppression",
    badgePlanner: "Planner Kanban",
    badgeStatus: "Changement Statut",
    badgeShared: "Partage Sélection",
    badgeCreated: "Création",
    badgeModified: "Modification",

    calculatingEta: "calcul en cours...",
    remainingWord: "restant",
    syncingWithCloud: "Enregistrement des fichiers dans Supabase Cloud...",
    copyCompletedDesc: "Copie terminée ! Les aperçus sont générés en arrière-plan.",
    connectingDriveAndPrep: "Connexion à Google Drive et préparation des fichiers...",
    startingDriveGateway: "🚀 Démarrage de la passerelle Google Drive en arrière-plan...",
    uploadingFileProgress: "Téléversement de",
    driveTransferSuccess: "Livraison transférée sur Google Drive avec succès !",
    photosUploadedCount: "photos téléversées.",
    finalDeliveryPublished: "Livraison Finale Publiée pour le Client",
    deliveryActiveBadge: "ACTIVE",
    driveHighResAlbum: "Album Haute Résolution sur Google Drive",
    copied: "Copié",
    copyLink: "Copier le Lien",
    openInDrive: "Ouvrir dans Drive",
    deliveryModeLabel: "Mode de Livraison",
    syncedFromNas: "Synchronisé depuis le NAS",
    directCloudWeb: "Cloud Direct (Web)",
    filesAndWeight: "Fichiers / Poids",
    deliveryDateLabel: "Date de Livraison",
    cloudExpirationLabel: "Expiration dans le Cloud",
    noDriveDeliveryYet: "Cette session n'a pas encore de livraison finale sur Google Drive active pour le client.",
    todayWord: "Aujourd'hui",
    noDateWord: "Sans date",
    previewEngineTitle: "Moteur d'Aperçus",
    previewsGenerated: "Aperçus générés",
    processingFilesCount: "Traitement de",
    driveSyncSuccessMsg: "Succès ! Transfert terminé vers Google Drive.",
  },
  en: {
    dashboard: "Dashboard",
    calendar: "Calendar",
    calendarTitle: "Session & Shoot Calendar",
    calendarSubtitle: "Schedule, appointments, production shoots and client session notes.",
    planner: "Tickets Planner",
    plannerTitle: "Project & Ticket Planner",
    plannerSubtitle: "Board-style workflow management, production notes and delivery pipeline stages.",
    sessionNotes: "Session Notes",
    saveNotes: "Save Notes",
    unifiedView: "Unified View",
    photoSessions: "Author Photos",
    videoProduction: "Video Production",
    clientDirectory: "Client Directory",
    categoriesMenu: "Categories",
    categoriesTitle: "Categories & Web Portfolio",
    categoriesSubtitle: "Taxonomy management, thematic subcategories and client showcase photos.",
    newCategoryBtn: "New Category",
    newSubcategoryBtn: "New Subcategory",
    subcategories: "Subcategories",
    addSubcategory: "Add Subcategory",
    editCategory: "Edit Category",
    deleteCategory: "Delete Category",
    editSubcategory: "Edit Subcategory",
    deleteSubcategory: "Delete Subcategory",
    categoryPhotos: "Gallery / Portfolio Photos",
    uploadPhoto: "Upload Photo",
    setAsCover: "Set as Cover",
    featuredOnWeb: "Featured on Web",
    noSubcategoriesText: "No subcategories (direct category)",
    noCategoriesFound: "No categories found.",
    categoryNameLabel: "Category Name",
    subcategoryNameLabel: "Subcategory Name",
    slugLabel: "Slug (URL Identifier)",
    descriptionLabel: "Description",
    saveChanges: "Save Changes",
    confirmDeleteCategory: "Are you sure you want to delete this category and all its associated subcategories?",
    confirmDeleteSubcategory: "Are you sure you want to delete this subcategory?",
    categoriesCatalogLoading: "Loading categories catalog...",
    categoriesEmptyHelp: "Start by creating your first main category to organize editorial sessions and client showcase photos.",
    noDescription: "No description",
    inactiveBadge: "Inactive",
    activeBadge: "Active",
    photosWord: "photos",
    subcategoriesOf: "Subcategories of",
    managePhotosTooltip: "Manage photos for this category",
    editCategoryTooltip: "Edit category",
    deleteCategoryTooltip: "Delete category",
    editSubcategoryTooltip: "Edit subcategory",
    deleteSubcategoryTooltip: "Delete subcategory",
    nameTranslationsHelp: "Name Translations (Optional for Web)",
    subNameTranslationsHelp: "Subcategory Translations (Optional)",
    displayOrderLabel: "Display Order",
    categoryActiveLabel: "Active (Visible in session forms and web catalog)",
    parentCategoryLabel: "Parent Category",
    cancelBtn: "Cancel",
    closeBtn: "Close",
    uploadPhotosTitle: "Click or drag photos here",
    uploadingPhotos: "Uploading images to Supabase...",
    uploadFormatsHint: "Formats: JPG, PNG, WebP • Stored in Supabase public bucket",
    featuredPhotosHint: "Starred photos are highlighted on the public website",
    noPhotosYet: "No photos in this section yet. Upload the first photograph above.",
    coverBadge: "Cover",
    featuredBadge: "★ Featured",
    makeCoverBtn: "Set as Cover",
    unfeatureBtn: "Unfeature",
    featureBtn: "★ Feature",
    viewFullScreen: "View full size",
    deletePhotoTooltip: "Delete photo",
    uploadModalDesc: "Upload photos to display in your client-facing website catalog and portfolio.",
    nasStorage: "NAS Storage",
    auditTrail: "Audit Trail & Activity",
    settings: "Settings",
    studioManagement: "Studio Management",
    infrastructure: "Infrastructure",
    openClientPortal: "Espace Privé",
    languageLabel: "Language",
    themeLabel: "Visual Style",
    darkTheme: "Dark",
    lightTheme: "Light",
    logout: "Log Out",
    login: "Log In",
    adminRole: "Administrator",
    newSession: "New Session",
    addSessionBtn: "Add Session",
    editSessionBtn: "Edit Session",
    editProject: "Edit Project",
    ingestSd: "Ingest SD / NAS",
    ingestShortBtn: "Ingest",
    searchPlaceholder: "Search...",
    allCategories: "All Categories",
    allSubcategories: "All Subcategories",
    allStatuses: "All Statuses",
    clearFilters: "Clear Filters",
    showing: "Showing",
    to: "to",
    of: "of",
    itemsPerPage: "per page",
    previous: "Previous",
    next: "Next",
    actions: "Actions",
    manage: "Manage",
    viewFile: "View Details",
    status: "Status",
    category: "Category",
    date: "Date",
    client: "Client",
    pin: "Portal PIN",
    drive: "Drive RAW",
    total: "Total",
    pending: "Pending",
    delivered: "Delivered",
    inEditing: "In Editing",
    shooting: "Shooting",

    createSessionTitle: "Create New Session",
    editSessionTitle: "Edit Session",
    sessionDialogDesc: "Fill in the details below. Click save when you're done.",
    clientNameLabel: "Client Name",
    phoneLabel: "Phone",
    clientEmailLabel: "Client Email",
    dateLabel: "Session Date",
    typeLabel: "Session Type",
    categoryLabel: "Main Category",
    subCategoryLabel: "Subcategory",
    selectSubCategory: "Select subcategory",
    statusLabel: "Production Status",
    commentsLabel: "Comments / Notes",
    commentsPlaceholder: "Any special requests or details...",
    tagsLabel: "Tags (comma separated)",
    tagsPlaceholder: "usb, reel, album...",
    portalPinLabel: "Client Portal PIN",
    portalPinPlaceholder: "e.g. 8942",
    createSessionSubmitBtn: "Create Session",
    saveChangesBtn: "Save Changes",

    espacePriveAccess: "ESPACE PRIVÉ ACCESS",
    newPin: "New PIN",
    clientPinCode: "CLIENT PIN CODE",
    copyPin: "Copy PIN",
    photosChosenByClient: "Photos Chosen by Client",
    copyWhatsappInvite: "Copy WhatsApp Invite",
    testPortalWithPin: "Test Portal with PIN",
    requestedQuota: "Photos selection quota",
    quotaHelp: "Photo limit for this client",
    saveQuota: "Save quota",
    clientEmailIdentifier: "Identifier (Client Email):",
    noEmailWarning: "No email (required for login)",
    customQuotaLabel: "Custom:",
    quotaStrictLimit: "the client will only be able to select up to this number of photos.",
    savedIndicator: "Saved!",
    collapsePanels: "Collapse",
    expandPanels: "Expand Code & Storage",
    copyPinTooltip: "Click to copy PIN code",
    clientSelectionLabel: "Client selection:",
    notesLabel: "Notes:",
    activeLog: "Active Log",
    zeroNotes: "0 notes",
    pinTabLabel: "PIN Code",
    storageTabLabel: "Studio Storage",
    deliveryLink: "Delivery",
    storageHeader: "NAS STORAGE",
    ingestFromSdCard: "Ingest from SD Card",
    createFoldersBtn: "Create Folders",
    statusDeliveredToClient: "Delivered to Client",

    clientsTitle: "Client Directory",
    clientsSubtitle: "Registry of brides, families and editorial portraits with session history and PINs.",
    totalClients: "Total Clients",
    sessionsCount: "Sessions",
    sessionSingle: "Session",
    sessionsPlural: "Sessions",
    linkedSessions: "Linked Sessions",
    lastActivity: "Last activity",
    contactNone: "No contact recorded",
    viewCard: "View File",
    allSpecialties: "All Specialties",
    photoOnly: "Photos Only",
    videoOnly: "Videos Only",

    photosTitle: "Author Photo Sessions",
    photosSubtitle: "Client management, PIN credentials, Drive RAW folders, and delivery status.",
    totalSessions: "Total Sessions",
    inProcessEditing: "In Process / Editing",
    deliveredSuccess: "Successfully Delivered",
    selectedPhotos: "photos selected in Espace Privé",
    portalPin: "Portal PIN",
    driveRaw: "Drive RAW",

    videosTitle: "Video Sessions & Teasers",
    videosSubtitle: "Editing progress, Instagram reels, color grading and 4K final delivery links.",
    totalProjects: "Total Projects",
    inEditingRoom: "In Editing Suite",
    videosDelivered: "Videos Delivered",
    videoType: "Video Type",
    finalDelivery: "Final Delivery",
    viewVideo: "View Video",

    projectsTitle: "Global Projects & Sessions",
    projectsSubtitle: "Unified photo and video management: SD network ingest, curation, and portal status.",
    allProjects: "All Projects",
    photoSessionsTab: "Photos",
    videoProductionsTab: "Videos",
    selectionReady: "Client Selection Ready",
    clientSelection: "Client Selection",

    sortRecent: "Most recent first",
    sortOldest: "Oldest first",
    sortNameAsc: "Name (A - Z)",
    sortNameDesc: "Name (Z - A)",
    sortSessionsDesc: "Highest number of sessions",
    wedding: "Wedding",
    newborn: "Newborn",
    portrait: "Editorial Portrait",
    maternity: "Maternity",
    birthday: "Chadda / Birthday",
    event: "Event / Gala",
    product: "Product",
    graduation: "Graduation",

    // Ingest Dialog
    ingestTitle: "SD Ingestion & Storage Assistant",
    ingestSubtitle: "Camera memory dump, network RAW organization, and automatic WebP previews.",
    createNewProjectTab: "Create New Project",
    assignExistingSessionTab: "Assign to Existing Session",
    projectNameLabel: "Project Name *",
    projectNamePlaceholder: "e.g. Royal Wedding Zainab & Karim",
    assignClientLabel: "Assign Client *",
    assignClientPlaceholder: "Client or couple name",
    sdOriginLabel: "Source: SD Card / Camera Folder",
    rescanBtn: "Rescan",
    verifyingBtn: "Checking...",
    verifyBtn: "Verify",
    unitReady: "Drive ready",
    photosCount: "photos",
    videosCount: "videos",
    automatedDestination: "Automated Destination (NAS / Local Network)",
    structureTag: "Structure 01-04",
    startIngestBtn: "Start Ingest & WebP Generation",
    processingSdCard: "Processing camera memory card...",
    realtimeConsole: "Real-time Event Console",
    eventsCount: "events",
    ingestFinishedTitle: "Ingest & Curation Suite Completed!",
    ingestFinishedSubtitle: "Files have been distributed on the network and WebP previews are ready.",
    rawPhotos: "RAW Photos",
    rawVideos: "RAW Videos",
    transferred: "Transferred",
    projectDirectory: "Project Directory",
    exploreFolder: "Explore",
    downloadLogsBtn: "Download Log File (.txt)",
    goToGalleryBtn: "Go to Session Gallery",

    // Ingest Dialog: Client & Session Selection
    searchSessionPlaceholder: "Search session by client, category, or date...",
    orEnterUuidManually: "Or enter a UUID manually:",
    changeSessionBtn: "Change",
    assignedBadge: "Assigned",
    existingClientTab: "Existing",
    newClientTab: "New",
    searchClientPlaceholder: "Search by name, phone, email...",
    clientSuggestions: "Client Suggestions",
    noClientFound: "No client found for",
    createAsNewClientBtn: "+ Create as new client",
    closeSuggestions: "Close",
    existingClientAlert: "Existing client:",
    assignBtn: "Assign",
    assignToThisSession: "Assign to this session",
    browseSourceBtn: "Browse Files...",
    browseTargetBtn: "Browse Folders...",
    explorerTitleSource: "SD Card / Source Folder Explorer",
    explorerTitleTarget: "SSD Drive / Destination Folder Explorer",
    selectThisFolder: "Select this folder",
    createNewFolder: "New folder",
    upOneLevel: "Up one level",
    selectAllFiles: "Select all",
    deselectAll: "Deselect all",
    filesSelectedCount: "files selected",
    selectedFilesBadge: "files chosen",

    // Ingest Dialog: SSD Destination & Drive Selector
    targetSsdTitle: "Working Destination (External Production SSD)",
    targetSsdDesc: "Select the physical drive where original digital negatives will be organized. Ingestion writes to the SSD and later syncs to the Network (NAS).",
    detectedDrivesLabel: "Detected connected drives:",
    detectingBtn: "Detecting...",
    refreshDrivesBtn: "Refresh",
    ssdExternalBadge: "SSD / External",
    systemDriveBadge: "System C:",
    sameDriveAsOrigin: "Same drive as Source",
    targetBasePathLabel: "Base path on SSD / Root folder:",
    resetBtn: "Reset",
    proStructureOnSsd: "Professional structure on SSD:",
    nasSyncLater: "Subsequent NAS synchronization:",
    samePathErrorTitle: "Security Error: Source and Destination are identical",
    samePathErrorDesc: "The source folder and destination folder cannot be the same to avoid accidental overwrites.",
    sameDriveWarningTitle: "Warning! Source and Destination share the same drive",
    sameDriveWarningDesc: "Make sure you selected your external SSD drive as destination and NOT the camera SD card.",
    insufficientSpaceTitle: "Insufficient Space on Destination SSD",
    capacityWarningTitle: "Capacity Notice",
    startIngestOnSsd: "Start Ingestion to SSD",
    writingToSsd: "Working destination:",
    freeGBLabel: "free",
    ofTotalLabel: "of",
    sourcePathNotExist: "The source path does not exist or the SD card was removed.",
    proStructureDescRaw: "01_RAW/Photos & Videos (Original camera copy)",
    proStructureDescEdits: "02_Client_Selection & 03_Master_Edition",
    proStructureDescFinal: "04_Final_Deliveries",
    automatedTag: "01-04 Automated",
    checkingSourceAndFolders: "Checking source and preparing folders...",
    startingIngestFrom: "Starting ingestion from:",
    fillProjectAndClient: "Please enter the project name and client.",
    ingestStepBadge: "Ingest",
    selectClientHelper: "Select an existing client to automatically prefill details.",
    loadingText: "Loading...",

    // Media Manager
    photosTab: "Photos",
    videosTab: "Videos",
    editionMasterTab: "Montage",
    sharedWithClientTab: "Shared",
    clientSelectionTab: "Client Selection",
    driveTab: "Drive",
    syncMasterBtn: "Sync 03_Édition_Master",
    uploadMasterBtn: "Upload to Master Edition",
    searchMediaPlaceholder: "Search by filename or notes...",
    shareBatchBtn: "Share Entire Batch",
    hideBatchBtn: "Hide All",
    noMediaInTab: "No files found in this tab",
    useIngestInstruction: "Use the top 'Ingest from SD Card' button to empty memory card and auto-sync.",
    inBookBadge: "In Book",
    unnamedFile: "Unnamed file",
    clientNoteLabel: "Client Note:",
    sharedStatus: "Shared",
    hiddenStatus: "Hidden",
    openWithApp: "Open in editing application",
    revealInFolder: "Reveal in system folder",
    openInLocalFolder: "Open in Local Folder (SSD)",
    openInNasFolder: "Open on NAS Server (Network / FTP)",
    rotatePhoto: "Rotate Photo",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetView: "Reset View",
    deleteFromSession: "Remove from session",
    withNoteBadge: "With Note",
    clientRetouchInstruction: "Client Retouch Instruction:",
    selectedPhotosForBook: "photos selected by the client for the album",
    photosWithRetouchNotes: "with retouch notes",
    commentedPhotosHint: "Commented photos carry the orange 'With Note' badge",
    masterTag: "Master",
    networkOriginal: "Network Original",
    filterAll: "All",
    filterPhotos: "Photos",
    filterVideos: "Videos",
    syncingText: "Syncing...",
    uploadingText: "Uploading...",
    noMasterFiles: "No files in 03_Édition_Master",
    masterInstructions: "Save retouched photos or mounted videos into physical '03_Edicion_Master' folder and click 'Sync', or use 'Upload'.",
    masterFolderDescription: "Retouched photos and edited videos saved in physical 03_Edicion_Master folder and synced to Supabase with WebP.",

    // NAS Storage Dashboard
    nasInfrastructure: "Production NAS Infrastructure",
    nasTitle: "Network Storage & Backup",
    nasSubtitle: "Centralized management of digital master files, final deliveries, and network project catalog.",
    routerZteOnline: "Router ZTE NAS (Online)",
    localMode: "Local Mode (C:\\Lamha-Storage)",
    usbNasCapacity: "USB NAS Capacity",
    used: "Used",
    free: "Free",
    foldersInStorage: "Folders in Storage",
    scannedFiles: "Files on Disk/NAS",
    supabaseIndex: "Supabase Index",
    storageRootPath: "Storage Root Path",
    activePathLabel: "Active Path:",
    copyPathBtn: "Copy Path",
    copiedBtn: "Copied",
    openInWindows: "Open in Windows",
    modifyRootPath: "Modify Root Path",
    closeConfig: "Close Settings",
    presetZte: "Router ZTE NAS (192.168.11.1 /usb1_1)",
    presetLocal: "Local Drive (C:\\Lamha-Storage)",
    presetBackup: "Backup Folder NAS",
    hostIpLabel: "NAS Host / IP",
    ftpUserLabel: "FTP Username",
    ftpPasswordLabel: "FTP Password",
    ftpBaseFolderLabel: "NAS Root Folder",
    localFallbackPathLabel: "Local Backup / Fallback Path",
    testingConn: "Testing...",
    testConnBtn: "Test Connection",
    savingConfig: "Saving...",
    saveActivePathBtn: "Save as Active Path",
    projectsInStorageTab: "Projects in Storage",
    supabaseIndexTab: "Supabase Index",
    searchNasPlaceholder: "Search project, client, or file...",
    linkedToSupabase: "Linked to Supabase",
    viewSessionBtn: "View Session",
    emptyDirectory: "Empty directory",

    // Settings Page
    studioSettingsTag: "Studio Configuration",
    generalSettingsTitle: "General Settings & Connectivity",
    generalSettingsSubtitle: "Brand parameters, Supabase database status, and Espace Privé portal configuration.",
    studioIdentity: "Lam7a Studios Identity",
    artisticDirection: "Artistic direction by Afaf Elaribi",
    atelierStudioLabel: "Atelier & Studio",
    officialPhonesLabel: "Official Telephones",
    emailLabel: "Email Address",
    supabaseInfra: "Supabase Infrastructure",
    postgresConnection: "PostgreSQL & Storage Connection",
    linkStatus: "Link Status",
    connectedOperative: "Connected and Operational",
    connError: "Connection error",
    disconnected: "Disconnected",
    securityRls: "Security & RLS",
    rlsActive: "Active Row Level Security (RLS) Policies",
    rlsDesc: "Clients can only view active sessions and edit their own selected photographs.",
    clientPortalParams: "Client Portal Parameters (Espace Privé)",
    defaultPortalRules: "Default rules for fine-art book curation and private client galleries",
    bookQuota: "Base Book Quota",
    bookQuotaValue: "20 Photographs",
    bookQuotaDesc: "Standard curation limit for handcrafted linen-bound albums.",
    accessSecurity: "Access Security",
    pinSecurityValue: "4-Digit Numeric PIN",
    pinSecurityDesc: "Fast pin authentication without hassle for clients.",
    localPortalServer: "Local Portal Server",
    portalServerDesc: "Public landing page and photo selection interface.",

    // Dual Storage & Deliveries
    dualStorageEnvTitle: "Dual Storage & Delivery Environment",
    dualStorageEnvSubtitle: "Seamlessly switch between Cloud Mode (travel/laptop) and Studio Mode (local physical NAS).",
    activeModeLabel: "Active Mode:",
    activeModeNas: "🏢 Studio (NAS)",
    activeModeCloud: "☁️ Cloud (Direct Drive)",
    modeCloudTitle: "☁️ Cloud / Remote Mode",
    modeCloudDesc: "Upload directly to Google Drive from browser. Ideal for traveling, working from laptop or without NAS available.",
    modeNasTitle: "🏢 Studio / NAS Mode",
    modeNasDesc: "Prioritizes local NAS on router (192.168.11.1) and syncs from folder 04_Entregas_Finales.",
    modeAutoTitle: "⚡ Auto-Detection",
    modeAutoDesc: "Detects if NAS is online. Uses NAS when in studio; automatically falls back to Cloud when traveling.",
    nasServerStatus: "NAS Server Status",
    nasOnlineLabel: "Online (192.168.11.1)",
    nasOfflineLabel: "Offline / Remote Mode",
    nasFtpAvailable: "FTP access available on local network",
    nasNoConnection: "No connection to studio router",
    changeAccount: "Switch account",
    disconnect: "Disconnect",
    connectedOAuth: "Connected (OAuth 2.0)",
    unlinked: "Unlinked",
    connectGoogleDrive: "🔗 Connect Google Drive",
    unlimitedQuotaNote: "Unlimited storage quota of your active personal account.",
    deliveryRetention: "Delivery Retention",
    daysInCloud: "days in the cloud",
    retentionNotice: "After this period it will be moved to Drive trash.",
    manualRecycleBtn: "🗑️ Run Manual Cleanup of Expired Folders",
    cleaningInProgress: "Processing cleanup...",
    saveStoragePreferences: "Save Storage Preferences",
    saving: "Saving...",

    // Dashboard Overview
    atelierTag: "Atelier de Haute Photographie",
    overviewTitle: "Global Overview",
    overviewDesc: "Author book curation panel, client direct delivery control, and Synology NAS RAID 6 dump.",
    viewPhotoSessionsBtn: "View Photo Sessions",
    totalSessionsKpi: "Total Sessions",
    inActiveProduction: "in active production",
    photoCollectionsKpi: "Photo Collections",
    manageGallery: "Manage gallery",
    videoProductionKpi: "Video Production",
    projectsAndReels: "Projects & Reels",
    clientSelectionsKpi: "Client Selections",
    selectionReadyDesc: "Chosen photos ready for album",
    waitingSelectionsDesc: "Awaiting portal selections",
    recentSessionsTitle: "Recent Sessions & Portal Status",
    recentSessionsSubtitle: "Active clients, PIN access configured, and photos selected in Espace Privé",
    viewAllSessionsLink: "View all sessions",
    workflowStatus: "Workflow Status",
    noSessionsFound: "No sessions found in Supabase database.",
    categoryDistributionTitle: "Category Breakdown",
    categoryDistributionSubtitle: "Projects by editorial session type",
    workflowFunnelTitle: "Workflow Funnel",
    workflowFunnelSubtitle: "Current status of deliveries and album creation",
    noSessionsData: "No sessions recorded yet.",
    noWorkflowData: "No workflow data available.",

    // Google Drive Upload
    syncAlbumToDrive: "Sync Album to Google Drive",
    transferPhotosFrom: "Transfer photos from",
    syncInProgress: "Sync in progress...",
    syncToDriveBtn: "⚡ Sync to Google Drive",
    uploadCompletedTitle: "Upload Completed",
    uploadErrorTitle: "Upload Error",
    uploadingToDrive: "Uploading to Google Drive",
    filesCountStr: "files",

    // Master / Dual NAS Upload & Sync Modal
    uploadMasterDualNas: "Upload / Sync Master (Dual NAS)",
    masterDeliveryManagerTitle: "Master Delivery & Dual Replica Manager",
    ingestStyleBadge: "Ingest Mode",
    masterDeliveryManagerSubtitle: "Save your photos and videos to local SSD and automatically replicate to the studio NAS.",
    verifyingNas: "Checking NAS...",
    nasOnline: "NAS Online",
    nasOfflineLocalOnly: "NAS Offline (Local Only)",
    recheckNasTooltip: "Recheck NAS",
    tabUploadNewFiles: "1. Upload New Files",
    tabSyncLocalToNas: "2. Sync Folder with NAS",
    folderMasterDesc: "Photos and videos processed after montage.",
    folderDeliveryDesc: "Final export ready for client delivery.",
    dualCopyLabel: "Dual copy: Save to local SSD and send copy to NAS (192.168.11.1)",
    replicaNasActivated: "NAS Replica Enabled",
    localOnly: "Local Only",
    selectEditedMediaTitle: "Select edited photos or videos",
    supportedFormatsDesc: "RAW formats (NEF, CR2, ARW), JPEG, PNG and high-resolution MP4/MOV.",
    selectFilesBtn: "Select Files",
    selectFolderBtn: "Select Entire Folder",
    selectedFilesCount: "selected files",
    clearList: "Clear list",
    startDualUploadBtn: "Start Dual Upload",
    syncLocalEditedTitle: "Sync locally edited files to NAS",
    syncLocalEditedDesc: "If you edited photos on your computer (in Lightroom or Photoshop) or worked offline, this function reads the local folder and sends any missing files to the NAS.",
    localSourceLabel: "Local Source:",
    nasDestLabel: "NAS Destination:",
    scanAndReplicateBtn: "Scan and Replicate to NAS",
    nasNotAccessible: "The NAS is not accessible on the local network",
    liveConsoleLogs: "Live Log Console",
    transferSuccessTitle: "Transfer completed successfully!",
    transferSuccessDesc: "files successfully synchronized between local SSD and NAS network storage.",
    acceptAndClose: "Accept and Close",

    clientDirectoryTag: "Haute Couture Directory",
    videoProductionTag: "Cinematic Production",
    photoCollectionsTag: "Photography Collections",
    atelierUnifiedTag: "Atelier Unified View",
    totalSuffix: "total",

    allWord: "All",
    allWordFeminine: "All",
    withFinalVideo: "With Final Video",
    pendingVideo: "Pending",
    withGeneratedPin: "With Generated PIN",
    withSelection: "With Selection",
    withSelectionMade: "With Selection Made",
    awaitingSelection: "Awaiting Selection",
    noPin: "No PIN",
    noDrive: "No Drive",
    noVideoProductionsFound: "No video productions found with the applied filters.",
    noPhotoSessionsFound: "No photo sessions found with the applied filters.",
    photosAndVideosCataloged: "Cataloged Photos & Videos",
    editorialAndWeddings: "Editorial portraits & weddings",
    teasersClipsMaster: "Teasers, clips & master",
    readyForAlbum: "Ready for album creation",

    auditGovernanceTag: "ERP Multi-User Governance",
    auditTitle: "Strict Audit & Traceability",
    auditSubtitle: "Immutable chronological log of activity: who created projects, uploaded or deleted photos, and updated the planner.",
    refreshBtn: "Refresh",
    exportCsvBtn: "Export CSV",
    eventsToday: "Events Today",
    eventsTodayDesc: "Activity logs recorded today",
    photoUploads: "Photo Uploads",
    photoUploadsDesc: "Media batches uploaded",
    projectChanges: "Project Changes",
    projectChangesDesc: "Statuses or dates changed",
    activeUsers: "Active Users",
    activeUsersDesc: "Team members connected today",
    auditSearchPlaceholder: "Search by project, file, client, or user...",
    allModules: "All Modules",
    moduleSessions: "Projects / Sessions",
    moduleMedia: "Photos & Videos",
    modulePlanner: "Planner / Kanban",
    moduleClients: "Clients",
    moduleDeliveries: "Deliveries",
    allActions: "All Actions",
    actionSessionCreated: "Project Creation",
    actionMediaUploaded: "Photo Upload",
    actionMediaDeleted: "Photo Deletion",
    actionPlannerChanged: "Planner Stage Change",
    actionStatusChanged: "Status Change",
    actionClientCreated: "Client Registration",
    filterBtn: "Filter",
    recordsFound: "Records Found",
    currentPageLast100: "Current page: last 100 records",
    queryingAuditLogs: "Querying audit logs from database...",
    noAuditLogsFound: "No audit records found with the applied filters.",
    colDateTime: "Date & Time",
    colUser: "Responsible User",
    colAction: "Action Performed",
    colModule: "Module",
    colAffectedItem: "Affected Item",
    colDetails: "Details",
    inspectDetails: "Inspect details",
    auditModalTitle: "Audit Event Details",
    userLabel: "User",
    dateAndAction: "Date & Action",
    affectedElementLabel: "Affected Element",
    payloadDiffLabel: "Modified Data Payload (JSON Diff / Payload)",
    closeDetailBtn: "Close Details",
    badgeUpload: "Photo Upload",
    badgeDeleted: "Deletion",
    badgePlanner: "Planner Kanban",
    badgeStatus: "Status Change",
    badgeShared: "Selection Share",
    badgeCreated: "Creation",
    badgeModified: "Modification",

    calculatingEta: "calculating...",
    remainingWord: "remaining",
    syncingWithCloud: "Registering files in Supabase Cloud...",
    copyCompletedDesc: "Copy completed! Previews are generated in background.",
    connectingDriveAndPrep: "Connecting to Google Drive and preparing files...",
    startingDriveGateway: "🚀 Starting Google Drive gateway in background...",
    uploadingFileProgress: "Uploading",
    driveTransferSuccess: "Delivery successfully transferred to Google Drive!",
    photosUploadedCount: "photos uploaded.",
    finalDeliveryPublished: "Final Delivery Published to Client",
    deliveryActiveBadge: "ACTIVE",
    driveHighResAlbum: "High-Resolution Album on Google Drive",
    copied: "Copied",
    copyLink: "Copy Link",
    openInDrive: "Open in Drive",
    deliveryModeLabel: "Delivery Mode",
    syncedFromNas: "Synced from NAS",
    directCloudWeb: "Direct Cloud (Web)",
    filesAndWeight: "Files / Weight",
    deliveryDateLabel: "Delivery Date",
    cloudExpirationLabel: "Cloud Expiration",
    noDriveDeliveryYet: "This session does not yet have an active Google Drive final delivery for the client.",
    todayWord: "Today",
    noDateWord: "No date",
    previewEngineTitle: "Preview Engine",
    previewsGenerated: "Previews generated",
    processingFilesCount: "Processing",
    driveSyncSuccessMsg: "Success! Transfer to Google Drive completed.",
  },
  ar: {
    dashboard: "لوحة التحكم",
    calendar: "التقويم",
    calendarTitle: "تقويم الجلسات والتصوير",
    calendarSubtitle: "تنظيم المواعيد، جلسات التصوير والملاحظات الخاصة بكل عميل.",
    planner: "لوحة التذاكر Planner",
    plannerTitle: "مخطط المشاريع والتذاكر",
    plannerSubtitle: "إدارة مراحل الإنتاج وسير العمل وملاحظات التسليم لكل مشروع.",
    sessionNotes: "ملاحظات الجلسة",
    saveNotes: "حفظ الملاحظات",
    unifiedView: "العرض الموحد",
    photoSessions: "تصوير فوتوغرافي",
    videoProduction: "إنتاج الفيديو",
    clientDirectory: "دليل العملاء",
    categoriesMenu: "التصنيفات",
    categoriesTitle: "التصنيفات ومعرض الويب",
    categoriesSubtitle: "إدارة هيكل التصنيفات والتصنيفات الفرعية وصور المعرض للعملاء.",
    newCategoryBtn: "تصنيف جديد",
    newSubcategoryBtn: "تصنيف فرعي جديد",
    subcategories: "التصنيفات الفرعية",
    addSubcategory: "إضافة تصنيف فرعي",
    editCategory: "تعديل التصنيف",
    deleteCategory: "حذف التصنيف",
    editSubcategory: "تعديل التصنيف الفرعي",
    deleteSubcategory: "حذف التصنيف الفرعي",
    categoryPhotos: "صور المعرض / البورتفوليو",
    uploadPhoto: "رفع صورة",
    setAsCover: "تعيين كغلاف",
    featuredOnWeb: "مميز على الموقع",
    noSubcategoriesText: "بدون تصنيفات فرعية (تصنيف مباشر)",
    noCategoriesFound: "لم يتم العثور على أي تصنيفات.",
    categoryNameLabel: "اسم التصنيف",
    subcategoryNameLabel: "اسم التصنيف الفرعي",
    slugLabel: "المعرف (Slug)",
    descriptionLabel: "الوصف",
    saveChanges: "حفظ التغييرات",
    confirmDeleteCategory: "هل أنت متأكد من حذف هذا التصنيف وجميع تصنيفاته الفرعية المرتبطة؟",
    confirmDeleteSubcategory: "هل أنت متأكد من حذف هذا التصنيف الفرعي؟",
    categoriesCatalogLoading: "جاري تحميل دليل الفئات...",
    categoriesEmptyHelp: "ابدأ بإنشاء أول فئة رئيسية لتنظيم جلسات التصوير وصور معرض العملاء.",
    noDescription: "بدون وصف",
    inactiveBadge: "غير نشط",
    activeBadge: "نشط",
    photosWord: "صور",
    subcategoriesOf: "الفئات الفرعية لـ",
    managePhotosTooltip: "إدارة صور هذا القسم",
    editCategoryTooltip: "تعديل الفئة",
    deleteCategoryTooltip: "حذف الفئة",
    editSubcategoryTooltip: "تعديل الفئة الفرعية",
    deleteSubcategoryTooltip: "حذف الفئة الفرعية",
    nameTranslationsHelp: "ترجمات الاسم (اختياري للموقع الإلكتروني)",
    subNameTranslationsHelp: "ترجمات الفئة الفرعية (اختياري)",
    displayOrderLabel: "ترتيب العرض",
    categoryActiveLabel: "نشط (مرئي في نماذج الجلسات ومعرض الموقع)",
    parentCategoryLabel: "الفئة الرئيسية",
    cancelBtn: "إلغاء",
    closeBtn: "إغلاق",
    uploadPhotosTitle: "انقر أو اسحب الصور هنا",
    uploadingPhotos: "جاري رفع الصور إلى Supabase...",
    uploadFormatsHint: "الصيغ المدعومة: JPG, PNG, WebP • تُحفظ في سحابة Supabase العامة",
    featuredPhotosHint: "الصور المميزة بنجمة تُعرض بشكل بارز على موقع المعرض",
    noPhotosYet: "لا توجد صور في هذا القسم حتى الآن. قم برفع أول صورة بالأعلى.",
    coverBadge: "الغلاف",
    featuredBadge: "★ مميز",
    makeCoverBtn: "تعيين كغلاف",
    unfeatureBtn: "إلغاء التمييز",
    featureBtn: "★ تمييز",
    viewFullScreen: "عرض بالحجم الكامل",
    deletePhotoTooltip: "حذف الصورة",
    uploadModalDesc: "ارفع الصور لعرضها في كتالوج وبورتفوليو موقع العملاء.",
    nasStorage: "تخزين NAS الشبكي",
    auditTrail: "سجل التدقيق والتتبع",
    settings: "الإعدادات",
    studioManagement: "إدارة الاستوديو",
    infrastructure: "البنية التحتية",
    openClientPortal: "البوابة الخاصة",
    languageLabel: "اللغة",
    themeLabel: "المظهر البصري",
    darkTheme: "داكن",
    lightTheme: "فاتح",
    logout: "تسجيل الخروج",
    login: "تسجيل الدخول",
    adminRole: "مسؤول النظام",
    newSession: "جلسة جديدة",
    addSessionBtn: "إضافة جلسة",
    editSessionBtn: "تعديل الجلسة",
    editProject: "تعديل المشروع",
    ingestSd: "استيراد الذاكرة SD",
    ingestShortBtn: "استيراد",
    searchPlaceholder: "بحث...",
    allCategories: "جميع التصنيفات",
    allSubcategories: "جميع الفئات الفرعية",
    allStatuses: "جميع الحالات",
    clearFilters: "تصفير الفلاتر",
    showing: "عرض",
    to: "إلى",
    of: "من أصل",
    itemsPerPage: "لكل صفحة",
    previous: "السابق",
    next: "التالي",
    actions: "الإجراءات",
    manage: "إدارة",
    viewFile: "عرض الملف",
    status: "الحالة",
    category: "التصنيف",
    date: "التاريخ",
    client: "العميل",
    pin: "رمز PIN",
    drive: "مجلد RAW",
    total: "المجموع",
    pending: "قيد الانتظار",
    delivered: "تم التسليم",
    inEditing: "قيد التعديل",
    shooting: "جاري التصوير",

    createSessionTitle: "إنشاء جلسة جديدة",
    editSessionTitle: "تعديل الجلسة",
    sessionDialogDesc: "يرجى ملء التفاصيل أدناه، ثم انقر على حفظ عند الانتهاء.",
    clientNameLabel: "اسم العميل",
    phoneLabel: "الهاتف",
    clientEmailLabel: "البريد الإلكتروني للعميل",
    dateLabel: "تاريخ الجلسة",
    typeLabel: "نوع الجلسة",
    categoryLabel: "التصنيف الرئيسي",
    subCategoryLabel: "التصنيف الفرعي",
    selectSubCategory: "اختر التصنيف الفرعي",
    statusLabel: "حالة الإنتاج",
    commentsLabel: "ملاحظات / تعليقات",
    commentsPlaceholder: "أي طلبات خاصة أو تفاصيل...",
    tagsLabel: "وسوم (مفصولة بفواصل)",
    tagsPlaceholder: "usb, reel, album...",
    portalPinLabel: "رمز PIN لدخول البوابة",
    portalPinPlaceholder: "مثال 8942",
    createSessionSubmitBtn: "إنشاء الجلسة",
    saveChangesBtn: "حفظ التغييرات",

    espacePriveAccess: "الوصول للبوابة الخاصة",
    newPin: "رمز PIN جديد",
    clientPinCode: "رمز PIN الخاص بالعميل",
    copyPin: "نسخ الرمز",
    photosChosenByClient: "الصور المختارة من العميل",
    copyWhatsappInvite: "نسخ دعوة الواتساب",
    testPortalWithPin: "تجربة البوابة بهذا الرمز",
    requestedQuota: "عدد الصور المطلوب اختيارها",
    quotaHelp: "الحد الأقصى للصور لهذا العميل",
    saveQuota: "حفظ الحد",
    clientEmailIdentifier: "المعرّف (بريد العميل):",
    noEmailWarning: "لا يوجد بريد (مطلوب لتسجيل الدخول)",
    customQuotaLabel: "مخصص:",
    quotaStrictLimit: "لن يتمكن العميل من تأكيد سوى هذا العدد المحدد من الصور.",
    savedIndicator: "تم الحفظ!",
    collapsePanels: "طي",
    expandPanels: "عرض الرمز والتخزين",
    copyPinTooltip: "انقر لنسخ رمز PIN",
    clientSelectionLabel: "اختيار العميل:",
    notesLabel: "الملاحظات:",
    activeLog: "سجل نشط",
    zeroNotes: "0 ملاحظات",
    pinTabLabel: "رمز PIN",
    storageTabLabel: "تخزين الاستوديو",
    deliveryLink: "التسليم",
    storageHeader: "تخزين NAS",
    ingestFromSdCard: "استيراد من ذاكرة SD",
    createFoldersBtn: "إنشاء المجلدات",
    statusDeliveredToClient: "تم التسليم للعميل",

    clientsTitle: "سجل دليل العملاء",
    clientsSubtitle: "سجل العرسان، العائلات وجلسات التوثيق مع الأرشيف والرموز السرية.",
    totalClients: "إجمالي العملاء",
    sessionsCount: "الجلسات",
    sessionSingle: "جلسة",
    sessionsPlural: "جلسات",
    linkedSessions: "الجلسات المرتبطة",
    lastActivity: "آخر نشاط",
    contactNone: "لا توجد بيانات اتصال",
    viewCard: "عرض السجل",
    allSpecialties: "جميع التخصصات",
    photoOnly: "صور فقط",
    videoOnly: "فيديو فقط",

    photosTitle: "جلسات التصوير الفوتوغرافي",
    photosSubtitle: "إدارة العملاء، رمز PIN، مجلدات Google Drive وحالة التسليم.",
    totalSessions: "إجمالي الجلسات",
    inProcessEditing: "قيد المعالجة / التعديل",
    deliveredSuccess: "تم التسليم بنجاح",
    selectedPhotos: "صورة مختارة في البوابة الخاصة",
    portalPin: "رمز PIN البوابة",
    driveRaw: "مجلد RAW",

    videosTitle: "جلسات الفيديو والإعلانات",
    videosSubtitle: "متابعة المونتاج، مقاطع إنستغرام، تصحيح الألوان وروابط 4K.",
    totalProjects: "إجمالي المشاريع",
    inEditingRoom: "في غرفة المونتاج",
    videosDelivered: "الفيديوهات المسلمة",
    videoType: "نوع الفيديو",
    finalDelivery: "التسليم النهائي",
    viewVideo: "مشاهدة الفيديو",

    projectsTitle: "المشاريع والجلسات الشاملة",
    projectsSubtitle: "إدارة موحدة للصور والفيديو: استيراد الذاكرة، الأرشفة وحالة البوابة.",
    allProjects: "جميع المشاريع",
    photoSessionsTab: "صور",
    videoProductionsTab: "فيديو",
    selectionReady: "اختيارات العميل جاهزة",
    clientSelection: "اختيارات العميل",

    sortRecent: "الأحدث أولاً",
    sortOldest: "الأقدم أولاً",
    sortNameAsc: "الاسم (أ - ي)",
    sortNameDesc: "الاسم (ي - أ)",
    sortSessionsDesc: "الأكثر جلسات",
    wedding: "زفاف",
    newborn: "حديث الولادة",
    portrait: "بورتريه",
    maternity: "حوامل",
    birthday: "شدة / عيد ميلاد",
    event: "حدث / حفل",
    product: "منتجات",
    graduation: "تخرج",

    // Ingest Dialog
    ingestTitle: "مساعد استيراد ذاكرة SD والتخزين",
    ingestSubtitle: "تفريغ ذاكرة الكاميرا، تنظيم ملفات RAW والمعاينة السريعة تلقائياً.",
    createNewProjectTab: "إنشاء مشروع جديد",
    assignExistingSessionTab: "ربط بجلسة حالية",
    projectNameLabel: "اسم المشروع *",
    projectNamePlaceholder: "مثال: زفاف زينب وكريم",
    assignClientLabel: "تعيين العميل *",
    assignClientPlaceholder: "اسم العميل أو العريسين",
    sdOriginLabel: "المصدر: بطاقة الذاكرة / مجلد الكاميرا",
    rescanBtn: "إعادة الفحص",
    verifyingBtn: "جاري الفحص...",
    verifyBtn: "التحقق",
    unitReady: "الذاكرة جاهزة",
    photosCount: "صور",
    videosCount: "فيديو",
    automatedDestination: "الوجهة التلقائية (NAS / الشبكة المحلية)",
    structureTag: "هيكلية 01-04",
    startIngestBtn: "بدء الاستيراد وإنشاء المعاينات",
    processingSdCard: "جاري معالجة بطاقة الكاميرا...",
    realtimeConsole: "سجل العمليات المباشر",
    eventsCount: "أحداث",
    ingestFinishedTitle: "تم الاستيراد والمعالجة بنجاح!",
    ingestFinishedSubtitle: "تم توزيع الملفات على الشبكة الجاهزة للاستخدام والمعاينة.",
    rawPhotos: "صور RAW",
    rawVideos: "فيديوهات RAW",
    transferred: "تم نقل",
    projectDirectory: "مجلد المشروع الرئيسي",
    exploreFolder: "تصفح المجلد",
    downloadLogsBtn: "تحميل ملف السجل (.txt)",
    goToGalleryBtn: "الانتقال لمعرض الجلسة",

    // Ingest Dialog: اختيار العميل والجلسة
    searchSessionPlaceholder: "بحث عن جلسة بالعميل، التصنيف أو التاريخ...",
    orEnterUuidManually: "أو إدخال معرّف UUID يدوياً:",
    changeSessionBtn: "تغيير",
    assignedBadge: "تم التعيين",
    existingClientTab: "حالي",
    newClientTab: "جديد",
    searchClientPlaceholder: "بحث بالاسم، الهاتف، البريد...",
    clientSuggestions: "اقتراحات العملاء",
    noClientFound: "لم يتم العثور على أي عميل لـ",
    createAsNewClientBtn: "+ إنشاء كعميل جديد",
    closeSuggestions: "إغلاق",
    existingClientAlert: "عميل حالي:",
    assignBtn: "تعيين",
    assignToThisSession: "تعيين إلى هذه الجلسة",
    browseSourceBtn: "استعراض الملفات...",
    browseTargetBtn: "استعراض المجلدات...",
    explorerTitleSource: "مستكشف بطاقة الذاكرة / مجلد المصدر",
    explorerTitleTarget: "مستكشف قرص SSD / مجلد الوجهة",
    selectThisFolder: "تحديد هذا المجلد",
    createNewFolder: "مجلد جديد",
    upOneLevel: "المجلد الأعلى",
    selectAllFiles: "تحديد الكل",
    deselectAll: "إلغاء تحديد الكل",
    filesSelectedCount: "ملفات محددة",
    selectedFilesBadge: "ملفات مختارة",

    // Ingest Dialog: وجهة SSD والأقراص
    targetSsdTitle: "وجهة العمل (قرص SSD الخارجي للإنتاج)",
    targetSsdDesc: "اختر القرص الفعلي لتنظيم الملفات الأصلية. سيتم النسخ إلى قرص SSD أولاً ثم المزامنة لاحقاً مع شبكة NAS.",
    detectedDrivesLabel: "الأقراص المتصلة المكتشفة:",
    detectingBtn: "جاري الكشف...",
    refreshDrivesBtn: "تحديث",
    ssdExternalBadge: "SSD / خارجي",
    systemDriveBadge: "نظام C:",
    sameDriveAsOrigin: "نفس قرص المصدر",
    targetBasePathLabel: "المسار الرئيسي على SSD / المجلد الجذر:",
    resetBtn: "إعادة تعيين",
    proStructureOnSsd: "الهيكلية الاحترافية على SSD:",
    nasSyncLater: "المزامنة اللاحقة مع NAS:",
    samePathErrorTitle: "خطأ أمان: المصدر والوجهة متطابقان",
    samePathErrorDesc: "لا يمكن أن يكون مجلد المصدر ومجلد الوجهة متطابقين لتجنب الكتابة فوق الملفات.",
    sameDriveWarningTitle: "تنبيه! المصدر والوجهة يشتركان في نفس القرص",
    sameDriveWarningDesc: "تأكد من اختيار قرص SSD الخارجي كوجهة وليس بطاقة الذاكرة SD الخاصة بالكاميرا.",
    insufficientSpaceTitle: "مساحة غير كافية على قرص SSD الوجهة",
    capacityWarningTitle: "تنبيه السعة",
    startIngestOnSsd: "بدء الاستيراد إلى SSD",
    writingToSsd: "وجهة العمل:",
    freeGBLabel: "متاح",
    ofTotalLabel: "من أصل",
    sourcePathNotExist: "مسار المصدر غير موجود أو تمت إزالة بطاقة الذاكرة.",
    proStructureDescRaw: "01_RAW/الصور والفيديوهات (نسخة الكاميرا الأصلية)",
    proStructureDescEdits: "02_اختيار_العميل و 03_المونتاج_الرئيسي",
    proStructureDescFinal: "04_التسليمات_النهائية",
    automatedTag: "01-04 تلقائي",
    checkingSourceAndFolders: "جارٍ التحقق من المصدر وإعداد المجلدات...",
    startingIngestFrom: "بدء السحب من:",
    fillProjectAndClient: "يرجى إدخال اسم المشروع والعميل.",
    ingestStepBadge: "سحب",
    selectClientHelper: "حدد عميلاً حالياً لملء البيانات تلقائياً.",
    loadingText: "جارٍ التحميل...",

    // Media Manager
    photosTab: "الصور",
    videosTab: "الفيديوهات",
    editionMasterTab: "المونتاج",
    sharedWithClientTab: "المشارَكة",
    clientSelectionTab: "اختيارات العميل",
    driveTab: "Drive",
    syncMasterBtn: "مزامنة 03_Édition_Master",
    uploadMasterBtn: "رفع إلى المونتاج النهائي",
    searchMediaPlaceholder: "بحث باسم الملف أو الملاحظات...",
    shareBatchBtn: "مشاركة جميع الملفات",
    hideBatchBtn: "إخفاء الكل",
    noMediaInTab: "لا توجد ملفات في هذا القسم",
    useIngestInstruction: "استخدم زر 'استيراد من ذاكرة SD' في الأعلى لتفريغ الكاميرا وتزامن البيانات.",
    inBookBadge: "مختار للألبوم",
    unnamedFile: "ملف بدون اسم",
    clientNoteLabel: "ملاحظة العميل:",
    sharedStatus: "مشارك",
    hiddenStatus: "مخفي",
    openWithApp: "فتح في برنامج التعديل",
    revealInFolder: "عرض في مجلد النظام",
    openInLocalFolder: "فتح في المجلد المحلي (SSD)",
    openInNasFolder: "فتح على سيرفر NAS (الشبكة / FTP)",
    rotatePhoto: "تدوير الصورة",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    resetView: "إعادة ضبط العرض",
    deleteFromSession: "حذف من الجلسة",
    withNoteBadge: "مع ملاحظة",
    clientRetouchInstruction: "تعليمات التعديل من العميل:",
    selectedPhotosForBook: "صور تم اختيارها من قبل العميل للألبوم",
    photosWithRetouchNotes: "مع ملاحظات التعديل",
    commentedPhotosHint: "الصور التي تحتوي على ملاحظات تحمل شارة برتقالية 'مع ملاحظة'",
    masterTag: "ماستر",
    networkOriginal: "الأصل على الشبكة",
    filterAll: "الكل",
    filterPhotos: "الصور",
    filterVideos: "الفيديو",
    syncingText: "جارٍ المزامنة...",
    uploadingText: "جارٍ الرفع...",
    noMasterFiles: "لا توجد ملفات في 03_Édition_Master",
    masterInstructions: "احفظ الصور المعدلة أو مقاطع الفيديو في مجلد '03_Edicion_Master' واضغط على 'مزامنة' أو استخدم زر 'رفع'.",
    masterFolderDescription: "الصور المعدلة ومقاطع الفيديو المحررة في مجلد 03_Edicion_Master والمتزامنة مع Supabase بتنسيق WebP.",

    // NAS Storage Dashboard
    nasInfrastructure: "البنية التحتية لتخزين الإنتاج",
    nasTitle: "التخزين الشبكي والنسخ الاحتياطي",
    nasSubtitle: "إدارة مركزية لملفات RAW، التسليمات النهائية وأرشيف المشاريع الشبكي.",
    routerZteOnline: "راوتر ZTE NAS (متصل)",
    localMode: "الوضع المحلي (C:\\Lamha-Storage)",
    usbNasCapacity: "سعة USB NAS",
    used: "المستخدم",
    free: "المتاح",
    foldersInStorage: "مجلدات التخزين",
    scannedFiles: "الملفات المفحوصة",
    supabaseIndex: "فهرس Supabase",
    storageRootPath: "المسار الرئيسي للتخزين",
    activePathLabel: "المسار الحالي:",
    copyPathBtn: "نسخ المسار",
    copiedBtn: "تم النسخ",
    openInWindows: "فتح في ويندوز",
    modifyRootPath: "تعديل المسار الرئيسي",
    closeConfig: "إغلاق الإعدادات",
    presetZte: "راوتر ZTE NAS (192.168.11.1 /usb1_1)",
    presetLocal: "قرص محلي (C:\\Lamha-Storage)",
    presetBackup: "مجلد النسخ الاحتياطي",
    hostIpLabel: "عنوان IP / الهوست",
    ftpUserLabel: "اسم مستخدم FTP",
    ftpPasswordLabel: "كلمة مرور FTP",
    ftpBaseFolderLabel: "المجلد الرئيسي في NAS",
    localFallbackPathLabel: "المسار المحلي الاحتياطي",
    testingConn: "جاري الاختبار...",
    testConnBtn: "اختبار الاتصال",
    savingConfig: "جاري الحفظ...",
    saveActivePathBtn: "حفظ كمسار فعال",
    projectsInStorageTab: "المشاريع في التخزين",
    supabaseIndexTab: "فهرس Supabase",
    searchNasPlaceholder: "بحث عن مشروع، عميل أو ملف...",
    linkedToSupabase: "مرتبط مع Supabase",
    viewSessionBtn: "عرض الجلسة",
    emptyDirectory: "مجلد فارغ",

    // Settings Page
    studioSettingsTag: "إعدادات الاستوديو",
    generalSettingsTitle: "الإعدادات العامة والاتصال",
    generalSettingsSubtitle: "بيانات العلامة التجارية، حالة قاعدة البيانات وإعدادات البوابة الخاصة.",
    studioIdentity: "هوية استوديو لمحة",
    artisticDirection: "الإدارة الفنية بواسطة عفاف العريبي",
    atelierStudioLabel: "الاستوديو والعنوان",
    officialPhonesLabel: "أرقام الهاتف الرسمية",
    emailLabel: "البريد الإلكتروني",
    supabaseInfra: "بنية Supabase التحتية",
    postgresConnection: "اتصال PostgreSQL والتخزين",
    linkStatus: "حالة الاتصال",
    connectedOperative: "متصل ويعمل بنجاح",
    connError: "خطأ في الاتصال",
    disconnected: "غير متصل",
    securityRls: "الأمان وحماية البيانات RLS",
    rlsActive: "قواعد حماية Row Level Security نشطة",
    rlsDesc: "يمكن للعملاء الاطلاع على جلساتهم وتحديد صورهم فقط بأمان تام.",
    clientPortalParams: "معايير بوابة العملاء (البوابة الخاصة)",
    defaultPortalRules: "القواعد الافتراضية لتصميم الألبومات والمعارض الخاصة",
    bookQuota: "العدد المتاح للألبوم",
    bookQuotaValue: "20 صورة",
    bookQuotaDesc: "الحد المعياري لتصميم وطباعة الألبوم الكلاسيكي.",
    accessSecurity: "أمان الوصول",
    pinSecurityValue: "رمز PIN من 4 أرقام",
    pinSecurityDesc: "دخول سريع وآمن للعميل دون الحاجة لكلمات مرور معقدة.",
    localPortalServer: "خادم البوابة المحلي",
    portalServerDesc: "صفحة الاستقبال الرئيسية وواجهة اختيار الصور.",

    // Dual Storage & Deliveries
    dualStorageEnvTitle: "بيئة التخزين والتسليم المزدوجة",
    dualStorageEnvSubtitle: "التبديل بسلاسة بين الوضع السحابي (السفر/الحاسوب المحمول) ووضع الاستوديو (NAS المحلي).",
    activeModeLabel: "الوضع النشط:",
    activeModeNas: "🏢 الاستوديو (NAS)",
    activeModeCloud: "☁️ السحابة (Drive مباشر)",
    modeCloudTitle: "☁️ الوضع السحابي / عن بُعد",
    modeCloudDesc: "الرفع المباشر إلى Google Drive من المتصفح. مثالي أثناء السفر أو العمل بحاسوب محمول بدون توفر NAS.",
    modeNasTitle: "🏢 وضع الاستوديو / NAS",
    modeNasDesc: "يعطي الأولوية لـ NAS المحلي عبر الموزع (192.168.11.1) والمزامنة من مجلد 04_Entregas_Finales.",
    modeAutoTitle: "⚡ الكشف التلقائي",
    modeAutoDesc: "يكتشف ما إذا كان NAS متصلاً بالشبكة. يستخدم NAS في الاستوديو، ويتحول تلقائياً للسحابة أثناء السفر.",
    nasServerStatus: "حالة خادم NAS",
    nasOnlineLabel: "متصل (192.168.11.1)",
    nasOfflineLabel: "غير متصل / وضع عن بُعد",
    nasFtpAvailable: "وصول FTP متاح على الشبكة المحلية",
    nasNoConnection: "لا يوجد اتصال بموزع شبكة الاستوديو",
    changeAccount: "تغيير الحساب",
    disconnect: "قطع الاتصال",
    connectedOAuth: "متصل (OAuth 2.0)",
    unlinked: "غير مرتبط",
    connectGoogleDrive: "🔗 ربط Google Drive",
    unlimitedQuotaNote: "سعة غير محدودة من حسابك الشخصي النشط.",
    deliveryRetention: "فترة الاحتفاظ بالتسليمات",
    daysInCloud: "أيام في السحابة",
    retentionNotice: "بعد هذه المدة سيتم نقل الملفات إلى سلة مهملات Drive.",
    manualRecycleBtn: "🗑️ تشغيل التنظيف اليدوي للمجلدات المنتهية",
    cleaningInProgress: "جاري التنظيف...",
    saveStoragePreferences: "حفظ تفضيلات التخزين",
    saving: "جاري الحفظ...",

    // Dashboard Overview
    atelierTag: "استوديو التوثيق الفوتوغرافي الفاخر",
    overviewTitle: "النظرة العامة",
    overviewDesc: "لوحة تنسيق ألبومات الصور، التحكم في التسليمات والنسخ الاحتياطي الشبكي.",
    viewPhotoSessionsBtn: "عرض جلسات الصور",
    totalSessionsKpi: "إجمالي الجلسات",
    inActiveProduction: "قيد الإنتاج الفعلي",
    photoCollectionsKpi: "مجموعات الصور",
    manageGallery: "إدارة المعرض",
    videoProductionKpi: "إنتاج الفيديو",
    projectsAndReels: "المشاريع والإعلانات",
    clientSelectionsKpi: "اختيارات العملاء",
    selectionReadyDesc: "الصور المختارة جاهزة للألبوم",
    waitingSelectionsDesc: "في انتظار اختيارات العميل",
    recentSessionsTitle: "الجلسات الحديثة وحالة البوابة",
    recentSessionsSubtitle: "العملاء النشطون، رموز PIN المفعلة والصور المختارة في البوابة",
    viewAllSessionsLink: "عرض جميع الجلسات",
    workflowStatus: "حالة سير العمل",
    noSessionsFound: "لم يتم العثور على أي جلسات في قاعدة بيانات Supabase.",
    categoryDistributionTitle: "التوزيع حسب التصنيف",
    categoryDistributionSubtitle: "المشاريع حسب نوع الجلسة التحريرية",
    workflowFunnelTitle: "مسار سير العمل",
    workflowFunnelSubtitle: "الحالة الحالية للتسليمات وتجهيز الألبوم",
    noSessionsData: "لا توجد جلسات مسجلة بعد.",
    noWorkflowData: "لا توجد بيانات لسير العمل.",

    // Google Drive Upload
    syncAlbumToDrive: "مزامنة الألبوم إلى جوجل درايف",
    transferPhotosFrom: "نقل الصور من",
    syncInProgress: "جاري المزامنة...",
    syncToDriveBtn: "⚡ مزامنة إلى جوجل درايف",
    uploadCompletedTitle: "اكتمل الرفع",
    uploadErrorTitle: "خطأ في الرفع",
    uploadingToDrive: "جاري الرفع إلى جوجل درايف",
    filesCountStr: "ملفات",

    // Master / Dual NAS Upload & Sync Modal
    uploadMasterDualNas: "رفع / مزامنة ماستر (Dual NAS)",
    masterDeliveryManagerTitle: "إدارة تسليم ماستر والنسخ المزدوج",
    ingestStyleBadge: "نمط الاستيعاب",
    masterDeliveryManagerSubtitle: "احفظ الصور والفيديوهات على قرص SSD المحلي وانسخها تلقائياً إلى وحدة NAS الخاصة بالاستوديو.",
    verifyingNas: "جارٍ فحص وحدة NAS...",
    nasOnline: "NAS متصل",
    nasOfflineLocalOnly: "NAS غير متصل (محلي فقط)",
    recheckNasTooltip: "إعادة فحص وحدة NAS",
    tabUploadNewFiles: "1. رفع ملفات جديدة",
    tabSyncLocalToNas: "2. مزامنة المجلد مع NAS",
    folderMasterDesc: "الصور ومقاطع الفيديو المعالجة بعد المونتاج.",
    folderDeliveryDesc: "التصدير النهائي الجاهز للتسليم للعميل.",
    dualCopyLabel: "نسخ مزدوج: الحفظ على SSD المحلي وإرسال نسخة إلى NAS (192.168.11.1)",
    replicaNasActivated: "النسخ إلى NAS مفعّل",
    localOnly: "محلي فقط",
    selectEditedMediaTitle: "اختر الصور أو مقاطع الفيديو المعدلة",
    supportedFormatsDesc: "صيغ RAW (مثل NEF, CR2, ARW) و JPEG و PNG و MP4/MOV عالية الدقة.",
    selectFilesBtn: "اختيار ملفات",
    selectFolderBtn: "اختيار مجلد كامل",
    selectedFilesCount: "ملفات محددة",
    clearList: "مسح القائمة",
    startDualUploadBtn: "بدء الرفع المزدوج",
    syncLocalEditedTitle: "مزامنة الملفات المحلية المعدلة مع NAS",
    syncLocalEditedDesc: "إذا قمت بتعديل الصور على جهازك (في Lightroom أو Photoshop) أو عملت بدون إنترنت، ستقوم هذه الميزة بفحص المجلد المحلي وإرسال الملفات الناقصة إلى NAS.",
    localSourceLabel: "المصدر المحلي:",
    nasDestLabel: "الوجهة في NAS:",
    scanAndReplicateBtn: "فحص ونسخ إلى NAS",
    nasNotAccessible: "وحدة NAS غير متاحة على الشبكة المحلية",
    liveConsoleLogs: "سجل العمليات المباشر",
    transferSuccessTitle: "تمت عملية النقل بنجاح!",
    transferSuccessDesc: "ملفات تمت مزامنتها بنجاح بين SSD المحلي ووحدة تخزين NAS.",
    acceptAndClose: "موافق وإغلاق",

    clientDirectoryTag: "دليل الهوت كوتور للعملاء",
    videoProductionTag: "الإنتاج السينمائي",
    photoCollectionsTag: "مجموعات التصوير الفوتوغرافي",
    atelierUnifiedTag: "نظرة شاملة للأتيليه",
    totalSuffix: "إجمالي",

    allWord: "الكل",
    allWordFeminine: "الكل",
    withFinalVideo: "مع الفيديو النهائي",
    pendingVideo: "قيد الانتظار",
    withGeneratedPin: "مع رمز PIN مُنشأ",
    withSelection: "مع الصور المختارة",
    withSelectionMade: "تم اختيار الصور",
    awaitingSelection: "في انتظار الاختيار",
    noPin: "بدون PIN",
    noDrive: "بدون Drive",
    noVideoProductionsFound: "لم يتم العثور على أي إنتاج فيديو بالتصفيات الحالية.",
    noPhotoSessionsFound: "لم يتم العثور على أي جلسات تصوير بالتصفيات الحالية.",
    photosAndVideosCataloged: "صور وفيديوهات مفهرسة",
    editorialAndWeddings: "جلسات شخصية وأعراس",
    teasersClipsMaster: "مقاطع ترويجية ومونتاج نهائي",
    readyForAlbum: "جاهزة لتصميم الألبوم",

    auditGovernanceTag: "حوكمة متعددة المستخدمين ERP",
    auditTitle: "التدقيق والتتبع الصارم",
    auditSubtitle: "سجل زمني غير قابل للتعديل: من أنشأ المشاريع، من رفع أو حذف الصور، ومن عدّل المخطط.",
    refreshBtn: "تحديث",
    exportCsvBtn: "تصدير CSV",
    eventsToday: "أحداث اليوم",
    eventsTodayDesc: "سجلات النشاط المسجلة اليوم",
    photoUploads: "رفع الصور",
    photoUploadsDesc: "دفعات وسائط مرفوعة",
    projectChanges: "تعديلات المشاريع",
    projectChangesDesc: "حالات أو تواريخ معدلة",
    activeUsers: "المستخدمون النشطون",
    activeUsersDesc: "أعضاء الفريق النشطون اليوم",
    auditSearchPlaceholder: "بحث باسم المشروع، الملف، العميل أو المستخدم...",
    allModules: "كل الأقسام",
    moduleSessions: "المشاريع / الجلسات",
    moduleMedia: "الصور والفيديوهات",
    modulePlanner: "المخطط / كانبان",
    moduleClients: "العملاء",
    moduleDeliveries: "التسليمات",
    allActions: "كل الإجراءات",
    actionSessionCreated: "إنشاء المشاريع",
    actionMediaUploaded: "رفع الصور",
    actionMediaDeleted: "حذف الصور",
    actionPlannerChanged: "تحديث المخطط",
    actionStatusChanged: "تغيير الحالة",
    actionClientCreated: "تسجيل عميل جديد",
    filterBtn: "تصفية",
    recordsFound: "السجلات الموجودة",
    currentPageLast100: "الصفحة الحالية: آخر 100 سجل",
    queryingAuditLogs: "جاري استرداد سجلات التدقيق من قاعدة البيانات...",
    noAuditLogsFound: "لم يتم العثور على أي سجلات تدقيق بالتصفيات الحالية.",
    colDateTime: "التاريخ والوقت",
    colUser: "المستخدم المسؤول",
    colAction: "الإجراء المنفذ",
    colModule: "القسم",
    colAffectedItem: "العنصر المتأثر",
    colDetails: "التفاصيل",
    inspectDetails: "معاينة التفاصيل",
    auditModalTitle: "تفاصيل حدث التدقيق",
    userLabel: "المستخدم",
    dateAndAction: "التاريخ والإجراء",
    affectedElementLabel: "العنصر المتأثر",
    payloadDiffLabel: "بيانات التعديل (JSON Diff / الحمولة)",
    closeDetailBtn: "إغلاق التفاصيل",
    badgeUpload: "رفع الصور",
    badgeDeleted: "حذف",
    badgePlanner: "مخطط كانبان",
    badgeStatus: "تغيير الحالة",
    badgeShared: "مشاركة الصور",
    badgeCreated: "إنشاء",
    badgeModified: "تعديل",

    calculatingEta: "جاري الحساب...",
    remainingWord: "متبقي",
    syncingWithCloud: "تسجيل الملفات في سحابة Supabase...",
    copyCompletedDesc: "اكتمل النسخ بنجاح! يتم إنشاء المعاينات في الخلفية.",
    connectingDriveAndPrep: "الاتصال بـ Google Drive وتجهيز الملفات...",
    startingDriveGateway: "🚀 بدء مزامنة Google Drive في الخلفية...",
    uploadingFileProgress: "جاري رفع",
    driveTransferSuccess: "تم تسليم الملفات إلى Google Drive بنجاح!",
    photosUploadedCount: "صور تم رفعها.",
    finalDeliveryPublished: "التسليم النهائي المنشور للعميل",
    deliveryActiveBadge: "نشط",
    driveHighResAlbum: "ألبوم عالي الدقة على Google Drive",
    copied: "تم النسخ",
    copyLink: "نسخ الرابط",
    openInDrive: "فتح في Drive",
    deliveryModeLabel: "وضع التسليم",
    syncedFromNas: "تمت المزامنة من وحدة NAS",
    directCloudWeb: "سحابي مباشر (الويب)",
    filesAndWeight: "الملفات / الحجم",
    deliveryDateLabel: "تاريخ التسليم",
    cloudExpirationLabel: "انتهاء الصلاحية السحابية",
    noDriveDeliveryYet: "لا تحتوي هذه الجلسة بعد على تسليم نهائي نشط على Google Drive للعميل.",
    todayWord: "اليوم",
    noDateWord: "بدون تاريخ",
    previewEngineTitle: "محرك المعاينات",
    previewsGenerated: "تم إنشاء المعاينات",
    processingFilesCount: "جارٍ المعالجة",
    driveSyncSuccessMsg: "نجاح! اكتمل النقل إلى Google Drive بنجاح.",
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
  dir: "ltr" | "rtl"
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es")

  useEffect(() => {
    const saved = localStorage.getItem("lamha_admin_lang") as Language
    if (saved && ["es", "fr", "en", "ar"].includes(saved)) {
      setLanguageState(saved)
      if (typeof window !== "undefined" && (window as any).electronAPI?.notifyLanguageChange) {
        (window as any).electronAPI.notifyLanguageChange(saved)
      }
    }

    if (typeof window !== "undefined" && (window as any).electronAPI?.onLanguageChanged) {
      (window as any).electronAPI.onLanguageChanged((newLang: Language) => {
        if (["es", "fr", "en", "ar"].includes(newLang)) {
          setLanguageState(newLang)
          localStorage.setItem("lamha_admin_lang", newLang)
        }
      })
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("lamha_admin_lang", lang)
    if (typeof window !== "undefined" && (window as any).electronAPI?.notifyLanguageChange) {
      (window as any).electronAPI.notifyLanguageChange(lang)
    }
  }

  const dir = language === "ar" ? "rtl" : "ltr"
  const t = translations[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
    if (language === "ar") {
      document.documentElement.classList.add("font-arabic")
    } else {
      document.documentElement.classList.remove("font-arabic")
    }
  }, [language, dir])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      <div dir={dir} className={`w-full h-full flex flex-row overflow-hidden ${dir === "rtl" ? "dir-rtl" : "dir-ltr"}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

// Selector Dropdown Component
export function LanguageSelector({ dropUp = false, compact = false }: { dropUp?: boolean; compact?: boolean }) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)

  const options: { code: Language; label: string; flag: string }[] = [
    { code: "es", label: "Español", flag: "ES" },
    { code: "fr", label: "Français", flag: "FR" },
    { code: "en", label: "English", flag: "EN" },
    { code: "ar", label: "العربية", flag: "AR" },
  ]

  const currentOption = options.find((o) => o.code === language) || options[0]

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        title={`Langue: ${currentOption.label}`}
        className={`inline-flex items-center justify-center rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#29241f] hover:border-[#c69f68]/40 text-xs text-[#a89f91] hover:text-[#f5f2eb] transition-colors cursor-pointer ${
          compact ? "p-2" : "gap-2 px-3 py-1.5"
        }`}
      >
        <span className="w-5 h-4 rounded-sm bg-[#c69f68]/20 text-[#c69f68] font-mono text-[10px] font-bold flex items-center justify-center border border-[#c69f68]/30">
          {currentOption.flag}
        </span>
        {!compact && <span className="font-medium">{currentOption.label}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute ${compact ? "left-0" : "right-0"} ${
              dropUp ? "bottom-full mb-2" : "mt-2"
            } w-36 rounded-xl bg-[#141210] border border-[#26211c] shadow-2xl p-1.5 z-50 space-y-1`}
          >
            {options.map((opt) => (
              <button
                key={opt.code}
                onClick={() => {
                  setLanguage(opt.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  language === opt.code
                    ? "bg-[#c69f68]/15 text-[#c69f68] font-bold border border-[#c69f68]/30"
                    : "text-[#a89f91] hover:bg-[#1d1a16] hover:text-[#f5f2eb]"
                }`}
              >
                <span>{opt.label}</span>
                <span className="font-mono text-[10px] text-[#70665a]">{opt.flag}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
