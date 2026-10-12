'use client'

import { useState } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SessionForm } from './session-form';
import { Pencil, Plus, Sun, Moon } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { cn } from "@/lib/utils";

interface SessionDialogProps {
  session?: any;
  triggerType?: 'add' | 'edit';
  defaultType?: 'photo' | 'video';
  defaultDate?: string;
  customTrigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SessionDialog({ 
  session, 
  triggerType = 'add', 
  defaultType,
  defaultDate,
  customTrigger,
  onSuccess
}: SessionDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const initialData = session ? {
    ...session,
    folder_link: session.media_deliveries?.find((d: any) => d.delivery_type === 'folder_link')?.url || "",
    final_link: session.media_deliveries?.find((d: any) => d.delivery_type === 'final_link')?.url || ""
  } : { 
    session_type: defaultType || "photo",
    session_date: defaultDate || new Date().toISOString().split('T')[0]
  };

  const hasPresetValues = Boolean(session || defaultDate || defaultType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger ? (
        <DialogTrigger render={customTrigger as React.ReactElement} />
      ) : (
        <DialogTrigger
          className={
            triggerType === 'add'
              ? buttonVariants({ variant: 'default', size: 'default' })
              : "h-8 w-8 p-0 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#2e261f] hover:border-[#c69f68]/40 text-[#c69f68] inline-flex items-center justify-center transition-colors cursor-pointer"
          }
        >
          {triggerType === 'add' ? (
            <><Plus className="w-4 h-4 mr-2" /> {t.addSessionBtn}</>
          ) : (
            <Pencil className="h-3.5 w-3.5 text-[#c69f68]" />
          )}
        </DialogTrigger>
      )}
      <DialogContent className="w-[95vw] sm:max-w-[660px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl shadow-2xl bg-[#1c1814] border border-[#332a21] text-[#f5f2eb]">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-[#2e261f]">
          <DialogTitle className="text-xl font-serif font-bold text-[#f5f2eb] flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-[#25201b] text-[#c69f68] border border-[#c69f68]/30">
              {session ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </span>
            <span>{session ? t.editSessionTitle : t.createSessionTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8c7a6b]">
            {t.sessionDialogDesc}
          </DialogDescription>
        </DialogHeader>

        <SessionForm 
          theme="dark"
          initialData={hasPresetValues ? initialData : undefined}
          onSuccess={() => {
            setOpen(false);
            if (onSuccess) onSuccess();
          }} 
        />
      </DialogContent>
    </Dialog>
  );
}
