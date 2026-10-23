'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import { sendWelcomeEmailNotification, sendPhotosReadyNotification } from '@/lib/email';

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

    const { data: insertedSession, error } = await supabase
      .from('sessions')
      .insert({ ...sessionData })
      .select()
      .single();

    if (error) throw error;

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

    const { error } = await supabase
      .from('sessions')
      .update({ ...sessionData })
      .eq('id', id);

    if (error) throw error;

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
      .select('client_name, tags, status, pipeline_stage')
      .eq('id', sessionId)
      .single();

    if (fetchErr) throw fetchErr;

    const previousStage = session?.pipeline_stage || session?.status;
    const currentTags = Array.isArray(session?.tags) ? session.tags : [];
    const filteredTags = currentTags.filter((t: string) => !t.startsWith('stage:'));
    const updatedTags = [...filteredTags, `stage:${newStage}`];

    // Map stage to compatible session_status enum
    let mappedStatus = 'shooting';
    if (newStage === 'shooting') mappedStatus = 'shooting';
    else if (newStage === 'editing' || newStage === 'shared' || newStage === 'client_selected') mappedStatus = 'editing';
    else if (newStage === 'ready_delivery') mappedStatus = 'edited';
    else if (newStage === 'delivered') mappedStatus = 'delivered';

    // Attempt to update with pipeline_stage first (if column exists)
    let updateRes = await supabase
      .from('sessions')
      .update({
        tags: updatedTags,
        status: mappedStatus,
        pipeline_stage: newStage,
        updated_by: userContext?.userId || null,
      })
      .eq('id', sessionId);

    // If column pipeline_stage doesn't exist yet in Supabase, fallback to tags + status
    if (updateRes.error) {
      const fallbackRes = await supabase
        .from('sessions')
        .update({
          tags: updatedTags,
          status: mappedStatus,
          updated_by: userContext?.userId || null,
        })
        .eq('id', sessionId);

      if (fallbackRes.error) throw fallbackRes.error;
    }

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
      .select('id, client_name, client_email, portal_pin, gdrive_folder_id, comments')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return { success: false, error: 'No se encontró la sesión o proyecto.' };
    }

    if (!session.client_email) {
      return { success: false, error: 'Este proyecto no tiene un correo electrónico de cliente registrado.' };
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
    if (session.gdrive_folder_id) {
      driveFolderUrl = `https://drive.google.com/drive/folders/${session.gdrive_folder_id}`;
    } else {
      const { data: delivery } = await supabase
        .from('media_deliveries')
        .select('url')
        .eq('session_id', sessionId)
        .eq('delivery_type', 'folder_link')
        .maybeSingle();
      if (delivery?.url) {
        driveFolderUrl = delivery.url;
      }
    }

    // 4. Enviar mediante el motor Microsoft Exchange
    const result = await sendPhotosReadyNotification({
      clientName: session.client_name,
      clientEmail: session.client_email,
      portalPin: session.portal_pin,
      driveFolderUrl,
      photosCount: photosCount || undefined,
      language: language || 'fr',
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 5. Registrar en Auditoría inmutable
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

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/audit');

    return { success: true };
  } catch (error: any) {
    console.error('Error en sendPhotosReadyEmailAction:', error);
    return { success: false, error: error?.message || 'Error inesperado al enviar el correo.' };
  }
}
