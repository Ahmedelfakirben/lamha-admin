"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { 
  FolderTree, 
  Plus, 
  Image as ImageIcon, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Upload, 
  Star, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { Category, Subcategory, CategoryMedia } from "@/types/database"
import Image from "next/image"

export default function CategoriesPage() {
  const { t, language } = useLanguage()
  const isRTL = language === 'ar'
  const supabase = createClient()

  // Data states
  const [categories, setCategories] = useState<Category[]>([])
  const [mediaList, setMediaList] = useState<CategoryMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)

  // Expanded categories accordion state
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  // Dialog / Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    name_fr: "",
    name_en: "",
    name_ar: "",
    slug: "",
    description: "",
    display_order: 0,
    is_active: true
  })

  // Subcategory modal
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false)
  const [parentCategoryForSub, setParentCategoryForSub] = useState<Category | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [subcategoryForm, setSubcategoryForm] = useState({
    name: "",
    name_fr: "",
    name_en: "",
    name_ar: "",
    slug: "",
    description: "",
    display_order: 0,
    is_active: true
  })

  // Photo gallery modal / drawer
  const [activePhotoTarget, setActivePhotoTarget] = useState<{
    category: Category
    subcategory?: Subcategory
  } | null>(null)

  // Feedback message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load all categories, subcategories, and media
  async function loadData() {
    setLoading(true)
    try {
      // 1. Fetch categories with subcategories
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*, subcategories(*)")
        .order("display_order", { ascending: true })

      if (catError) throw catError

      // 2. Fetch media items
      const { data: mData, error: mError } = await supabase
        .from("category_media")
        .select("*")
        .order("display_order", { ascending: true })

      if (mError) {
        console.warn("Could not load category_media:", mError.message)
      }

      setCategories(catData || [])
      setMediaList(mData || [])
      
      // Auto expand first category if none expanded
      if (catData && catData.length > 0 && !expandedCategoryId) {
        setExpandedCategoryId(catData[0].id)
      }
    } catch (err: any) {
      console.error("Error loading categories:", err)
      setStatusMessage({ type: 'error', text: err.message || "Error al cargar categorías" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto generate slug from name
  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Open Category Create/Edit Modal
  function handleOpenCategoryModal(category?: Category) {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name || "",
        name_fr: category.name_fr || "",
        name_en: category.name_en || "",
        name_ar: category.name_ar || "",
        slug: category.slug || "",
        description: category.description || "",
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        name: "",
        name_fr: "",
        name_en: "",
        name_ar: "",
        slug: "",
        description: "",
        display_order: categories.length + 1,
        is_active: true
      })
    }
    setIsCategoryModalOpen(true)
  }

  // Save Category
  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryForm.name.trim()) return

    setSavingCategory(true)
    const slug = categoryForm.slug.trim() || generateSlug(categoryForm.name)

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: categoryForm.name.trim(),
            name_fr: categoryForm.name_fr.trim() || null,
            name_en: categoryForm.name_en.trim() || null,
            name_ar: categoryForm.name_ar.trim() || null,
            slug: slug,
            description: categoryForm.description.trim() || null,
            display_order: Number(categoryForm.display_order) || 0,
            is_active: categoryForm.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingCategory.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{
            name: categoryForm.name.trim(),
            name_fr: categoryForm.name_fr.trim() || null,
            name_en: categoryForm.name_en.trim() || null,
            name_ar: categoryForm.name_ar.trim() || null,
            slug: slug,
            description: categoryForm.description.trim() || null,
            display_order: Number(categoryForm.display_order) || 0,
            is_active: categoryForm.is_active
          }])

        if (error) throw error
      }

      setIsCategoryModalOpen(false)
      setStatusMessage({ type: 'success', text: "Categoría guardada correctamente." })
      setTimeout(() => setStatusMessage(null), 4000)
      loadData()
    } catch (err: any) {
      console.error("Error saving category:", err)
      setStatusMessage({ type: 'error', text: err.message || "Error al guardar categoría" })
    } finally {
      setSavingCategory(false)
    }
  }

  // Delete Category
  async function handleDeleteCategory(category: Category) {
    if (!window.confirm(t.confirmDeleteCategory)) return

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id)

      if (error) throw error
      setStatusMessage({ type: 'success', text: "Categoría eliminada." })
      setTimeout(() => setStatusMessage(null), 3000)
      loadData()
    } catch (err: any) {
      alert("Error al eliminar categoría: " + err.message)
    }
  }

  // Open Subcategory Modal
  function handleOpenSubcategoryModal(parentCat: Category, sub?: Subcategory) {
    setParentCategoryForSub(parentCat)
    if (sub) {
      setEditingSubcategory(sub)
      setSubcategoryForm({
        name: sub.name || "",
        name_fr: sub.name_fr || "",
        name_en: sub.name_en || "",
        name_ar: sub.name_ar || "",
        slug: sub.slug || "",
        description: sub.description || "",
        display_order: sub.display_order || 0,
        is_active: sub.is_active ?? true
      })
    } else {
      setEditingSubcategory(null)
      const currentSubs = parentCat.subcategories || []
      setSubcategoryForm({
        name: "",
        name_fr: "",
        name_en: "",
        name_ar: "",
        slug: "",
        description: "",
        display_order: currentSubs.length + 1,
        is_active: true
      })
    }
    setIsSubcategoryModalOpen(true)
  }

  // Save Subcategory
  async function handleSaveSubcategory(e: React.FormEvent) {
    e.preventDefault()
    if (!parentCategoryForSub || !subcategoryForm.name.trim()) return

    setSavingCategory(true)
    const slug = subcategoryForm.slug.trim() || generateSlug(subcategoryForm.name)

    try {
      if (editingSubcategory) {
        const { error } = await supabase
          .from("subcategories")
          .update({
            name: subcategoryForm.name.trim(),
            name_fr: subcategoryForm.name_fr.trim() || null,
            name_en: subcategoryForm.name_en.trim() || null,
            name_ar: subcategoryForm.name_ar.trim() || null,
            slug: slug,
            description: subcategoryForm.description.trim() || null,
            display_order: Number(subcategoryForm.display_order) || 0,
            is_active: subcategoryForm.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingSubcategory.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("subcategories")
          .insert([{
            category_id: parentCategoryForSub.id,
            name: subcategoryForm.name.trim(),
            name_fr: subcategoryForm.name_fr.trim() || null,
            name_en: subcategoryForm.name_en.trim() || null,
            name_ar: subcategoryForm.name_ar.trim() || null,
            slug: slug,
            description: subcategoryForm.description.trim() || null,
            display_order: Number(subcategoryForm.display_order) || 0,
            is_active: subcategoryForm.is_active
          }])

        if (error) throw error
      }

      setIsSubcategoryModalOpen(false)
      setStatusMessage({ type: 'success', text: "Subcategoría guardada correctamente." })
      setTimeout(() => setStatusMessage(null), 4000)
      loadData()
    } catch (err: any) {
      console.error("Error saving subcategory:", err)
      setStatusMessage({ type: 'error', text: err.message || "Error al guardar subcategoría" })
    } finally {
      setSavingCategory(false)
    }
  }

  // Delete Subcategory
  async function handleDeleteSubcategory(sub: Subcategory) {
    if (!window.confirm(t.confirmDeleteSubcategory)) return

    try {
      const { error } = await supabase
        .from("subcategories")
        .delete()
        .eq("id", sub.id)

      if (error) throw error
      setStatusMessage({ type: 'success', text: "Subcategoría eliminada." })
      setTimeout(() => setStatusMessage(null), 3000)
      loadData()
    } catch (err: any) {
      alert("Error al eliminar subcategoría: " + err.message)
    }
  }

  // Handle Photo Upload to Supabase Storage
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activePhotoTarget || !e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setUploading(true)

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `categories/${activePhotoTarget.category.slug}/${fileName}`

        // Upload to portfolio-media bucket
        const { error: uploadError } = await supabase.storage
          .from('portfolio-media')
          .upload(filePath, file, { cacheControl: '3600', upsert: true })

        if (uploadError) throw uploadError

        // Get Public URL
        const { data: urlData } = supabase.storage
          .from('portfolio-media')
          .getPublicUrl(filePath)

        const publicUrl = urlData.publicUrl

        // Insert into category_media table
        const { error: insertError } = await supabase
          .from('category_media')
          .insert([{
            category_id: activePhotoTarget.category.id,
            subcategory_id: activePhotoTarget.subcategory ? activePhotoTarget.subcategory.id : null,
            image_url: publicUrl,
            title: file.name.replace(/\.[^/.]+$/, ""),
            is_featured: false,
            display_order: 0
          }])

        if (insertError) throw insertError

        // If category has no cover_image_url, set it as cover
        if (!activePhotoTarget.category.cover_image_url) {
          await supabase
            .from('categories')
            .update({ cover_image_url: publicUrl })
            .eq('id', activePhotoTarget.category.id)
        }
      }

      setStatusMessage({ type: 'success', text: `${files.length} foto(s) subida(s) con éxito.` })
      setTimeout(() => setStatusMessage(null), 4000)
      loadData()
    } catch (err: any) {
      console.error("Error subiendo foto:", err)
      alert("Error al subir foto: " + (err.message || "Error de red/almacenamiento"))
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  // Set photo as category cover
  async function handleSetAsCover(imageUrl: string, categoryId: string) {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ cover_image_url: imageUrl })
        .eq('id', categoryId)

      if (error) throw error
      setStatusMessage({ type: 'success', text: "Portada de categoría actualizada." })
      setTimeout(() => setStatusMessage(null), 3000)
      loadData()
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  // Toggle Featured status for website
  async function handleToggleFeatured(mediaItem: CategoryMedia) {
    try {
      const { error } = await supabase
        .from('category_media')
        .update({ is_featured: !mediaItem.is_featured })
        .eq('id', mediaItem.id)

      if (error) throw error
      loadData()
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  // Delete Photo
  async function handleDeletePhoto(mediaItem: CategoryMedia) {
    if (!window.confirm("¿Deseas eliminar esta fotografía de la galería?")) return

    try {
      const { error } = await supabase
        .from('category_media')
        .delete()
        .eq('id', mediaItem.id)

      if (error) throw error
      setStatusMessage({ type: 'success', text: "Fotografía eliminada." })
      setTimeout(() => setStatusMessage(null), 3000)
      loadData()
    } catch (err: any) {
      alert("Error al eliminar foto: " + err.message)
    }
  }

  // Localized helper to get Category/Subcategory name
  function getLocalizedName(item: { name: string, name_fr?: string | null, name_en?: string | null, name_ar?: string | null }) {
    if (language === 'fr' && item.name_fr) return item.name_fr
    if (language === 'en' && item.name_en) return item.name_en
    if (language === 'ar' && item.name_ar) return item.name_ar
    return item.name
  }

  // Stats calculation
  const totalSubcategories = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0)
  }, [categories])

  const photosForActiveTarget = useMemo(() => {
    if (!activePhotoTarget) return []
    return mediaList.filter(m => {
      if (activePhotoTarget.subcategory) {
        return m.category_id === activePhotoTarget.category.id && m.subcategory_id === activePhotoTarget.subcategory.id
      }
      return m.category_id === activePhotoTarget.category.id
    })
  }, [activePhotoTarget, mediaList])

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26211c] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b1714] border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] shadow-inner">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#f5f2eb]">
                {t.categoriesTitle}
              </h1>
              <p className="text-xs md:text-sm text-[#8c7a6b]">
                {t.categoriesSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenCategoryModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.newCategoryBtn}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-300 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-stone-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#8c7a6b] uppercase tracking-wider">
              {t.categoriesMenu}
            </p>
            <h3 className="text-2xl font-bold text-[#f5f2eb] mt-1">{categories.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1c1815] border border-[#332b22] flex items-center justify-center text-[#c69f68]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#8c7a6b] uppercase tracking-wider">
              {t.subcategories}
            </p>
            <h3 className="text-2xl font-bold text-[#f5f2eb] mt-1">{totalSubcategories}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1c1815] border border-[#332b22] flex items-center justify-center text-[#c69f68]">
            <FolderTree className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#8c7a6b] uppercase tracking-wider">
              {t.categoryPhotos}
            </p>
            <h3 className="text-2xl font-bold text-[#f5f2eb] mt-1">{mediaList.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1c1815] border border-[#332b22] flex items-center justify-center text-[#c69f68]">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Categories List / Accordion */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#c69f68]" />
          <p className="text-xs text-[#8c7a6b]">{t.categoriesCatalogLoading}</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-20 text-center space-y-4 rounded-2xl border border-dashed border-[#332b22] bg-[#141210]/50 p-8">
          <FolderTree className="w-12 h-12 mx-auto text-[#5c5348]" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#f5f2eb]">{t.noCategoriesFound}</h3>
            <p className="text-xs text-[#8c7a6b] max-w-sm mx-auto">
              {t.categoriesEmptyHelp}
            </p>
          </div>
          <button
            onClick={() => handleOpenCategoryModal()}
            className="px-4 py-2 rounded-xl bg-[#c69f68] text-[#0b0a09] font-bold text-xs uppercase tracking-wider hover:brightness-110"
          >
            {t.newCategoryBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const isExpanded = expandedCategoryId === cat.id
            const catPhotos = mediaList.filter(m => m.category_id === cat.id)
            const subcategories = cat.subcategories || []

            return (
              <div 
                key={cat.id}
                className="rounded-2xl border border-[#26211c] bg-[#141210] overflow-hidden transition-all shadow-md hover:border-[#382f25]"
              >
                {/* Category Header Card */}
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Cover Thumbnail / Placeholder */}
                    <div 
                      onClick={() => {
                        setActivePhotoTarget({ category: cat })
                      }}
                      className="w-16 h-16 rounded-xl border border-[#332b22] bg-[#1b1714] shrink-0 overflow-hidden relative group cursor-pointer"
                      title={t.managePhotosTooltip}
                    >
                      {cat.cover_image_url ? (
                        <Image
                          src={cat.cover_image_url}
                          alt={cat.name}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#5c5348] group-hover:text-[#c69f68] transition-colors">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Category Titles */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base md:text-lg font-bold text-[#f5f2eb] truncate">
                          {getLocalizedName(cat)}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-[#241f1a] border border-[#3d332a] text-[10px] font-mono text-[#c69f68]">
                          slug: {cat.slug}
                        </span>
                        {!cat.is_active && (
                          <span className="px-2 py-0.5 rounded-md bg-stone-800 text-[10px] font-bold text-stone-400">
                            {t.inactiveBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8c7a6b] line-clamp-1">
                        {cat.description || t.noDescription}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#70665a]">
                        <span>{subcategories.length} {t.subcategories.toLowerCase()}</span>
                        <span>•</span>
                        <span>{catPhotos.length} {t.photosWord}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Controls */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setActivePhotoTarget({ category: cat })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#332b22] bg-[#1a1714] hover:bg-[#25201b] text-xs font-semibold text-[#c69f68] transition-colors cursor-pointer"
                      title={t.categoryPhotos}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.categoryPhotos}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-[#2a241e] text-[10px]">
                        {catPhotos.length}
                      </span>
                    </button>

                    <button
                      onClick={() => handleOpenSubcategoryModal(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c69f68]/40 bg-[#c69f68]/10 hover:bg-[#c69f68]/20 text-xs font-bold text-[#e4decb] transition-colors cursor-pointer"
                      title={t.newSubcategoryBtn}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.newSubcategoryBtn}</span>
                    </button>

                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="p-2 rounded-lg border border-[#332b22] bg-[#1a1714] hover:bg-[#25201b] text-[#8c7a6b] hover:text-[#f5f2eb] transition-colors cursor-pointer"
                      title={t.editCategory}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2 rounded-lg border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 transition-colors cursor-pointer"
                      title={t.deleteCategory}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      className="p-2 rounded-lg border border-[#332b22] bg-[#1a1714] text-[#8c7a6b] hover:text-[#f5f2eb] transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Subcategories Panel (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-[#26211c] bg-[#0e0c0b] p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1f1b17] pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a89f91]">
                        <FolderTree className="w-4 h-4 text-[#c69f68]" />
                        <span>{t.subcategoriesOf} {getLocalizedName(cat)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenSubcategoryModal(cat)}
                        className="text-xs text-[#c69f68] hover:underline font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addSubcategory || "Añadir"}</span>
                      </button>
                    </div>

                    {subcategories.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#70665a] italic">
                        {t.noSubcategoriesText}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subcategories.map((sub) => {
                          const subPhotos = mediaList.filter(
                            m => m.category_id === cat.id && m.subcategory_id === sub.id
                          )

                          return (
                            <div
                              key={sub.id}
                              className="p-3.5 rounded-xl border border-[#28211b] bg-[#141210] flex flex-col justify-between gap-3 hover:border-[#382f25] transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-xs font-bold text-[#f5f2eb] truncate">
                                    {getLocalizedName(sub)}
                                  </h4>
                                  <span className="text-[10px] font-mono text-[#8c7a6b]">
                                    {sub.slug}
                                  </span>
                                </div>
                                {sub.description && (
                                  <p className="text-[11px] text-[#70665a] line-clamp-1">
                                    {sub.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between border-t border-[#1f1b17] pt-2 text-[11px]">
                                <button
                                  onClick={() => setActivePhotoTarget({ category: cat, subcategory: sub })}
                                  className="text-[#c69f68] hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>{subPhotos.length} {t.photosWord}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenSubcategoryModal(cat, sub)}
                                    className="p-1 rounded text-[#8c7a6b] hover:text-[#f5f2eb]"
                                    title={t.editSubcategoryTooltip}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubcategory(sub)}
                                    className="p-1 rounded text-rose-500/80 hover:text-rose-400"
                                    title={t.deleteSubcategoryTooltip}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: NUEVA / EDITAR CATEGORÍA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#141210] border border-[#332b22] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#26211c] pb-4">
              <h3 className="text-base font-bold text-[#f5f2eb]">
                {editingCategory ? t.editCategory : t.newCategoryBtn}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#8c7a6b] hover:text-[#f5f2eb]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              {/* Main Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#c69f68]">
                    {t.categoryNameLabel} (Principal / ES) *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setCategoryForm(prev => ({
                        ...prev,
                        name,
                        slug: prev.slug ? prev.slug : generateSlug(name)
                      }))
                    }}
                    placeholder="Ej: Bodas"
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#8c7a6b]">
                    {t.slugLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: generateSlug(e.target.value) })}
                    placeholder="ej: wedding"
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] font-mono outline-none focus:border-[#c69f68]"
                  />
                </div>
              </div>

              {/* Multilingual Names */}
              <div className="p-3.5 rounded-xl border border-[#241f1a] bg-[#0d0c0a] space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c7a6b] block">
                  {t.nameTranslationsHelp}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#70665a]">Français (FR)</label>
                    <input
                      type="text"
                      value={categoryForm.name_fr}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name_fr: e.target.value })}
                      placeholder="Mariage"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141210] border border-[#28211b] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#70665a]">English (EN)</label>
                    <input
                      type="text"
                      value={categoryForm.name_en}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name_en: e.target.value })}
                      placeholder="Weddings"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141210] border border-[#28211b] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                    />
                  </div>

                  <div className="space-y-1" dir="rtl">
                    <label className="text-[11px] text-[#70665a]">العربية (AR)</label>
                    <input
                      type="text"
                      value={categoryForm.name_ar}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name_ar: e.target.value })}
                      placeholder="حفلات الزفاف"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141210] border border-[#28211b] text-[#f5f2eb] outline-none focus:border-[#c69f68] text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Description & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-[#8c7a6b]">{t.descriptionLabel}</label>
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Descripción editorial para el portfolio..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#8c7a6b]">{t.displayOrderLabel}</label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat_active"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                  className="rounded border-[#332b22] text-[#c69f68] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="cat_active" className="text-xs text-[#a89f91] cursor-pointer">
                  {t.categoryActiveLabel}
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[#26211c] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#332b22] text-[#8c7a6b] hover:text-[#f5f2eb]"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#c69f68] text-[#0b0a09] font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {savingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.saveChanges}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVA / EDITAR SUBCATEGORÍA */}
      {isSubcategoryModalOpen && parentCategoryForSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#141210] border border-[#332b22] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#26211c] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#f5f2eb]">
                  {editingSubcategory ? t.editSubcategory : t.newSubcategoryBtn}
                </h3>
                <p className="text-xs text-[#c69f68]">
                  {t.parentCategoryLabel}: {getLocalizedName(parentCategoryForSub)}
                </p>
              </div>
              <button
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="text-[#8c7a6b] hover:text-[#f5f2eb]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#c69f68]">
                    {t.subcategoryNameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={subcategoryForm.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setSubcategoryForm(prev => ({
                        ...prev,
                        name,
                        slug: prev.slug ? prev.slug : generateSlug(name)
                      }))
                    }}
                    placeholder="Ej: Fine Art / Pre-boda"
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#8c7a6b]">
                    {t.slugLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={subcategoryForm.slug}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, slug: generateSlug(e.target.value) })}
                    placeholder="ej: fine-art"
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] font-mono outline-none focus:border-[#c69f68]"
                  />
                </div>
              </div>

              {/* Multilingual Subcategory Names */}
              <div className="p-3 rounded-xl border border-[#241f1a] bg-[#0d0c0a] space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c7a6b] block">
                  {t.subNameTranslationsHelp}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={subcategoryForm.name_fr}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name_fr: e.target.value })}
                    placeholder="FR (ex: Épuré)"
                    className="px-2.5 py-1.5 rounded-lg bg-[#141210] border border-[#28211b] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                  />
                  <input
                    type="text"
                    value={subcategoryForm.name_en}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name_en: e.target.value })}
                    placeholder="EN (ex: Fine Art)"
                    className="px-2.5 py-1.5 rounded-lg bg-[#141210] border border-[#28211b] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    value={subcategoryForm.name_ar}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name_ar: e.target.value })}
                    placeholder="AR (مثال: فاين آرت)"
                    className="px-2.5 py-1.5 rounded-lg bg-[#141210] border border-[#28211b] text-[#f5f2eb] outline-none focus:border-[#c69f68] text-right"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#8c7a6b]">{t.descriptionLabel}</label>
                <input
                  type="text"
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  placeholder="Detalles sobre este estilo o tema..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#2b241e] text-[#f5f2eb] outline-none focus:border-[#c69f68]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#26211c] pt-4">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#332b22] text-[#8c7a6b] hover:text-[#f5f2eb]"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#c69f68] text-[#0b0a09] font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {savingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.saveChanges}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GESTOR DE FOTOS PARA CATEGORÍA O SUBCATEGORÍA */}
      {activePhotoTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#141210] border border-[#332b22] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-[#26211c] flex items-center justify-between gap-4 bg-[#110f0d]">
              <div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#c69f68]" />
                  <h3 className="text-base font-bold text-[#f5f2eb]">
                    {t.categoryPhotos}: {getLocalizedName(activePhotoTarget.category)}
                    {activePhotoTarget.subcategory && (
                      <span className="text-[#c69f68]"> / {getLocalizedName(activePhotoTarget.subcategory)}</span>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-[#8c7a6b] mt-0.5">
                  {t.uploadModalDesc}
                </p>
              </div>

              <button
                onClick={() => setActivePhotoTarget(null)}
                className="w-8 h-8 rounded-lg bg-[#1a1714] border border-[#2b241e] text-[#8c7a6b] hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body & Uploader */}
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
              {/* Upload Dropzone */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-[#332b22] hover:border-[#c69f68]/50 bg-[#0d0c0a] text-center space-y-3 transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="w-12 h-12 rounded-xl bg-[#1a1714] border border-[#332b22] text-[#c69f68] mx-auto flex items-center justify-center">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-bold text-[#f5f2eb]">
                    {uploading ? t.uploadingPhotos : t.uploadPhotosTitle}
                  </p>
                  <p className="text-[11px] text-[#70665a]">
                    {t.uploadFormatsHint}
                  </p>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#8c7a6b]">
                  <span>{t.photosWord.toUpperCase()} ({photosForActiveTarget.length})</span>
                  <span>{t.featuredPhotosHint}</span>
                </div>

                {photosForActiveTarget.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#5c5348] border border-[#241f1a] rounded-xl">
                    {t.noPhotosYet}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {photosForActiveTarget.map((media) => {
                      const isCover = activePhotoTarget.category.cover_image_url === media.image_url

                      return (
                        <div
                          key={media.id}
                          className="group relative rounded-xl border border-[#28211b] bg-[#0d0c0a] overflow-hidden aspect-[4/3] shadow-md"
                        >
                          <Image
                            src={media.image_url}
                            alt={media.title || "Foto"}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />

                          {/* Cover Badge */}
                          {isCover && (
                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#c69f68] text-[#0b0a09] font-bold text-[10px] shadow-lg flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{t.coverBadge}</span>
                            </div>
                          )}

                          {/* Featured on Web Badge */}
                          {media.is_featured && !isCover && (
                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-amber-500/80 text-black font-bold text-[10px] shadow-lg">
                              {t.featuredBadge}
                            </div>
                          )}

                          {/* Hover Controls Veil */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open original link */}
                              <a
                                href={media.image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-black/60 text-white hover:text-[#c69f68] text-xs"
                                title={t.viewFullScreen}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeletePhoto(media)}
                                className="p-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:text-white text-xs cursor-pointer"
                                title={t.deletePhotoTooltip}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <p className="text-[11px] text-white font-medium truncate">
                                {media.title || "—"}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {!isCover && (
                                  <button
                                    onClick={() => handleSetAsCover(media.image_url, activePhotoTarget.category.id)}
                                    className="flex-1 py-1 rounded bg-[#c69f68] text-[#0b0a09] font-bold text-[10px] hover:brightness-110 cursor-pointer"
                                  >
                                    {t.makeCoverBtn}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleFeatured(media)}
                                  className={`py-1 px-2 rounded text-[10px] font-bold cursor-pointer ${
                                    media.is_featured 
                                      ? "bg-stone-800 text-stone-300 hover:bg-stone-700" 
                                      : "bg-[#25201b] text-[#c69f68] hover:bg-[#322a24]"
                                  }`}
                                >
                                  {media.is_featured ? t.unfeatureBtn : t.featureBtn}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#26211c] bg-[#110f0d] flex items-center justify-between text-xs text-[#70665a]">
              <span>Almacenamiento: Supabase Storage (`portfolio-media`)</span>
              <button
                onClick={() => setActivePhotoTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#1c1815] border border-[#332b22] text-[#f5f2eb] hover:bg-[#25201b]"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
