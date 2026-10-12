"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { addMediaAsset } from "@/app/actions"

const SAMPLE_PRESETS = [
  { name: "Velo Novia", url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85", filename: "LMH_Novia_Velo.jpg" },
  { name: "Alianzas", url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=85", filename: "LMH_Alianzas_Lino.jpg" },
  { name: "Retrato Dorado", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=85", filename: "LMH_Retrato_Luz.jpg" },
]

const formSchema = z.object({
  filename: z.string().min(1, "El nombre del archivo es obligatorio"),
  preview_url: z.string().url("Debe ser una URL válida (http/https)"),
  nas_path: z.string().optional().or(z.literal('')),
})

export function MediaAssetForm({ sessionId }: { sessionId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filename: "",
      preview_url: "",
      nas_path: "/volume1/Lamha_NAS/Sesiones_2026/",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    const res = await addMediaAsset({
      session_id: sessionId,
      asset_type: 'jpg',
      filename: values.filename,
      preview_url: values.preview_url,
      nas_path: values.nas_path || "/volume1/Lamha_NAS/Sesiones_2026/",
    })

    setIsLoading(false)
    if (res.success) {
      form.reset({
        filename: "",
        preview_url: "",
        nas_path: "/volume1/Lamha_NAS/Sesiones_2026/",
      })
    } else {
      alert("Error al añadir la foto: " + res.error)
    }
  }

  const applyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    form.setValue("filename", preset.filename)
    form.setValue("preview_url", preset.url)
  }

  return (
    <div className="space-y-4">
      {/* Quick sample presets */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-[#70665a] font-semibold block mb-2">
          Fotos de Muestra de Autor
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 rounded-lg bg-[#1a1612] hover:bg-[#25201b] border border-[#29241f] hover:border-[#c69f68]/40 text-[11px] text-[#c69f68] transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 text-xs">
          <FormField
            control={form.control}
            name="filename"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-[#a89f91]">Nombre del Archivo Master</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="LMH_0101_Master.jpg" 
                    {...field} 
                    className="bg-[#181613] border-[#29241f] text-xs text-[#f5f2eb] focus:border-[#c69f68]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preview_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-[#a89f91]">URL de Previsualización (Web / CDN)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://images.unsplash.com/..." 
                    {...field} 
                    className="bg-[#181613] border-[#29241f] text-xs text-[#f5f2eb] focus:border-[#c69f68]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-[#c69f68] hover:bg-[#b89058] text-[#0b0a09] font-semibold text-xs py-2 rounded-xl transition-all shadow-md mt-2" 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Catalogar en Espace Privé
          </Button>
        </form>
      </Form>
    </div>
  )
}
