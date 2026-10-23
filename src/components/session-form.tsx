'use client'

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, 
  User, 
  UserPlus, 
  Phone, 
  Mail, 
  Camera, 
  Film, 
  Calendar as CalendarIcon, 
  Key, 
  Dices, 
  Sparkles, 
  Check, 
  Search, 
  X, 
  Loader2, 
  Tag, 
  MessageSquare
} from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  createSession, 
  updateSession, 
  getExistingClients, 
  ExistingClientOption 
} from '@/app/actions';
import { useLanguage } from '@/context/language-context';
import { cn } from "@/lib/utils";
import { createClient } from '@/lib/supabase';
import { Category } from '@/types/database';

const formSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(2, "Le nom du client doit comporter au moins 2 caractères."),
  client_phone: z.string().optional(),
  client_email: z.string().email("Adresse email invalide").optional().or(z.literal('')),
  session_date: z.string(),
  session_type: z.enum(['photo', 'video']),
  category: z.string().min(1, "Veuillez sélectionner une catégorie"),
  subcategory: z.string().optional(),
  status: z.enum(['pending', 'shooting', 'edited', 'delivered', 'archived']),
  comments: z.string().optional(),
  tags: z.string().optional(),
  portal_pin: z.string().min(4, "Le code PIN doit comporter au moins 4 chiffres").optional().or(z.literal('')),
  folder_link: z.string().optional(),
  final_link: z.string().optional(),
});

interface SessionFormProps {
  initialData?: any;
  onSuccess: () => void;
  theme?: 'light' | 'dark';
}

const CATEGORIES = [
  { value: 'wedding', label: 'Mariage / Wedding' },
  { value: 'portrait', label: 'Portrait & Studio' },
  { value: 'newborn', label: 'Nouveau-né / Newborn' },
  { value: 'maternity', label: 'Maternité / Grossesse' },
  { value: 'event', label: 'Événement & Soirée' },
  { value: 'graduation', label: 'Remise de Diplôme' },
  { value: 'birthday', label: 'Anniversaire' },
  { value: 'other', label: 'Autre Projet' },
];

const SUBCATEGORIES_PORTRAIT = [
  { value: 'harry_potter', label: 'Harry Potter' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'safari', label: 'Safari' },
  { value: 'moroccan_corner', label: 'Moroccan Corner' },
  { value: 'gender_reveal', label: 'Gender Reveal' },
  { value: 'cinderella', label: 'Cinderella' },
  { value: 'astronaut', label: 'Astronaut' },
  { value: 'arabian_corner', label: 'Arabian Corner' },
  { value: 'candy_sweet', label: 'Candy Sweet' },
];

const QUICK_TAGS = ['#mariage', '#urgent', '#album', '#drive', '#vip', '#reel', '#drone'];

const WELCOME_CHECKBOX_I18N = {
  fr: {
    title: "Envoyer un email de bienvenue",
    subtitle: "Notifie le client avec la date et la catégorie confirmée",
  },
  es: {
    title: "Enviar correo de bienvenida",
    subtitle: "Notifica al cliente con la fecha y categoría confirmadas",
  },
  en: {
    title: "Send welcome email",
    subtitle: "Notifies the client with scheduled date and confirmed category",
  },
  ar: {
    title: "إرسال بريد تترحيب وتأكيد الحجز",
    subtitle: "إشعار العميل بالموعد وفئة الجلسة المعتمدة",
  },
};

export function SessionForm({ initialData, onSuccess, theme = 'light' }: SessionFormProps) {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const isLight = theme === 'light';

  // Dynamic Categories from Supabase
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Client Selection / Autocomplete State
  const isEditing = Boolean(initialData?.id);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    initialData?.client_name ? 'new' : 'existing'
  );
  const [existingClients, setExistingClients] = useState<ExistingClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<ExistingClientOption | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [pinGeneratedBadge, setPinGeneratedBadge] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: initialData?.client_id || "",
      client_name: initialData?.client_name || "",
      client_phone: initialData?.client_phone || "",
      client_email: initialData?.client_email || "",
      session_date: initialData?.session_date || new Date().toISOString().split('T')[0],
      session_type: initialData?.session_type || "photo",
      category: initialData?.category || "portrait",
      subcategory: initialData?.subcategory || "",
      status: initialData?.status || "pending",
      comments: initialData?.comments || "",
      tags: Array.isArray(initialData?.tags) ? initialData.tags.join(', ') : (initialData?.tags || ""),
      portal_pin: initialData?.portal_pin || "",
      folder_link: initialData?.folder_link || "",
      final_link: initialData?.final_link || "",
    },
  });

  // Reset form when initialData changes (e.g. editing a session)
  useEffect(() => {
    if (initialData) {
      form.reset({
        client_id: initialData.client_id || "",
        client_name: initialData.client_name || "",
        client_phone: initialData.client_phone || "",
        client_email: initialData.client_email || "",
        session_date: initialData.session_date ? String(initialData.session_date).split('T')[0] : new Date().toISOString().split('T')[0],
        session_type: initialData.session_type || "photo",
        category: initialData.category || "portrait",
        subcategory: initialData.subcategory || "",
        status: initialData.status || "pending",
        comments: initialData.comments || "",
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ""),
        portal_pin: initialData.portal_pin || "",
        folder_link: initialData.folder_link || "",
        final_link: initialData.final_link || "",
      });
      if (initialData.client_name) {
        setClientMode('new');
      }
    }
  }, [initialData, form]);

  // Fetch existing clients on mount
  useEffect(() => {
    let isMounted = true;
    async function loadClients() {
      setLoadingClients(true);
      try {
        const res = await getExistingClients();
        if (isMounted && res.success) {
          setExistingClients(res.clients);
          
          if (initialData?.client_name) {
            const match = res.clients.find(
              c => c.name.toLowerCase() === initialData.client_name.toLowerCase()
            );
            if (match) {
              setSelectedClient(match);
              setClientMode('existing');
            }
          }
        }
      } catch (err) {
        console.error("Failed to load existing clients:", err);
      } finally {
        if (isMounted) setLoadingClients(false);
      }
    }
    loadClients();
    return () => {
      isMounted = false;
    };
  }, [initialData?.client_name]);

  // Load dynamic categories & subcategories from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicCategories() {
      setLoadingCategories(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*, subcategories(*)')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        if (isMounted && data && data.length > 0) {
          setDbCategories(data);
        }
      } catch (err) {
        console.warn("Could not fetch categories from Supabase, using defaults:", err);
      } finally {
        if (isMounted) setLoadingCategories(false);
      }
    }
    loadDynamicCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute active category and its subcategories
  const currentCategorySlug = form.watch('category');
  const activeCategory = useMemo(() => {
    return dbCategories.find(c => c.slug === currentCategorySlug);
  }, [dbCategories, currentCategorySlug]);

  const activeSubcategories = useMemo(() => {
    if (!activeCategory || !activeCategory.subcategories) return [];
    return activeCategory.subcategories.filter(s => s.is_active !== false);
  }, [activeCategory]);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return existingClients.slice(0, 10);
    }
    const q = clientSearchQuery.toLowerCase().trim();
    return existingClients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q)) || 
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [existingClients, clientSearchQuery]);

  // Live detection of existing client while typing in "New Client" mode
  const currentTypedName = form.watch('client_name');
  const duplicateSuggestion = useMemo(() => {
    if (clientMode !== 'new' || !currentTypedName || currentTypedName.trim().length < 2) {
      return null;
    }
    const typed = currentTypedName.trim().toLowerCase();
    return existingClients.find(c => c.name.toLowerCase() === typed || c.name.toLowerCase().startsWith(typed));
  }, [clientMode, currentTypedName, existingClients]);

  // Handler to assign an existing client
  const handleSelectClient = (client: ExistingClientOption) => {
    setSelectedClient(client);
    form.setValue('client_name', client.name, { shouldValidate: true, shouldDirty: true });
    if (client.phone) {
      form.setValue('client_phone', client.phone, { shouldDirty: true });
    }
    if (client.email) {
      form.setValue('client_email', client.email, { shouldDirty: true });
    }
    if (client.id) {
      form.setValue('client_id', client.id);
    }
    setShowClientDropdown(false);
    setClientSearchQuery('');
  };

  // Handler to clear selected client
  const handleClearSelectedClient = () => {
    setSelectedClient(null);
    form.setValue('client_id', '');
    form.setValue('client_name', '');
    form.setValue('client_phone', '');
    form.setValue('client_email', '');
  };

  // Quick 4-digit PIN Generator
  const handleGeneratePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    form.setValue('portal_pin', pin, { shouldValidate: true, shouldDirty: true });
    setPinGeneratedBadge(true);
    setTimeout(() => setPinGeneratedBadge(false), 2000);
  };

  // Append a tag
  const handleAddTag = (tag: string) => {
    const currentTags = form.getValues('tags') || '';
    const cleanTag = tag.replace(/^#/, '');
    const tagsArray = currentTags.split(',').map(t => t.trim()).filter(Boolean);
    if (!tagsArray.includes(cleanTag)) {
      const newTags = tagsArray.length > 0 ? `${currentTags}, ${cleanTag}` : cleanTag;
      form.setValue('tags', newTags, { shouldDirty: true });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    let res;
    
    const payload: any = { ...values };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payload.client_id || typeof payload.client_id !== 'string' || !uuidRegex.test(payload.client_id.trim())) {
      delete payload.client_id;
    } else {
      payload.client_id = payload.client_id.trim();
    }

    if (!payload.portal_pin) {
      if (initialData?.id) payload.portal_pin = null;
      else delete payload.portal_pin;
    }
    if (!payload.subcategory) {
      if (initialData?.id) payload.subcategory = null;
      else delete payload.subcategory;
    }
    if (!payload.client_email) {
      if (initialData?.id) payload.client_email = null;
      else delete payload.client_email;
    }
    if (!payload.client_phone) {
      if (initialData?.id) payload.client_phone = null;
      else delete payload.client_phone;
    }
    if (!payload.comments) {
      if (initialData?.id) payload.comments = null;
      else delete payload.comments;
    }
    if (!payload.tags) {
      if (initialData?.id) payload.tags = [];
      else delete payload.tags;
    }
    if (!payload.folder_link) {
      if (initialData?.id) payload.folder_link = null;
      else delete payload.folder_link;
    }
    if (!payload.final_link) {
      if (initialData?.id) payload.final_link = null;
      else delete payload.final_link;
    }

    if (!initialData?.id) {
      payload.sendWelcomeEmail = sendWelcomeEmail;
      payload.language = language;
    }

    if (initialData?.id) {
      res = await updateSession(initialData.id, payload);
    } else {
      res = await createSession(payload);
    }

    setIsLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      alert("Erreur lors de l'enregistrement : " + res.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-1">

        {/* SECTION 1: CLIENT ET CONTACT */}
        <div className={cn(
          "p-4 md:p-5 rounded-2xl border space-y-4 transition-colors",
          isLight 
            ? "bg-white border-[#e5dfd3] shadow-sm" 
            : "bg-[#1b1714] border-[#332b22] shadow-inner"
        )}>
          <div className={cn(
            "flex items-center justify-between flex-wrap gap-2 border-b pb-3",
            isLight ? "border-[#ece6dc]" : "border-[#26201a]"
          )}>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center",
                isLight ? "bg-[#c69f68]/20 text-[#966f36]" : "bg-[#c69f68]/20 text-[#c69f68]"
              )}>
                1
              </span>
              <h4 className={cn(
                "text-xs font-bold uppercase tracking-wider",
                isLight ? "text-[#241d17]" : "text-[#e4decb]"
              )}>
                Client & Coordonnées
              </h4>
            </div>

            {/* Mode Switcher: Existing vs New */}
            {!isEditing && (
              <div className={cn(
                "flex items-center p-0.5 rounded-xl border",
                isLight ? "bg-[#f2ece2] border-[#ded5c6]" : "bg-[#110f0d] border-[#2b251f]"
              )}>
                <button
                  type="button"
                  onClick={() => {
                    setClientMode('existing');
                    setShowClientDropdown(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    clientMode === 'existing'
                      ? isLight 
                        ? "bg-[#c69f68] text-white shadow-sm font-bold" 
                        : "bg-[#25201b] text-[#c69f68] shadow-sm border border-[#c69f68]/30 font-bold"
                      : isLight 
                        ? "text-[#70665a] hover:text-[#1c1815]" 
                        : "text-[#70665a] hover:text-[#a89f91]"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.existingClientTab} ({existingClients.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientMode('new');
                    setSelectedClient(null);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    clientMode === 'new'
                      ? isLight 
                        ? "bg-[#c69f68] text-white shadow-sm font-bold" 
                        : "bg-[#25201b] text-[#c69f68] shadow-sm border border-[#c69f68]/30 font-bold"
                      : isLight 
                        ? "text-[#70665a] hover:text-[#1c1815]" 
                        : "text-[#70665a] hover:text-[#a89f91]"
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.newClientTab}</span>
                </button>
              </div>
            )}
          </div>

          {/* MODE: ASSIGN EXISTING CLIENT */}
          {clientMode === 'existing' && !isEditing && (
            <div className="space-y-3">
              {selectedClient ? (
                /* Card of already selected client */
                <div className={cn(
                  "p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200",
                  isLight 
                    ? "bg-[#f9f6f0] border-[#c69f68]/60 text-[#1c1815]" 
                    : "bg-[#201c17] border-[#c69f68]/40 text-[#f5f2eb]"
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center font-serif font-bold text-sm shrink-0",
                      isLight 
                        ? "bg-[#ede6d8] border-[#c69f68]/50 text-[#966f36]" 
                        : "bg-gradient-to-br from-[#c69f68]/30 to-[#1c1815] border-[#c69f68]/50 text-[#c69f68]"
                    )}>
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">
                          {selectedClient.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>{t.assignedBadge}</span>
                        </span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-3 text-xs mt-0.5 truncate",
                        isLight ? "text-[#70665a]" : "text-[#8c7a6b]"
                      )}>
                        {selectedClient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#c69f68]" />
                            {selectedClient.phone}
                          </span>
                        )}
                        {selectedClient.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-[#c69f68]" />
                            {selectedClient.email}
                          </span>
                        )}
                        <span className="text-[11px] opacity-75">
                          • {selectedClient.sessionCount} {t.sessionsPlural}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelectedClient}
                    className={cn(
                      "p-1.5 rounded-lg border text-xs font-semibold transition-colors shrink-0 cursor-pointer",
                      isLight 
                        ? "bg-[#eee8dc] hover:bg-[#e4dcce] text-[#70665a] border-[#d8cca8]" 
                        : "bg-[#25201b] hover:bg-[#322a24] text-[#a89f91] border-[#3d332a]"
                    )}
                    title={t.changeSessionBtn}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Search Box & Dropdown */
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c69f68]" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder={t.searchClientPlaceholder}
                      className={cn(
                        "w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs outline-none transition-all",
                        isLight 
                          ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] placeholder:text-[#998f82] focus:border-[#c69f68] focus:bg-white" 
                          : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] placeholder:text-[#5c5348] focus:border-[#c69f68]"
                      )}
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setClientSearchQuery('')}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2",
                          isLight ? "text-[#8c7a6b] hover:text-[#1c1815]" : "text-[#70665a] hover:text-[#f5f2eb]"
                        )}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown list */}
                  {showClientDropdown && (
                    <div 
                      className={cn(
                        "absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto rounded-xl border shadow-2xl p-1.5 space-y-1",
                        isLight 
                          ? "bg-white border-[#ded5c6] text-[#1c1815]" 
                          : "bg-[#181411] border-[#382f25] text-[#f5f2eb]"
                      )}
                    >
                      <div className={cn(
                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-b",
                        isLight ? "border-[#ece6dc] text-[#70665a]" : "border-[#241f1a] text-[#70665a]"
                      )}>
                        <span>{t.clientSuggestions} ({filteredClients.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowClientDropdown(false)}
                          className="hover:underline cursor-pointer"
                        >
                          ✕ {t.closeSuggestions}
                        </button>
                      </div>

                      {loadingClients ? (
                        <div className="py-6 text-center text-xs text-[#70665a] flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#c69f68]" />
                          <span>{t.loadingText}</span>
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className="py-6 text-center space-y-2">
                          <p className="text-xs text-[#70665a]">{t.noClientFound} "{clientSearchQuery}".</p>
                          <button
                            type="button"
                            onClick={() => {
                              form.setValue('client_name', clientSearchQuery);
                              setClientMode('new');
                              setShowClientDropdown(false);
                            }}
                            className="text-xs text-[#966f36] dark:text-[#c69f68] hover:underline font-semibold"
                          >
                            {t.createAsNewClientBtn}
                          </button>
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <div
                            key={client.name}
                            onClick={() => handleSelectClient(client)}
                            className={cn(
                              "p-2.5 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-colors",
                              isLight 
                                ? "hover:bg-[#f6f2e9] border-transparent hover:border-[#c69f68]/40" 
                                : "hover:bg-[#221d18] border-transparent hover:border-[#c69f68]/30"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0",
                                isLight 
                                  ? "bg-[#ede6d8] border-[#dcd2be] text-[#966f36]" 
                                  : "bg-[#201c18] border-[#382f25] text-[#c69f68]"
                              )}>
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">
                                  {client.name}
                                </div>
                                <div className={cn(
                                  "flex items-center gap-2 text-[11px] truncate",
                                  isLight ? "text-[#70665a]" : "text-[#8c7a6b]"
                                )}>
                                  {client.phone && <span>{client.phone}</span>}
                                  {client.email && <span>• {client.email}</span>}
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0",
                              isLight 
                                ? "bg-[#f2ece2] text-[#806132] border-[#ded5c6]" 
                                : "bg-[#201c18] text-[#c69f68] border-[#382f25]"
                            )}>
                              {client.sessionCount} projet{client.sessionCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {!selectedClient && (
                    <p className={cn(
                      "text-[11px] italic pl-1 mt-1",
                      isLight ? "text-[#8c7a6b]" : "text-[#70665a]"
                    )}>
                      {t.selectClientHelper}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE: CREATE NEW CLIENT (or EDIT MODE) */}
          {(clientMode === 'new' || isEditing) && (
            <div className="space-y-3">
              {/* Duplicate Client Detected Alert */}
              {duplicateSuggestion && !isEditing && (
                <div className={cn(
                  "p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200",
                  isLight 
                    ? "bg-amber-50 border-amber-300 text-amber-900" 
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">
                      {t.existingClientAlert} <strong className={isLight ? "text-amber-950 font-bold" : "text-white"}>{duplicateSuggestion.name}</strong> ({duplicateSuggestion.sessionCount} {t.sessionsPlural})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectClient(duplicateSuggestion);
                      setClientMode('existing');
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer border",
                      isLight 
                        ? "bg-amber-200 hover:bg-amber-300 text-amber-900 border-amber-400" 
                        : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40"
                    )}
                  >
                    {t.assignBtn}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <FormField
                  control={form.control}
                  name="client_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(
                        "text-xs font-semibold",
                        isLight ? "text-[#382f26]" : "text-[#a89f91]"
                      )}>
                        Nom Complet du Client *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c69f68]" />
                          <Input 
                            placeholder="Ex. Sarah Benali" 
                            className={cn(
                              "pl-9 text-xs focus:border-[#c69f68]",
                              isLight 
                                ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] placeholder:text-[#998f82] focus:bg-white" 
                                : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] placeholder:text-[#5c5348]"
                            )} 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(
                        "text-xs font-semibold",
                        isLight ? "text-[#382f26]" : "text-[#a89f91]"
                      )}>
                        Téléphone (WhatsApp)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c69f68]" />
                          <Input 
                            placeholder="+212 600-000000" 
                            className={cn(
                              "pl-9 text-xs focus:border-[#c69f68]",
                              isLight 
                                ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] placeholder:text-[#998f82] focus:bg-white" 
                                : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] placeholder:text-[#5c5348]"
                            )} 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-500" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="client_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(
                      "text-xs font-semibold",
                      isLight ? "text-[#382f26]" : "text-[#a89f91]"
                    )}>
                      Adresse Email (optionnelle)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c69f68]" />
                        <Input 
                          type="email" 
                          placeholder="client@exemple.com" 
                          className={cn(
                            "pl-9 text-xs focus:border-[#c69f68]",
                            isLight 
                              ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] placeholder:text-[#998f82] focus:bg-white" 
                              : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] placeholder:text-[#5c5348]"
                          )} 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />

              {!isEditing && form.watch('client_email') && (
                <div className={cn(
                  "p-3 rounded-xl border flex items-center justify-between text-xs gap-3 animate-in fade-in duration-200",
                  isLight 
                    ? "bg-[#fcfaf6] border-[#e6dfcf] text-[#3d3328]" 
                    : "bg-[#181512] border-[#2e261f] text-[#d6cdbe]"
                )}>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-[#c69f68] shrink-0" />
                    <div>
                      <span className="font-semibold block">
                        {(WELCOME_CHECKBOX_I18N[language as keyof typeof WELCOME_CHECKBOX_I18N] || WELCOME_CHECKBOX_I18N.fr).title}
                      </span>
                      <span className="text-[11px] opacity-75">
                        {(WELCOME_CHECKBOX_I18N[language as keyof typeof WELCOME_CHECKBOX_I18N] || WELCOME_CHECKBOX_I18N.fr).subtitle}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendWelcomeEmail}
                    onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-[#c69f68] focus:ring-[#c69f68] cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: DÉTAILS DE LA SÉANCE */}
        <div className={cn(
          "p-4 md:p-5 rounded-2xl border space-y-4 transition-colors",
          isLight 
            ? "bg-white border-[#e5dfd3] shadow-sm" 
            : "bg-[#1b1714] border-[#332b22] shadow-inner"
        )}>
          <div className={cn(
            "flex items-center gap-2 border-b pb-3",
            isLight ? "border-[#ece6dc]" : "border-[#26201a]"
          )}>
            <span className={cn(
              "w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center",
              isLight ? "bg-[#c69f68]/20 text-[#966f36]" : "bg-[#c69f68]/20 text-[#c69f68]"
            )}>
              2
            </span>
            <h4 className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isLight ? "text-[#241d17]" : "text-[#e4decb]"
            )}>
              Séance & Planning
            </h4>
          </div>

          {/* Session Type Pill Switcher */}
          <div className="space-y-1.5">
            <label className={cn(
              "text-xs font-semibold block",
              isLight ? "text-[#382f26]" : "text-[#a89f91]"
            )}>
              Type de Prestation *
            </label>
            <div className={cn(
              "grid grid-cols-2 gap-2 p-1 rounded-xl border",
              isLight ? "bg-[#f2ece2] border-[#ded5c6]" : "bg-[#110f0d] border-[#28211b]"
            )}>
              <button
                type="button"
                onClick={() => form.setValue('session_type', 'photo', { shouldDirty: true, shouldValidate: true })}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  form.watch('session_type') === 'photo'
                    ? "bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] shadow-md scale-[1.01]"
                    : isLight 
                      ? "text-[#70665a] hover:text-[#1c1815] hover:bg-[#e6dece]" 
                      : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#1a1714]"
                )}
              >
                <Camera className="w-4 h-4" />
                <span>Séance Photo</span>
              </button>
              <button
                type="button"
                onClick={() => form.setValue('session_type', 'video', { shouldDirty: true, shouldValidate: true })}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  form.watch('session_type') === 'video'
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md scale-[1.01]"
                    : isLight 
                      ? "text-[#70665a] hover:text-[#1c1815] hover:bg-[#e6dece]" 
                      : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#1a1714]"
                )}
              >
                <Film className="w-4 h-4" />
                <span>Tournage Vidéo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Session Date */}
            <FormField
              control={form.control}
              name="session_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-xs font-semibold",
                    isLight ? "text-[#382f26]" : "text-[#a89f91]"
                  )}>
                    Date de la Séance *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c69f68]" />
                      <Input 
                        type="date" 
                        className={cn(
                          "pl-9 text-xs focus:border-[#c69f68]",
                          isLight 
                            ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] focus:bg-white" 
                            : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb]"
                        )} 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-xs font-semibold",
                    isLight ? "text-[#382f26]" : "text-[#a89f91]"
                  )}>
                    {t.categoryLabel || "Catégorie Principale"} *
                  </FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        // Limpiar subcategoría cuando cambia la categoría principal
                        form.setValue('subcategory', '', { shouldDirty: true });
                      }}
                      className={cn(
                        "w-full h-9 px-3 rounded-xl border text-xs outline-none",
                        isLight 
                          ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] focus:border-[#c69f68]" 
                          : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] focus:border-[#c69f68]"
                      )}
                    >
                      {dbCategories.length > 0 ? (
                        <>
                          {dbCategories.map(c => {
                            const label = language === 'fr' && c.name_fr ? c.name_fr 
                              : language === 'en' && c.name_en ? c.name_en 
                              : language === 'ar' && c.name_ar ? c.name_ar 
                              : c.name;
                            return (
                              <option 
                                key={c.slug} 
                                value={c.slug} 
                                className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                              >
                                {label}
                              </option>
                            );
                          })}
                          {field.value && !dbCategories.some(c => c.slug === field.value) && (
                            <option 
                              value={field.value} 
                              className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                            >
                              {field.value}
                            </option>
                          )}
                        </>
                      ) : (
                        <>
                          {CATEGORIES.map(c => (
                            <option 
                              key={c.value} 
                              value={c.value} 
                              className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                            >
                              {c.label}
                            </option>
                          ))}
                          {field.value && !CATEGORIES.some(c => c.value === field.value) && (
                            <option 
                              value={field.value} 
                              className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                            >
                              {field.value}
                            </option>
                          )}
                        </>
                      )}
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />
          </div>

          {/* Subcategory (Se muestra si la categoría activa tiene subcategorías en la BD) */}
          {(activeSubcategories.length > 0 || (dbCategories.length === 0 && form.watch('category') === 'portrait') || form.watch('subcategory')) && (
            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem className="animate-in fade-in duration-200">
                  <FormLabel className={cn(
                    "text-xs font-semibold",
                    isLight ? "text-[#382f26]" : "text-[#a89f91]"
                  )}>
                    {t.subCategoryLabel || "Sous-catégorie / Thème"}
                  </FormLabel>
                  <FormControl>
                    <select
                      value={field.value || ''}
                      onChange={field.onChange}
                      className={cn(
                        "w-full h-9 px-3 rounded-xl border text-xs outline-none",
                        isLight 
                          ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] focus:border-[#c69f68]" 
                          : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] focus:border-[#c69f68]"
                      )}
                    >
                      <option value="" className={isLight ? "bg-white text-[#70665a]" : "bg-[#141210] text-[#70665a]"}>
                        -- {t.selectSubCategory || "Sélectionner sous-catégorie (optionnel)"} --
                      </option>
                      {activeSubcategories.length > 0 ? (
                        <>
                          {activeSubcategories.map(s => {
                            const subLabel = language === 'fr' && s.name_fr ? s.name_fr 
                              : language === 'en' && s.name_en ? s.name_en 
                              : language === 'ar' && s.name_ar ? s.name_ar 
                              : s.name;
                            return (
                              <option 
                                key={s.slug} 
                                value={s.slug} 
                                className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                              >
                                {subLabel}
                              </option>
                            );
                          })}
                          {field.value && !activeSubcategories.some(s => s.slug === field.value) && (
                            <option 
                              value={field.value} 
                              className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                            >
                              {field.value}
                            </option>
                          )}
                        </>
                      ) : (
                        <>
                          {SUBCATEGORIES_PORTRAIT.map(s => (
                            <option 
                              key={s.value} 
                              value={s.value} 
                              className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                            >
                              {s.label}
                            </option>
                          ))}
                          {field.value && !SUBCATEGORIES_PORTRAIT.some(s => s.value === field.value) && (
                            <option 
                              value={field.value} 
                              className={isLight ? "bg-white text-[#1c1815]" : "bg-[#141210] text-[#f5f2eb]"}
                            >
                              {field.value}
                            </option>
                          )}
                        </>
                      )}
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* SECTION 3: PRODUCTION ET ACCÈS */}
        <div className={cn(
          "p-4 md:p-5 rounded-2xl border space-y-4 transition-colors",
          isLight 
            ? "bg-white border-[#e5dfd3] shadow-sm" 
            : "bg-[#1b1714] border-[#332b22] shadow-inner"
        )}>
          <div className={cn(
            "flex items-center gap-2 border-b pb-3",
            isLight ? "border-[#ece6dc]" : "border-[#26201a]"
          )}>
            <span className={cn(
              "w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center",
              isLight ? "bg-[#c69f68]/20 text-[#966f36]" : "bg-[#c69f68]/20 text-[#c69f68]"
            )}>
              3
            </span>
            <h4 className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isLight ? "text-[#241d17]" : "text-[#e4decb]"
            )}>
              Statut, Accès Portail & Notes
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Status Select */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-xs font-semibold",
                    isLight ? "text-[#382f26]" : "text-[#a89f91]"
                  )}>
                    Statut de Production
                  </FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className={cn(
                        "w-full h-9 px-3 rounded-xl border text-xs outline-none",
                        isLight 
                          ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] focus:border-[#c69f68]" 
                          : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] focus:border-[#c69f68]"
                      )}
                    >
                      <option value="pending">🟡 En attente / Planifié</option>
                      <option value="shooting">🟣 En séance / Tournage</option>
                      <option value="edited">🔵 Prêt pour sélection / Livraison</option>
                      <option value="delivered">🟢 Livré & Archivé</option>
                      <option value="archived">⚪ Archivé</option>
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />

            {/* Portal PIN with 1-Click Generator */}
            <FormField
              control={form.control}
              name="portal_pin"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className={cn(
                      "text-xs font-semibold",
                      isLight ? "text-[#382f26]" : "text-[#a89f91]"
                    )}>
                      Code PIN Portail Client
                    </FormLabel>
                    {pinGeneratedBadge && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                        <Check className="w-3 h-3" /> PIN Généré
                      </span>
                    )}
                  </div>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c69f68]" />
                        <Input 
                          placeholder="Ex. 4892" 
                          maxLength={6}
                          className={cn(
                            "pl-9 font-mono tracking-widest text-xs focus:border-[#c69f68]",
                            isLight 
                              ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] focus:bg-white" 
                              : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb]"
                          )} 
                          {...field} 
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGeneratePin}
                        title="Générer un code PIN aléatoire"
                        className={cn(
                          "px-3 h-9 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                          isLight 
                            ? "bg-[#f2ece2] hover:bg-[#e6dece] text-[#806132] border-[#ded5c6]" 
                            : "bg-[#201c18] hover:bg-[#2b251f] text-[#c69f68] border-[#c69f68]/30"
                        )}
                      >
                        <Dices className="w-4 h-4 text-[#c69f68]" />
                        <span>Générer</span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />
          </div>

          {/* Tags with Quick Chips */}
          <div className="space-y-1.5">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-xs font-semibold",
                    isLight ? "text-[#382f26]" : "text-[#a89f91]"
                  )}>
                    Tags & Mots-clés (séparés par des virgules)
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c69f68]" />
                      <Input 
                        placeholder="mariage, urgent, album, reel..." 
                        className={cn(
                          "pl-9 text-xs focus:border-[#c69f68]",
                          isLight 
                            ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] focus:bg-white" 
                            : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb]"
                        )} 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className={cn(
                "text-[10px] uppercase font-bold tracking-wider mr-1",
                isLight ? "text-[#8c7a6b]" : "text-[#70665a]"
              )}>
                Suggestions :
              </span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className={cn(
                    "px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-colors cursor-pointer",
                    isLight 
                      ? "bg-[#f4efe5] hover:bg-[#e8e0d0] text-[#7d5f30] border-[#dcd0bc]" 
                      : "bg-[#1d1915] hover:bg-[#27211b] text-[#c69f68] border-[#382f25]"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comments / Consignes */}
          <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(
                  "text-xs font-semibold",
                  isLight ? "text-[#382f26]" : "text-[#a89f91]"
                )}>
                  Remarques & Consignes Particulières
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8c7a6b]" />
                    <textarea
                      rows={2}
                      placeholder="Demandes spécifiques du client, tenues, consignes d'édition..."
                      className={cn(
                        "w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none resize-none transition-all",
                        isLight 
                          ? "bg-[#fcfbf9] border-[#d4cbba] text-[#1c1815] placeholder:text-[#998f82] focus:border-[#c69f68] focus:bg-white" 
                          : "bg-[#110f0d] border-[#2e261f] text-[#f5f2eb] placeholder:text-[#554c42] focus:border-[#c69f68]"
                      )}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-rose-500" />
              </FormItem>
            )}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] hover:opacity-95 text-[#0b0a09] font-serif font-bold text-sm shadow-lg shadow-[#c69f68]/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0b0a09]" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-[#0b0a09]" />
                <span>{initialData?.id ? "Enregistrer les Modifications" : "Créer le Projet & Enregistrer"}</span>
              </>
            )}
          </button>
        </div>

      </form>
    </Form>
  );
}
