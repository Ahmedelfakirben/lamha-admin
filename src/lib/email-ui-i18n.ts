import { Language } from "@/context/language-context"

export interface EmailUiDictionary {
  pageTitle: string
  pageSubtitle: string
  tabAutomations: string
  tabComposer: string
  exchangeLabel: string

  // Template cards
  badgeCreationIngest: string
  badgePlannerShared: string
  badgePortalSelection: string
  badgePlannerReady: string
  statusActive: string
  statusDisabled: string
  toggleTooltip: string
  editingLabel: string

  // Template editor panel
  editTitle: string
  editSubtitle: string
  dynamicVarsTitle: string
  varDescClientName: string
  varDescSessionDate: string
  varDescCategory: string
  varDescPortalPin: string
  varDescPhotosCount: string
  varCopiedFeedback: (variable: string) => string

  fieldAtelierTag: string
  fieldTagline: string
  fieldSubject: string
  fieldGreeting: string
  fieldCtaBtn: string
  fieldIntro: string
  fieldBodyText: string
  fieldClosing: string

  btnResetDefault: (langBadge: string) => string
  btnSaveChanges: string
  placeholderTestEmail: string
  btnSendTest: string

  // Live preview
  previewTitleAutomated: (langBadge: string) => string
  previewSubjectLabel: string
  previewDesktopTooltip: string
  previewMobileTooltip: string

  // Composer
  composerTitle: string
  composerSubtitle: string
  composerStep1: string
  composerSearchPlaceholder: string
  composerNoEmail: string
  composerSessionsSuffix: string
  composerClientNameLabel: string
  composerClientNamePlaceholder: string
  composerClientEmailLabel: string
  composerClientEmailPlaceholder: string
  composerLinkSessionLabel: string
  composerNoSessionOption: string
  composerStep2: string
  composerHeaderTagLabel: string
  composerSubjectLabel: string
  composerSubjectPlaceholder: string
  composerBodyLabel: string
  composerBodyPlaceholder: string
  composerIncludePortalLabel: string
  composerPinLabel: string
  composerDriveLabel: string
  composerBtnSend: string
  composerPreviewTitle: (langBadge: string) => string
  composerPreviewTo: string

  // Feedback & alerts
  msgToggledOn: string
  msgToggledOff: string
  msgSettingsSaved: string
  msgSettingsSaveError: string
  msgResetDone: (langBadge: string) => string
  msgTestSent: (target: string) => string
  msgTestError: string
  msgRequireEmail: string
  msgRequireBody: string
  msgCustomSent: (target: string) => string
  msgCustomError: string
}

export const EMAIL_UI_I18N: Record<Language, EmailUiDictionary> = {
  fr: {
    pageTitle: "Centre des Emails, Automatisations & Modèles HTML",
    pageSubtitle: "Gérez les emails automatiques du Planner et de l'Ingestion, personnalisez chaque texte ou envoyez un email libre à vos clients.",
    tabAutomations: "Emails Automatiques (Planner & Ingestion)",
    tabComposer: "Envoyer un Email Libre (Preset HTML)",
    exchangeLabel: "Exchange :",

    badgeCreationIngest: "Création / Ingestion",
    badgePlannerShared: "Planner ➔ Partagé",
    badgePortalSelection: "Portail ➔ Sélection",
    badgePlannerReady: "Planner ➔ Prêt Livraison",
    statusActive: "ACTIF",
    statusDisabled: "DÉSACTIVÉ",
    toggleTooltip: "Activer ou désactiver cet email automatique",
    editingLabel: "En cours d'édition ●",

    editTitle: "Modifier le Contenu du Modèle",
    editSubtitle: "Sélectionnez la langue de l'email et personnalisez chaque texte.",
    dynamicVarsTitle: "Variables dynamiques disponibles (utilisables dans l'objet ou les textes) :",
    varDescClientName: "Nom client",
    varDescSessionDate: "Date séance",
    varDescCategory: "Catégorie",
    varDescPortalPin: "PIN 4 chiffres",
    varDescPhotosCount: "Nb photos",
    varCopiedFeedback: (v) => `Variable ${v} copiée dans le presse-papiers`,

    fieldAtelierTag: "Badge Supérieur (Doré)",
    fieldTagline: "Sous-titre sous le Logo (Tagline)",
    fieldSubject: "Objet de l'Email (Subject)",
    fieldGreeting: "Salutation Initiale",
    fieldCtaBtn: "Texte du Bouton Principal (CTA)",
    fieldIntro: "Paragraphe d'Introduction",
    fieldBodyText: "Corps du Message / Instructions",
    fieldClosing: "Formule de Clôture / Signature",

    btnResetDefault: (l) => `Restaurer par défaut (${l})`,
    btnSaveChanges: "Enregistrer les modifications",
    placeholderTestEmail: "Votre email pour recevoir un test de ce modèle...",
    btnSendTest: "Envoyer un Test",

    previewTitleAutomated: (l) => `APERÇU HTML EN DIRECT (${l})`,
    previewSubjectLabel: "Objet :",
    previewDesktopTooltip: "Vue Ordinateur",
    previewMobileTooltip: "Vue Mobile",

    composerTitle: "Rédiger un Email Client (Preset HTML Officiel)",
    composerSubtitle: "Sélectionnez le client et rédigez simplement votre message ; la mise en page de prestige Lam7a Studios s'applique automatiquement.",
    composerStep1: "1. Rechercher et Sélectionner un Client (ou saisir manuellement ci-dessous)",
    composerSearchPlaceholder: "Rechercher par nom, email ou téléphone...",
    composerNoEmail: "Sans email enregistré",
    composerSessionsSuffix: "séance(s)",
    composerClientNameLabel: "Nom du Client *",
    composerClientNamePlaceholder: "Ex : Sarah Benali",
    composerClientEmailLabel: "Adresse Email Destinataire *",
    composerClientEmailPlaceholder: "client@exemple.com",
    composerLinkSessionLabel: "Lier à un Projet / Séance (optionnel, renseigne le PIN et Google Drive)",
    composerNoSessionOption: "-- Sans séance spécifique / Email général --",
    composerStep2: "2. Modèles de Textes Rapides (optionnel, ou rédigez librement ci-dessous) :",
    composerHeaderTagLabel: "Badge d'En-tête",
    composerSubjectLabel: "Objet de l'Email *",
    composerSubjectPlaceholder: "✦ Information de Lam7a Studios...",
    composerBodyLabel: "Corps du Message * (Séparez les paragraphes avec Entrée ; la salutation et la signature sont incluses)",
    composerBodyPlaceholder: "Écrivez ici le message destiné au client...",
    composerIncludePortalLabel: "Inclure le bloc doré avec les identifiants du Portail Client (si PIN)",
    composerPinLabel: "Code PIN Portail (optionnel)",
    composerDriveLabel: "Lien Google Drive (optionnel)",
    composerBtnSend: "Envoyer l'Email HTML Maintenant",
    composerPreviewTitle: (l) => `APERÇU DE L'EMAIL À ENVOYER (${l})`,
    composerPreviewTo: "Pour :",

    msgToggledOn: "Email automatique ACTIVÉ et enregistré.",
    msgToggledOff: "Email automatique DÉSACTIVÉ et enregistré.",
    msgSettingsSaved: "Modèles et configuration enregistrés avec succès dans Supabase.",
    msgSettingsSaveError: "Erreur lors de l'enregistrement de la configuration.",
    msgResetDone: (l) => `Texte en ${l} restauré au modèle original. Cliquez sur "Enregistrer les modifications" pour confirmer.`,
    msgTestSent: (t) => `Email de test envoyé à ${t}`,
    msgTestError: "Erreur lors de l'envoi de l'email de test.",
    msgRequireEmail: "Veuillez renseigner l'adresse email du client.",
    msgRequireBody: "Veuillez rédiger le corps du message avant l'envoi.",
    msgCustomSent: (t) => `Email envoyé avec succès à ${t}`,
    msgCustomError: "Impossible d'envoyer l'email.",
  },

  ar: {
    pageTitle: "مركز البريد الإلكتروني، الأتمتة وقوالب HTML",
    pageSubtitle: "إدارة رسائل البريد التلقائية للمخطط وأداة الاستيراد، تعديل النصوص أو إرسال بريد بتصميم HTML لأي عميل.",
    tabAutomations: "الرسائل التلقائية (المخطط وأداة الاستيراد)",
    tabComposer: "إرسال بريد مخصص (قالب HTML الفاخر)",
    exchangeLabel: "خادم البريد Exchange:",

    badgeCreationIngest: "إنشاء / استيراد",
    badgePlannerShared: "المخطط ➔ تمت المشاركة",
    badgePortalSelection: "البوابة ➔ الاختيار",
    badgePlannerReady: "المخطط ➔ جاهز للتسليم",
    statusActive: "مفعل",
    statusDisabled: "معطل",
    toggleTooltip: "تفعيل أو تعطيل هذا البريد التلقائي",
    editingLabel: "قيد التعديل ●",

    editTitle: "تعديل محتوى القالب",
    editSubtitle: "حدد لغة البريد الإلكتروني وقم بتخصيص النصوص بحرية.",
    dynamicVarsTitle: "المتغيرات الديناميكية المتاحة (يمكنك نسخها واستخدامها في الموضوع أو النصوص):",
    varDescClientName: "اسم العميل",
    varDescSessionDate: "تاريخ الجلسة",
    varDescCategory: "الفئة",
    varDescPortalPin: "رمز PIN المكون من 4 أرقام",
    varDescPhotosCount: "عدد الصور",
    varCopiedFeedback: (v) => `تم نسخ المتغير ${v} إلى الحافظة`,

    fieldAtelierTag: "الشارة العلوية الذهبية",
    fieldTagline: "العنوان الفرعي أسفل الشعار",
    fieldSubject: "موضوع البريد الإلكتروني",
    fieldGreeting: "التحية الافتتاحية",
    fieldCtaBtn: "نص الزر الرئيسي (CTA)",
    fieldIntro: "الفقرة الافتتاحية",
    fieldBodyText: "نص الرسالة / التعليمات",
    fieldClosing: "عبارة الختام / التوقيع",

    btnResetDefault: (l) => `استعادة الافتراضي (${l})`,
    btnSaveChanges: "حفظ التغييرات",
    placeholderTestEmail: "أدخل بريدك الإلكتروني لاستلام رسالة تجريبية...",
    btnSendTest: "إرسال اختبار",

    previewTitleAutomated: (l) => `معاينة HTML المباشرة (${l})`,
    previewSubjectLabel: "الموضوع:",
    previewDesktopTooltip: "عرض الحاسوب",
    previewMobileTooltip: "عرض الهاتف",

    composerTitle: "كتابة بريد إلكتروني للعميل (قالب HTML الرسمي)",
    composerSubtitle: "اختر العميل واكتب رسالتك فقط؛ سيتم تطبيق تصميم استوديو لمحة الفاخر تلقائياً.",
    composerStep1: "1. البحث عن عميل واختياره (أو ملء البيانات يدوياً أدناه)",
    composerSearchPlaceholder: "البحث عن عميل بالاسم أو البريد أو الهاتف...",
    composerNoEmail: "بدون بريد مسجل",
    composerSessionsSuffix: "جلسة",
    composerClientNameLabel: "اسم العميل *",
    composerClientNamePlaceholder: "مثال: سارة بنعلي",
    composerClientEmailLabel: "البريد الإلكتروني للعميل *",
    composerClientEmailPlaceholder: "client@example.com",
    composerLinkSessionLabel: "ربط بمشروع / جلسة (اختياري، يملأ رمز PIN ورابط Drive تلقائياً)",
    composerNoSessionOption: "-- بدون جلسة محددة / بريد عام --",
    composerStep2: "2. نصوص جاهزة سريعة (اختياري، أو اكتب رسالتك بحرية أدناه):",
    composerHeaderTagLabel: "شارة الترويسة",
    composerSubjectLabel: "موضوع الرسالة *",
    composerSubjectPlaceholder: "✦ إشعار من استوديو لمحة...",
    composerBodyLabel: "نص الرسالة * (افصل الفقرات بزر Enter؛ التحية والتوقيع مدمجان مسبقاً في القالب)",
    composerBodyPlaceholder: "اكتب رسالتك الموجهة للعميل هنا...",
    composerIncludePortalLabel: "تضمين البطاقة الذهبية مع بيانات الدخول للبوابة (إذا وجد PIN)",
    composerPinLabel: "رمز PIN للبوابة (اختياري)",
    composerDriveLabel: "رابط Google Drive (اختياري)",
    composerBtnSend: "إرسال بريد HTML الآن",
    composerPreviewTitle: (l) => `معاينة البريد المُراد إرساله (${l})`,
    composerPreviewTo: "إلى:",

    msgToggledOn: "تم تفعيل وحفظ البريد التلقائي.",
    msgToggledOff: "تم تعطيل وحفظ البريد التلقائي.",
    msgSettingsSaved: "تم حفظ القوالب والإعدادات بنجاح في قاعدة البيانات.",
    msgSettingsSaveError: "حدث خطأ أثناء حفظ الإعدادات.",
    msgResetDone: (l) => `تمت استعادة النص الأصلي للغة ${l}. اضغط "حفظ التغييرات" لتأكيد التحديث.`,
    msgTestSent: (t) => `تم إرسال بريد تجريبي إلى ${t}`,
    msgTestError: "حدث خطأ أثناء إرسال البريد التجريبي.",
    msgRequireEmail: "يرجى تحديد البريد الإلكتروني للعميل.",
    msgRequireBody: "يرجى كتابة نص الرسالة قبل الإرسال.",
    msgCustomSent: (t) => `تم إرسال البريد بنجاح إلى ${t}`,
    msgCustomError: "تعذر إرسال البريد الإلكتروني.",
  },

  es: {
    pageTitle: "Centro de Correos, Automatizaciones y Plantillas HTML",
    pageSubtitle: "Gestiona los correos automáticos del Planner/Ingesta, edita sus textos o envía un correo HTML a cualquier cliente.",
    tabAutomations: "Correos Automáticos (Planner & Ingesta)",
    tabComposer: "Enviar Correo a Placer (Preset HTML)",
    exchangeLabel: "Exchange:",

    badgeCreationIngest: "Creación / Ingesta",
    badgePlannerShared: "Planner ➔ Compartido",
    badgePortalSelection: "Portal ➔ Selección",
    badgePlannerReady: "Planner ➔ Listo Entrega",
    statusActive: "ACTIVO",
    statusDisabled: "DESACTIVADO",
    toggleTooltip: "Activar o desactivar este correo automático",
    editingLabel: "Editando ●",

    editTitle: "Editar Contenido de la Plantilla",
    editSubtitle: "Selecciona el idioma del correo y personaliza cualquier texto.",
    dynamicVarsTitle: "Variables dinámicas disponibles (puedes usarlas en el asunto o textos):",
    varDescClientName: "Nombre cliente",
    varDescSessionDate: "Fecha sesión",
    varDescCategory: "Categoría",
    varDescPortalPin: "PIN 4 dígitos",
    varDescPhotosCount: "Nº fotos",
    varCopiedFeedback: (v) => `Variable ${v} copiada al portapapeles`,

    fieldAtelierTag: "Etiqueta Superior (Badge Dorado)",
    fieldTagline: "Subtítulo Bajo el Logo (Tagline)",
    fieldSubject: "Asunto del Correo (Subject)",
    fieldGreeting: "Saludo Inicial",
    fieldCtaBtn: "Texto del Botón Principal (CTA)",
    fieldIntro: "Párrafo Principal de Introducción",
    fieldBodyText: "Cuerpo del Mensaje / Instrucciones",
    fieldClosing: "Frase de Cierre / Despedida",

    btnResetDefault: (l) => `Restaurar por defecto (${l})`,
    btnSaveChanges: "Guardar Cambios",
    placeholderTestEmail: "Tu email para recibir una prueba de esta plantilla...",
    btnSendTest: "Enviar Prueba",

    previewTitleAutomated: (l) => `VISTA PREVIA HTML EN VIVO (${l})`,
    previewSubjectLabel: "Asunto:",
    previewDesktopTooltip: "Vista Escritorio",
    previewMobileTooltip: "Vista Móvil",

    composerTitle: "Redactar Correo a Cliente (Preset HTML Oficial)",
    composerSubtitle: "Elige el cliente y escribe únicamente el mensaje; el diseño de lujo de Lam7a Studios se aplica solo.",
    composerStep1: "1. Buscar y Seleccionar Cliente (o rellenar manualmente debajo)",
    composerSearchPlaceholder: "Buscar cliente por nombre, correo o teléfono...",
    composerNoEmail: "Sin email registrado",
    composerSessionsSuffix: "ses.",
    composerClientNameLabel: "Nombre del Cliente *",
    composerClientNamePlaceholder: "Ej: Sarah Benali",
    composerClientEmailLabel: "Correo Electrónico Destino *",
    composerClientEmailPlaceholder: "cliente@ejemplo.com",
    composerLinkSessionLabel: "Vincular Proyecto / Sesión (opcional, autocompleta su PIN y Google Drive)",
    composerNoSessionOption: "-- Sin sesión específica / Correo general --",
    composerStep2: "2. Textos Rápidos de Punto de Partida (opcional, o escribe libremente debajo):",
    composerHeaderTagLabel: "Etiqueta Cabecera",
    composerSubjectLabel: "Asunto del Correo *",
    composerSubjectPlaceholder: "✦ Información de Lam7a Studios...",
    composerBodyLabel: "Cuerpo del Mensaje * (Separa párrafos con Enter; el saludo y la firma ya están en el Preset HTML)",
    composerBodyPlaceholder: "Escribe aquí el mensaje para el cliente...",
    composerIncludePortalLabel: "Incluir bloque dorado con Credenciales del Portal (si hay PIN)",
    composerPinLabel: "Código PIN Portal (opcional)",
    composerDriveLabel: "Enlace Google Drive (opcional)",
    composerBtnSend: "Enviar Correo HTML Ahora",
    composerPreviewTitle: (l) => `VISTA PREVIA DEL CORREO A ENVIAR (${l})`,
    composerPreviewTo: "Para:",

    msgToggledOn: "Correo automático ACTIVADO y guardado.",
    msgToggledOff: "Correo automático DESACTIVADO y guardado.",
    msgSettingsSaved: "Plantillas y configuración guardadas correctamente en Supabase.",
    msgSettingsSaveError: "Error al guardar la configuración.",
    msgResetDone: (l) => `Texto en ${l} restaurado al original. Pulsa "Guardar Cambios" para confirmar.`,
    msgTestSent: (t) => `Correo de prueba enviado a ${t}`,
    msgTestError: "Error al enviar correo de prueba.",
    msgRequireEmail: "Indica el correo electrónico del cliente.",
    msgRequireBody: "Escribe el cuerpo del mensaje antes de enviar.",
    msgCustomSent: (t) => `Correo enviado con éxito a ${t}`,
    msgCustomError: "No se pudo enviar el correo.",
  },

  en: {
    pageTitle: "Email Center, Automations & HTML Templates",
    pageSubtitle: "Manage automated emails for Planner and Ingest, customize their copy, or send a luxury HTML email to any client.",
    tabAutomations: "Automated Emails (Planner & Ingest)",
    tabComposer: "Custom Client Email (HTML Preset)",
    exchangeLabel: "Exchange:",

    badgeCreationIngest: "Creation / Ingest",
    badgePlannerShared: "Planner ➔ Shared",
    badgePortalSelection: "Portal ➔ Selection",
    badgePlannerReady: "Planner ➔ Ready Delivery",
    statusActive: "ACTIVE",
    statusDisabled: "DISABLED",
    toggleTooltip: "Enable or disable this automated email",
    editingLabel: "Editing ●",

    editTitle: "Edit Template Content",
    editSubtitle: "Select the email language and customize any text.",
    dynamicVarsTitle: "Available dynamic variables (can be used in subject or body text):",
    varDescClientName: "Client name",
    varDescSessionDate: "Session date",
    varDescCategory: "Category",
    varDescPortalPin: "4-digit PIN",
    varDescPhotosCount: "Photos count",
    varCopiedFeedback: (v) => `Variable ${v} copied to clipboard`,

    fieldAtelierTag: "Top Badge (Gold Header)",
    fieldTagline: "Subtitle under Logo (Tagline)",
    fieldSubject: "Email Subject",
    fieldGreeting: "Initial Greeting",
    fieldCtaBtn: "Main Action Button (CTA)",
    fieldIntro: "Introductory Paragraph",
    fieldBodyText: "Message Body / Instructions",
    fieldClosing: "Closing Statement / Sign-off",

    btnResetDefault: (l) => `Reset to default (${l})`,
    btnSaveChanges: "Save Changes",
    placeholderTestEmail: "Your email to receive a test of this template...",
    btnSendTest: "Send Test",

    previewTitleAutomated: (l) => `LIVE HTML PREVIEW (${l})`,
    previewSubjectLabel: "Subject:",
    previewDesktopTooltip: "Desktop View",
    previewMobileTooltip: "Mobile View",

    composerTitle: "Compose Client Email (Official HTML Preset)",
    composerSubtitle: "Select the client and simply write your message; Lam7a Studios' luxury design is applied automatically.",
    composerStep1: "1. Search & Select Client (or enter manually below)",
    composerSearchPlaceholder: "Search by name, email or phone...",
    composerNoEmail: "No email registered",
    composerSessionsSuffix: "sess.",
    composerClientNameLabel: "Client Name *",
    composerClientNamePlaceholder: "E.g.: Sarah Benali",
    composerClientEmailLabel: "Recipient Email Address *",
    composerClientEmailPlaceholder: "client@example.com",
    composerLinkSessionLabel: "Link Project / Session (optional, autofills PIN & Google Drive)",
    composerNoSessionOption: "-- No specific session / General email --",
    composerStep2: "2. Quick Text Presets (optional, or type freely below):",
    composerHeaderTagLabel: "Header Tag",
    composerSubjectLabel: "Email Subject *",
    composerSubjectPlaceholder: "✦ Update from Lam7a Studios...",
    composerBodyLabel: "Message Body * (Separate paragraphs with Enter; greeting and signature are built into HTML Preset)",
    composerBodyPlaceholder: "Type your message to the client here...",
    composerIncludePortalLabel: "Include gold card with Client Portal credentials (if PIN exists)",
    composerPinLabel: "Portal PIN Code (optional)",
    composerDriveLabel: "Google Drive Link (optional)",
    composerBtnSend: "Send HTML Email Now",
    composerPreviewTitle: (l) => `PREVIEW OF EMAIL TO SEND (${l})`,
    composerPreviewTo: "To:",

    msgToggledOn: "Automated email ENABLED and saved.",
    msgToggledOff: "Automated email DISABLED and saved.",
    msgSettingsSaved: "Templates and settings successfully saved to Supabase.",
    msgSettingsSaveError: "Error saving settings.",
    msgResetDone: (l) => `Text in ${l} reset to original default. Click "Save Changes" to confirm.`,
    msgTestSent: (t) => `Test email sent to ${t}`,
    msgTestError: "Error sending test email.",
    msgRequireEmail: "Please provide the client's email address.",
    msgRequireBody: "Please write a message body before sending.",
    msgCustomSent: (t) => `Email successfully sent to ${t}`,
    msgCustomError: "Could not send the email.",
  },
}

