'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import { 
  sendWelcomeEmailNotification, 
  sendPhotosReadyNotification,
  sendReadyForDeliveryNotification,
  sendSelectionConfirmedNotification
} from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { 
  getWelcomeWhatsApp, 
  getPhotosReadyWhatsApp, 
  getReadyForDeliveryWhatsApp, 
  getSelectionReceivedClientWhatsApp, 
  getStudioSelectionAlertWhatsApp 
} from '@/lib/whatsapp-templates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export interface UserAuditContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export interface ExistingClientOption {
  id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  sessionCount: number;
}

export async function getExistingClients(): Promise<{ success: boolean; clients: ExistingClientOption[]; error?: string }> {
  try {
    const { data: sessionRows, error: sErr } = await supabase
      .from('sessions')
      .select('client_id, client_name, client_phone, client_email')
      .order('session_date', { ascending: false });

    if (sErr) throw sErr;

    let clientRows: any[] = [];
    try {
      const { data: cData } = await supabase.from('clients').select('id, name, phone, email');
      if (cData) clientRows = cData;
    } catch (e) {
      // Table might be empty or restricted
    }

    const clientMap = new Map<string, ExistingClientOption>();

    for (const c of clientRows) {
      if (!c.name) continue;
      const key = c.name.trim().toLowerCase();
      clientMap.set(key, {
        id: c.id,
        name: c.name.trim(),
        phone: c.phone || null,
        email: c.email || null,
        sessionCount: 0,
      });
    }

    for (const s of sessionRows || []) {
      if (!s.client_name) continue;
      const key = s.client_name.trim().toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          id: s.client_id || undefined,
          name: s.client_name.trim(),
          phone: s.client_phone || null,
          email: s.client_email || null,
          sessionCount: 1,
        });
      } else {
        const item = clientMap.get(key)!;
        item.sessionCount += 1;
        if (!item.phone && s.client_phone) item.phone = s.client_phone;
        if (!item.email && s.client_email) item.email = s.client_email;
        if (!item.id && s.client_id) item.id = s.client_id;
      }
    }

    const clientsList = Array.from(clientMap.values()).sort((a, b) => {
      if (b.sessionCount !== a.sessionCount) {
        return b.sessionCount - a.sessionCount;
      }
      return a.name.localeCompare(b.name);
    });

    return { success: true, clients: clientsList };
  } catch (error: any) {
    console.error('getExistingClients error:', error);
    return { success: false, clients: [], error: error.message };
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createSession(data: any, userContext?: UserAuditContext) {
  try {
    const { folder_link, final_link, sendWelcomeEmail, language, ...sessionData } = data;
    
    // Parse tags if provided as string
    if (typeof sessionData.tags === 'string') {
      sessionData.tags = sessionData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // Assign authorship if user context is provided
    if (userContext?.userId && UUID_REGEX.test(userContext.userId)) {
      sessionData.created_by = userContext.userId;
    }

    // Ensure client_id is a valid UUID or null (never empty string "")
    if (!sessionData.client_id || typeof sessionData.client_id !== 'string' || !UUID_REGEX.test(sessionData.client_id.trim())) {
      sessionData.client_id = null;
    } else {
      sessionData.client_id = sessionData.client_id.trim();
    }

    // Auto-link or register client in clients table if possible
    if (sessionData.client_name && !sessionData.client_id) {
      try {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', sessionData.client_name.trim())
          .maybeSingle();

        if (existingClient?.id && UUID_REGEX.test(existingClient.id)) {
          sessionData.client_id = existingClient.id;
        } else {
          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              name: sessionData.client_name.trim(),
              phone: sessionData.client_phone || null,
              email: sessionData.client_email || null,
              created_by: userContext?.userId || null,
            })
            .select('id')
            .maybeSingle();

          if (newClient?.id && UUID_REGEX.test(newClient.id)) {
            sessionData.client_id = newClient.id;
            
            // Record audit log for new client creation
            await recordAuditLog({
              action: 'CLIENT_CREATED',
              entityType: 'client',
              entityId: newClient.id,
              entityTitle: sessionData.client_name.trim(),
              details: { email: sessionData.client_email, phone: sessionData.client_phone },
              ...userContext,
            });
          }
        }
      } catch (err) {
        // Silently continue if clients table insert isn't permitted
      }
    }

    // Final safety check: client_id must be a valid UUID or null
    if (!sessionData.client_id || !UUID_REGEX.test(sessionData.client_id)) {
      sessionData.client_id = null;
    }

    // Normalize shooting_type and place tag
    const shootingType = sessionData.shooting_type === 'party' ? 'party' : 'shooting';
    sessionData.shooting_type = shootingType;
    const existingTags: string[] = Array.isArray(sessionData.tags) ? sessionData.tags : [];
    const cleanTags = existingTags.filter(t => !t.toLowerCase().startsWith('place:'));
    cleanTags.push(`place:${shootingType}`);
    sessionData.tags = cleanTags;

    let insertedSession: any = null;
    let { data: insData, error } = await supabase
      .from('sessions')
      .insert({ ...sessionData })
      .select()
      .single();

    if (error && (error.message?.includes('shooting_type') || error.details?.includes('shooting_type') || error.code === 'PGRST204')) {
      // Supabase migration might be pending; fallback without column while tags retain place info
      const { shooting_type, ...fallbackData } = sessionData;
      const retryRes = await supabase
        .from('sessions')
        .insert({ ...fallbackData })
        .select()
        .single();
      if (retryRes.error) throw retryRes.error;
      insertedSession = retryRes.data;
    } else if (error) {
      throw error;
    } else {
      insertedSession = insData;
    }

    // Registrar en auditoría estricta la creación del proyecto
    await recordAuditLog({
      action: 'SESSION_CREATED',
      entityType: 'session',
      entityId: insertedSession.id,
      entityTitle: insertedSession.client_name,
      details: {
        category: insertedSession.category,
        date: insertedSession.session_date,
        type: insertedSession.session_type,
        status: insertedSession.status,
      },
      ...userContext,
    });

    // Enviar correo cordial de bienvenida al cliente si tiene email
    if (insertedSession.client_email && sendWelcomeEmail !== false) {
      try {
        const emailRes = await sendWelcomeEmailNotification({
          clientName: insertedSession.client_name,
          clientEmail: insertedSession.client_email,
          sessionDate: insertedSession.session_date,
          category: insertedSession.category,
          sessionType: insertedSession.session_type,
          notes: insertedSession.comments,
          language: language || 'fr',
        });

        if (emailRes.success) {
          await recordAuditLog({
            action: 'EMAIL_WELCOME_SENT',
            entityType: 'session',
            entityId: insertedSession.id,
            entityTitle: insertedSession.client_name,
            details: {
              email: insertedSession.client_email,
              date: insertedSession.session_date,
              messageId: emailRes.messageId,
            },
            ...userContext,
          });
        }
      } catch (emailErr) {
        console.warn('Fallo no bloqueante al enviar correo de bienvenida:', emailErr);
      }
    }

    // Enviar WhatsApp automático de confirmación al cliente si tiene teléfono
    if (insertedSession.client_phone) {
      try {
        const text = getWelcomeWhatsApp({
          clientName: insertedSession.client_name,
          sessionDate: insertedSession.session_date,
          category: insertedSession.category,
          portalPin: insertedSession.portal_pin,
          clientEmail: insertedSession.client_email,
          language: language || 'fr',
        });

        await sendWhatsAppMessage({
          phone: insertedSession.client_phone,
          text,
          clientId: insertedSession.client_id || null,
          sessionId: insertedSession.id,
        });

        await recordAuditLog({
          action: 'WHATSAPP_WELCOME_SENT',
          entityType: 'session',
          entityId: insertedSession.id,
          entityTitle: insertedSession.client_name,
          details: {
            phone: insertedSession.client_phone,
            category: insertedSession.category,
            language: language || 'fr',
          },
          ...userContext,
        });
      } catch (waErr) {
        console.warn('Fallo no bloqueante al enviar WhatsApp de bienvenida:', waErr);
      }
    }

    if (folder_link) {
      try {
        await supabase.from('media_deliveries').insert({
          session_id: insertedSession.id,
          delivery_type: 'folder_link',
          url: folder_link,
          label: 'Google Drive RAW/Brutos',
          created_by: userContext?.userId || null,
        });
      } catch (errDelivery) {
        console.warn('Could not insert media_delivery folder_link:', errDelivery);
      }
    }

    if (final_link) {
      try {
        await supabase.from('media_deliveries').insert({
          session_id: insertedSession.id,
          delivery_type: 'final_link',
          url: final_link,
          label: 'Entrega Final',
          created_by: userContext?.userId || null,
        });
      } catch (errDelivery) {
        console.warn('Could not insert media_delivery final_link:', errDelivery);
      }
    }

    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/projects');
    revalidatePath('/clients');
    revalidatePath('/calendar');
    revalidatePath('/');
    
    return { success: true, sessionId: insertedSession.id };
  } catch (error: any) {
    console.error('Create session error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSession(id: string, data: any, userContext?: UserAuditContext) {
  try {
    const { folder_link, final_link, sendWelcomeEmail, language, ...sessionData } = data;
    
    if (typeof sessionData.tags === 'string') {
      sessionData.tags = sessionData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    if (userContext?.userId && UUID_REGEX.test(userContext.userId)) {
      sessionData.updated_by = userContext.userId;
    }

    if ('client_id' in sessionData) {
      if (!sessionData.client_id || typeof sessionData.client_id !== 'string' || !UUID_REGEX.test(sessionData.client_id.trim())) {
        sessionData.client_id = null;
      } else {
        sessionData.client_id = sessionData.client_id.trim();
      }
    }

    if (sessionData.shooting_type) {
      const shootingType = sessionData.shooting_type === 'party' ? 'party' : 'shooting';
      sessionData.shooting_type = shootingType;
      const existingTags: string[] = Array.isArray(sessionData.tags) ? sessionData.tags : [];
      const cleanTags = existingTags.filter(t => !t.toLowerCase().startsWith('place:'));
      cleanTags.push(`place:${shootingType}`);
      sessionData.tags = cleanTags;
    }

    let { error } = await supabase
      .from('sessions')
      .update({ ...sessionData })
      .eq('id', id);

    if (error && (error.message?.includes('shooting_type') || error.details?.includes('shooting_type') || error.code === 'PGRST204')) {
      const { shooting_type, ...fallbackData } = sessionData;
      const retry = await supabase
        .from('sessions')
        .update({ ...fallbackData })
        .eq('id', id);
      if (retry.error) throw retry.error;
    } else if (error) {
      throw error;
    }

    if (folder_link !== undefined) {
      try {
        const { data: existing } = await supabase
          .from('media_deliveries')
          .select('id')
          .eq('session_id', id)
          .eq('delivery_type', 'folder_link')
          .maybeSingle();
        if (existing) {
          if (folder_link) {
            await supabase.from('media_deliveries').update({ url: folder_link }).eq('id', existing.id);
          } else {
            await supabase.from('media_deliveries').delete().eq('id', existing.id);
          }
        } else if (folder_link) {
          await supabase.from('media_deliveries').insert({
            session_id: id,
            delivery_type: 'folder_link',
            url: folder_link,
            label: 'Carpeta Drive RAW',
          });
        }
      } catch (errDelivery) {
        console.warn('Could not update folder_link delivery:', errDelivery);
      }
    }

    if (final_link !== undefined) {
      try {
        const { data: existing } = await supabase
          .from('media_deliveries')
          .select('id')
          .eq('session_id', id)
          .eq('delivery_type', 'final_link')
          .maybeSingle();
        if (existing) {
          if (final_link) {
            await supabase.from('media_deliveries').update({ url: final_link }).eq('id', existing.id);
          } else {
            await supabase.from('media_deliveries').delete().eq('id', existing.id);
          }
        } else if (final_link) {
          await supabase.from('media_deliveries').insert({
            session_id: id,
            delivery_type: 'final_link',
            url: final_link,
            label: 'Entrega Final',
          });
        }
      } catch (errDelivery) {
        console.warn('Could not update final_link delivery:', errDelivery);
      }
    }

    // Trigger Automático: Si el proyecto pasa a "ready_delivery" o "edited", notificar al cliente (Email + WhatsApp)
    if (sessionData.status === 'ready_delivery' || sessionData.status === 'edited' || sessionData.pipeline_stage === 'ready_delivery') {
      try {
        await notifyReadyForDeliveryAction(id, userContext, language);
      } catch (notifyErr) {
        console.warn('Fallo no bloqueante al enviar notificación de Ready for Delivery:', notifyErr);
      }
    }

    // Registrar en auditoría estricta la actualización del proyecto
    await recordAuditLog({
      action: 'SESSION_UPDATED',
      entityType: 'session',
      entityId: id,
      entityTitle: sessionData.client_name || 'Proyecto',
      details: sessionData,
      ...userContext,
    });
    
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/projects');
    revalidatePath('/calendar');
    revalidatePath(`/sessions/${id}`);
    revalidatePath('/');
    
    return { success: true };
  } catch (error: any) {
    console.error('Update session error:', error);
    return { success: false, error: error.message };
  }
}

export async function addMediaAsset(data: any, userContext?: UserAuditContext) {
  try {
    const payload = { ...data };
    if (userContext?.userId && UUID_REGEX.test(userContext.userId)) {
      payload.uploaded_by = userContext.userId;
    }

    const { data: inserted, error } = await supabase
      .from('media_assets')
      .insert({ ...payload })
      .select('id')
      .single();

    if (error) throw error;

    // Registrar en auditoría la subida del asset
    await recordAuditLog({
      action: 'MEDIA_BATCH_UPLOADED',
      entityType: 'media_asset',
      entityId: String(data.session_id),
      entityTitle: data.filename || 'Archivo Multimedia',
      details: {
        asset_id: inserted?.id,
        filename: data.filename,
        type: data.asset_type,
        size_mb: data.size_mb,
      },
      ...userContext,
    });

    revalidatePath(`/sessions/${data.session_id}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Add media asset error:', error);
    return { success: false, error: error.message };
  }
}

export async function removeMediaAsset(id: string, sessionId: string, userContext?: UserAuditContext) {
  try {
    // 1. Obtener información del asset antes de borrar para registro fiel
    const { data: assetInfo } = await supabase
      .from('media_assets')
      .select('filename, asset_type, nas_path')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 2. Registrar en auditoría estricta quién eliminó la foto y qué archivo era
    await recordAuditLog({
      action: 'MEDIA_DELETED',
      entityType: 'media_asset',
      entityId: String(sessionId),
      entityTitle: assetInfo?.filename || 'Foto / Video',
      details: {
        deleted_asset_id: id,
        filename: assetInfo?.filename,
        nas_path: assetInfo?.nas_path,
      },
      ...userContext,
    });

    revalidatePath(`/sessions/${sessionId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Remove media asset error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteAssetAction(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const sessionId = formData.get('sessionId') as string;
  if (id && sessionId) {
    await removeMediaAsset(id, sessionId);
  }
}

export async function updateSessionPin(sessionId: string, pin: string) {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ portal_pin: pin })
      .eq('id', sessionId);

    if (error) throw error;
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/photos');
    revalidatePath('/videos');
    return { success: true };
  } catch (error: any) {
    console.error('Update PIN error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSessionQuota(sessionId: string, quota: number) {
  try {
    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('tags')
      .eq('id', sessionId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentTags = Array.isArray(session?.tags) ? session.tags : [];
    const filteredTags = currentTags.filter((t: string) => !t.startsWith('quota:'));
    const updatedTags = [...filteredTags, `quota:${quota}`];

    const { error } = await supabase
      .from('sessions')
      .update({ tags: updatedTags })
      .eq('id', sessionId);

    if (error) throw error;
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/photos');
    revalidatePath('/videos');
    return { success: true };
  } catch (error: any) {
    console.error('Update quota error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSessionPhone(sessionId: string, phone: string) {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ client_phone: phone.trim() })
      .eq('id', sessionId);

    if (error) throw error;
    revalidatePath(`/sessions/${sessionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Update phone error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(sessionId: string, status: string, userContext?: UserAuditContext) {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ status, updated_by: userContext?.userId || null })
      .eq('id', sessionId);

    if (error) throw error;

    await recordAuditLog({
      action: 'SESSION_STATUS_CHANGED',
      entityType: 'session',
      entityId: sessionId,
      details: { new_status: status },
      ...userContext,
    });

    if (status === 'ready_delivery' || status === 'edited') {
      try {
        await notifyReadyForDeliveryAction(sessionId, userContext);
      } catch (notifyErr) {
        console.warn('Fallo no bloqueante al enviar notificación de Ready for Delivery:', notifyErr);
      }
    }

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/calendar');
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update status error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSessionNotes(sessionId: string, comments: string, userContext?: UserAuditContext) {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ comments, updated_by: userContext?.userId || null })
      .eq('id', sessionId);

    if (error) throw error;

    await recordAuditLog({
      action: 'SESSION_UPDATED',
      entityType: 'session',
      entityId: sessionId,
      details: { updated_field: 'comments' },
      ...userContext,
    });

    revalidatePath('/calendar');
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/projects');
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update session notes error:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleAssetSharedAction(assetId: string, isShared: boolean, sessionId: string, userContext?: UserAuditContext) {
  try {
    const { error } = await supabase
      .from('media_assets')
      .update({ is_shared: isShared })
      .eq('id', assetId);

    if (error) throw error;

    await recordAuditLog({
      action: 'MEDIA_SHARED_TOGGLE',
      entityType: 'media_asset',
      entityId: sessionId,
      details: { asset_id: assetId, is_shared: isShared },
      ...userContext,
    });

    revalidatePath(`/sessions/${sessionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Toggle asset shared error:', error);
    return { success: false, error: error.message };
  }
}

export async function bulkSetAssetsSharedAction(assetIds: string[], isShared: boolean, sessionId: string, userContext?: UserAuditContext) {
  try {
    const { error } = await supabase
      .from('media_assets')
      .update({ is_shared: isShared })
      .in('id', assetIds);

    if (error) throw error;

    await recordAuditLog({
      action: 'MEDIA_SHARED_TOGGLE',
      entityType: 'media_asset',
      entityId: sessionId,
      details: { count: assetIds.length, is_shared: isShared },
      ...userContext,
    });

    revalidatePath(`/sessions/${sessionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Bulk set asset shared error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSessionPlannerStage(sessionId: string, newStage: string, userContext?: UserAuditContext) {
  try {
    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('client_name, tags, status')
      .eq('id', sessionId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentTags = Array.isArray(session?.tags) ? session.tags : [];
    const previousStageTag = currentTags.find((t: string) => t.startsWith('stage:'))?.replace('stage:', '');
    const previousStage = previousStageTag || session?.status;
    const filteredTags = currentTags.filter((t: string) => !t.startsWith('stage:'));
    const updatedTags = [...filteredTags, `stage:${newStage}`];

    // Map stage to compatible session_status enum
    let mappedStatus = 'shooting';
    if (newStage === 'shooting') mappedStatus = 'shooting';
    else if (newStage === 'editing' || newStage === 'shared' || newStage === 'client_selected') mappedStatus = 'editing';
    else if (newStage === 'ready_delivery') mappedStatus = 'edited';
    else if (newStage === 'delivered') mappedStatus = 'delivered';

    let updateRes = await supabase
      .from('sessions')
      .update({
        tags: updatedTags,
        status: mappedStatus,
        updated_by: userContext?.userId || null,
      })
      .eq('id', sessionId);

    if (updateRes.error) throw updateRes.error;

    // Registrar en auditoría estricta el avance de fase en el Planner
    await recordAuditLog({
      action: 'PLANNER_STAGE_CHANGED',
      entityType: 'planner',
      entityId: sessionId,
      entityTitle: session?.client_name || 'Sesión Planner',
      details: {
        previous_stage: previousStage,
        new_stage: newStage,
        status: mappedStatus,
      },
      ...userContext,
    });

    if (newStage === 'ready_delivery') {
      try {
        await notifyReadyForDeliveryAction(sessionId, userContext);
      } catch (notifyErr) {
        console.warn('Fallo no bloqueante al enviar notificación de Ready for Delivery desde Planner:', notifyErr);
      }
    } else if (newStage === 'shared') {
      try {
        await sendPhotosReadyEmailAction(sessionId, userContext);
      } catch (notifyErr) {
        console.warn('Fallo no bloqueante al enviar notificación de Fotos Compartidas desde Planner:', notifyErr);
      }
    }

    revalidatePath('/planner');
    revalidatePath('/projects');
    revalidatePath('/calendar');
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Update planner stage error:', error);
    return { success: false, error: error.message };
  }
}

export async function addSessionComment(sessionId: string, commentText: string) {
  try {
    if (!commentText || !commentText.trim()) {
      return { success: false, error: 'Comment cannot be empty' };
    }

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('comments')
      .eq('id', sessionId)
      .single();

    if (fetchErr) throw fetchErr;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `[${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}]`;
    const formattedEntry = `${timestamp} ${commentText.trim()}`;

    const existingComments = session?.comments ? session.comments.trim() : '';
    const updatedComments = existingComments 
      ? `${formattedEntry}\n\n${existingComments}`
      : formattedEntry;

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ comments: updatedComments })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    revalidatePath('/planner');
    revalidatePath('/projects');
    revalidatePath('/calendar');
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/');

    return { success: true, updatedComments };
  } catch (error: any) {
    console.error('Add session comment error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateClientContactInfo(
  currentName: string, 
  data: { name?: string; phone?: string; email?: string; notes?: string }
) {
  try {
    const updatePayload: any = {};
    if (data.phone !== undefined) updatePayload.client_phone = data.phone;
    if (data.email !== undefined) updatePayload.client_email = data.email;
    if (data.name && data.name.trim()) updatePayload.client_name = data.name.trim();

    // 1. Update all sessions associated with this client name
    const { error: sessionErr } = await supabase
      .from('sessions')
      .update(updatePayload)
      .ilike('client_name', currentName.trim());

    if (sessionErr) throw sessionErr;

    // 2. Also try updating clients table if record exists
    try {
      const clientUpdatePayload: any = {};
      if (data.phone !== undefined) clientUpdatePayload.phone = data.phone;
      if (data.email !== undefined) clientUpdatePayload.email = data.email;
      if (data.notes !== undefined) clientUpdatePayload.notes = data.notes;
      if (data.name && data.name.trim()) clientUpdatePayload.name = data.name.trim();

      await supabase
        .from('clients')
        .update(clientUpdatePayload)
        .ilike('name', currentName.trim());
    } catch (e) {
      // Non-critical if table empty
    }

    const finalName = data.name?.trim() || currentName.trim();
    revalidatePath('/clients');
    revalidatePath(`/clients/${encodeURIComponent(finalName)}`);
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/projects');
    revalidatePath('/');

    return { success: true, updatedName: finalName };
  } catch (error: any) {
    console.error('Update client contact info error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action para notificar al cliente que sus fotos están listas
 * Incluye credenciales, PIN de acceso al portal y enlace a Google Drive
 * Envía por Email (Microsoft Exchange) y WhatsApp (Evolution API)
 * y pasa la fase del proyecto a "shared" (esperando selección)
 */
export async function sendPhotosReadyEmailAction(
  sessionId: string, 
  userContext?: UserAuditContext,
  language?: string
) {
  try {
    // 1. Obtener datos del proyecto
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, client_name, client_email, client_phone, client_id, portal_pin, comments, tags')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return { success: false, error: 'No se encontró la sesión o proyecto.' };
    }

    // Resolver teléfono si no está configurado directamente en la sesión
    let clientPhone = session.client_phone;
    if (!clientPhone && session.client_email) {
      const { data: siblingSession } = await supabase
        .from('sessions')
        .select('client_phone')
        .eq('client_email', session.client_email)
        .not('client_phone', 'is', null)
        .limit(1)
        .maybeSingle();
      if (siblingSession?.client_phone) {
        clientPhone = siblingSession.client_phone;
        await supabase.from('sessions').update({ client_phone: clientPhone }).eq('id', sessionId);
      }
    }

    if (!session.client_email && !clientPhone) {
      return { success: false, error: 'Este proyecto no tiene ni correo ni teléfono de cliente registrado.' };
    }

    if (!session.portal_pin) {
      return { success: false, error: 'Este proyecto no tiene un Código PIN de acceso configurado. Genere o guarde un PIN de 4 dígitos primero.' };
    }

    // 2. Contar fotos disponibles
    const { count: photosCount } = await supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    // 3. Buscar enlace de Google Drive
    let driveFolderUrl: string | null = null;
    const { data: delivery } = await supabase
      .from('media_deliveries')
      .select('url, gdrive_folder_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (delivery?.url) {
      driveFolderUrl = delivery.url;
    } else if (delivery?.gdrive_folder_id) {
      driveFolderUrl = `https://drive.google.com/drive/folders/${delivery.gdrive_folder_id}`;
    }

    const emailLang = language || 'fr';

    // 4. Enviar mediante el motor Microsoft Exchange si tiene email
    if (session.client_email) {
      const result = await sendPhotosReadyNotification({
        clientName: session.client_name,
        clientEmail: session.client_email,
        portalPin: session.portal_pin,
        driveFolderUrl,
        photosCount: photosCount || undefined,
        language: emailLang,
      });

      if (result.success) {
        await recordAuditLog({
          action: 'EMAIL_PHOTOS_READY_SENT',
          entityType: 'session',
          entityId: sessionId,
          entityTitle: session.client_name,
          details: {
            email: session.client_email,
            portal_pin: session.portal_pin,
            photos_count: photosCount || 0,
            drive_url: driveFolderUrl,
            messageId: result.messageId,
          },
          ...userContext,
        });
      }
    }

    // 5. Enviar mensaje de WhatsApp si tiene teléfono
    if (clientPhone) {
      try {
        const waText = getPhotosReadyWhatsApp({
          clientName: session.client_name,
          portalPin: session.portal_pin,
          clientEmail: session.client_email,
          driveUrl: driveFolderUrl,
          photosCount: photosCount || undefined,
          language: emailLang,
        });

        await sendWhatsAppMessage({
          phone: clientPhone,
          text: waText,
          clientId: session.client_id || null,
          sessionId: session.id,
        });

        await recordAuditLog({
          action: 'WHATSAPP_PHOTOS_READY_SENT',
          entityType: 'session',
          entityId: sessionId,
          entityTitle: session.client_name,
          details: {
            phone: clientPhone,
            portal_pin: session.portal_pin,
            photos_count: photosCount || 0,
            language: emailLang,
          },
          ...userContext,
        });
      } catch (waErr) {
        console.warn('Fallo no bloqueante al enviar WhatsApp de fotos listas:', waErr);
      }
    }

    // 6. Actualizar fase a "shared" (en espera de selección cliente)
    const currentTags = Array.isArray(session.tags) ? session.tags : [];
    const filteredTags = currentTags.filter((t: string) => !t.startsWith('stage:'));
    const updatedTags = [...filteredTags, 'stage:shared'];

    await supabase
      .from('sessions')
      .update({
        pipeline_stage: 'shared',
        tags: updatedTags,
        updated_by: userContext?.userId || null,
      })
      .eq('id', sessionId);

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/planner');
    revalidatePath('/projects');
    revalidatePath('/audit');

    return { success: true };
  } catch (error: any) {
    console.error('Error en sendPhotosReadyEmailAction:', error);
    return { success: false, error: error?.message || 'Error inesperado al enviar las notificaciones.' };
  }
}

/**
 * Server Action para notificar que un proyecto está "Ready for Delivery" (Listo para entrega / recogida en estudio)
 * Envía Email oficial y WhatsApp con el enlace al portal y opciones de descarga/recogida
 */
export async function notifyReadyForDeliveryAction(
  sessionId: string,
  userContext?: UserAuditContext,
  language?: string
) {
  try {
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, client_name, client_email, client_phone, client_id, portal_pin, category')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return { success: false, error: 'No se encontró la sesión.' };
    }

    // Resolver teléfono si no está configurado directamente en la sesión
    let clientPhone = session.client_phone;
    if (!clientPhone && session.client_email) {
      const { data: siblingSession } = await supabase
        .from('sessions')
        .select('client_phone')
        .eq('client_email', session.client_email)
        .not('client_phone', 'is', null)
        .limit(1)
        .maybeSingle();
      if (siblingSession?.client_phone) {
        clientPhone = siblingSession.client_phone;
        await supabase.from('sessions').update({ client_phone: clientPhone }).eq('id', sessionId);
      }
    }

    let driveFolderUrl: string | null = null;
    const { data: delivery } = await supabase
      .from('media_deliveries')
      .select('url, gdrive_folder_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (delivery?.url) {
      driveFolderUrl = delivery.url;
    } else if (delivery?.gdrive_folder_id) {
      driveFolderUrl = `https://drive.google.com/drive/folders/${delivery.gdrive_folder_id}`;
    }

    const emailLang = language || 'fr';

    // 1. Enviar Email
    if (session.client_email) {
      try {
        const emailRes = await sendReadyForDeliveryNotification({
          clientName: session.client_name,
          clientEmail: session.client_email,
          category: session.category,
          portalPin: session.portal_pin,
          driveFolderUrl,
          language: emailLang,
        });

        if (emailRes.success) {
          await recordAuditLog({
            action: 'EMAIL_READY_FOR_DELIVERY_SENT',
            entityType: 'session',
            entityId: sessionId,
            entityTitle: session.client_name,
            details: {
              email: session.client_email,
              category: session.category,
              messageId: emailRes.messageId,
            },
            ...userContext,
          });
        }
      } catch (eErr) {
        console.warn('Error enviando email de Ready for Delivery:', eErr);
      }
    }

    // 2. Enviar WhatsApp
    if (clientPhone) {
      try {
        const text = getReadyForDeliveryWhatsApp({
          clientName: session.client_name,
          category: session.category,
          portalPin: session.portal_pin,
          clientEmail: session.client_email,
          driveUrl: driveFolderUrl,
          language: emailLang,
        });

        await sendWhatsAppMessage({
          phone: clientPhone,
          text,
          clientId: session.client_id || null,
          sessionId: session.id,
        });

        await recordAuditLog({
          action: 'WHATSAPP_READY_FOR_DELIVERY_SENT',
          entityType: 'session',
          entityId: sessionId,
          entityTitle: session.client_name,
          details: {
            phone: clientPhone,
            category: session.category,
            language: emailLang,
          },
          ...userContext,
        });
      } catch (wErr) {
        console.warn('Error enviando WhatsApp de Ready for Delivery:', wErr);
      }
    }

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/planner');
    revalidatePath('/projects');
    return { success: true };
  } catch (error: any) {
    console.error('Error en notifyReadyForDeliveryAction:', error);
    return { success: false, error: error?.message || 'Error inesperado' };
  }
}

/**
 * Server Action que procesa la selección de fotos enviada por el cliente desde el portal
 * 1. Pasa el estado y fase a "client_selected"
 * 2. Guarda la selección y comentarios en la base de datos
 * 3. Envía confirmación por Email de lujo al cliente
 * 4. Envía confirmación por WhatsApp al cliente
 * 5. Envía alerta interna de selección al WhatsApp del estudio
 */
export async function submitClientSelectionAction(params: {
  sessionId: string;
  selectedAssets?: string[];
  notesCount?: number;
  generalNotes?: string;
  assetNotes?: Record<string, string>;
  language?: string;
}) {
  try {
    const { 
      sessionId, 
      selectedAssets = [], 
      notesCount = 0, 
      generalNotes = '', 
      assetNotes = {}, 
      language = 'fr' 
    } = params;

    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, client_name, client_email, client_phone, client_id, portal_pin, comments, tags')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    const currentTags = Array.isArray(session.tags) ? session.tags : [];
    const filteredTags = currentTags.filter((t: string) => !t.startsWith('stage:'));
    const updatedTags = [...filteredTags, 'stage:client_selected'];

    const timestamp = new Date().toLocaleString();
    const clientNoteEntry = `[${timestamp}] Sélection client: ${selectedAssets.length} photos.${
      generalNotes ? ` Note: "${generalNotes}"` : ''
    }`;
    const updatedComments = session.comments ? `${session.comments}\n${clientNoteEntry}` : clientNoteEntry;

    // Actualizar sesión a client_selected en tags, status y pipeline_stage
    await supabase
      .from('sessions')
      .update({
        selected_assets: selectedAssets,
        comments: updatedComments,
        status: 'client_selected',
        pipeline_stage: 'client_selected',
        tags: updatedTags,
      })
      .eq('id', sessionId);

    // Actualizar assets individuales
    if (selectedAssets.length > 0) {
      await supabase
        .from('media_assets')
        .update({ client_selected: true })
        .eq('session_id', sessionId)
        .in('filename', selectedAssets);

      for (const [photoFilename, photoNote] of Object.entries(assetNotes)) {
        if (photoNote && photoNote.trim()) {
          await supabase
            .from('media_assets')
            .update({ client_notes: photoNote.trim() })
            .eq('session_id', sessionId)
            .eq('filename', photoFilename);
        }
      }
    }

    // 1. Correo de confirmación de alta gama al cliente
    if (session.client_email) {
      try {
        await sendSelectionConfirmedNotification({
          clientName: session.client_name,
          clientEmail: session.client_email,
          photosCount: selectedAssets.length,
          notesCount,
          portalPin: session.portal_pin,
          language,
        });
      } catch (eErr) {
        console.warn('Error enviando email confirmación cliente:', eErr);
      }
    }

    // 2. WhatsApp de confirmación al cliente
    if (session.client_phone) {
      try {
        const clientWaText = getSelectionReceivedClientWhatsApp({
          clientName: session.client_name,
          photosCount: selectedAssets.length,
          language,
        });

        await sendWhatsAppMessage({
          phone: session.client_phone,
          text: clientWaText,
          clientId: session.client_id || null,
          sessionId,
        });
      } catch (cWaErr) {
        console.warn('Error enviando WhatsApp confirmación cliente:', cWaErr);
      }
    }

    // 3. WhatsApp de alerta al Estudio / Dirección Técnica
    try {
      const studioWaText = getStudioSelectionAlertWhatsApp({
        clientName: session.client_name,
        photosCount: selectedAssets.length,
        notesCount,
        clientPhone: session.client_phone,
      });

      const studioPhone = process.env.STUDIO_WHATSAPP_PHONE;
      if (studioPhone) {
        await sendWhatsAppMessage({
          phone: studioPhone,
          text: studioWaText,
          sessionId,
        });
      }
    } catch (sWaErr) {
      console.warn('Error enviando WhatsApp alerta al estudio:', sWaErr);
    }

    // Registrar auditoría inmutable
    await recordAuditLog({
      action: 'CLIENT_SELECTION_SUBMITTED',
      entityType: 'session',
      entityId: sessionId,
      entityTitle: session.client_name,
      details: {
        photos_count: selectedAssets.length,
        notes_count: notesCount,
        email: session.client_email,
        phone: session.client_phone,
      },
    });

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/planner');
    revalidatePath('/projects');
    revalidatePath('/photos');
    return { success: true };
  } catch (error: any) {
    console.error('Error en submitClientSelectionAction:', error);
    return { success: false, error: error?.message || 'Error inesperado' };
  }
}
