import { NextResponse } from "next/server"
import { spawn } from "child_process"
import { getStorageConfig } from "@/lib/storage-config"
import fs from "fs"
import path from "path"
import os from "os"

// Variable global para mantener el estado de la sincronización en memoria
let syncProcess: any = null
let syncLogs: string[] = []
let isSyncing = false

export async function GET() {
  return NextResponse.json({
    isSyncing,
    logs: syncLogs.slice(-50), // Últimos 50 logs
    status: isSyncing ? "En progreso" : "Detenido"
  })
}

export async function POST() {
  if (isSyncing) {
    return NextResponse.json({ error: "Ya hay una sincronización en curso" }, { status: 400 })
  }

  const { localBasePath, networkBasePath, platform } = getStorageConfig()

  if (platform !== "win32") {
    return NextResponse.json({ error: "La sincronización con Robocopy solo está disponible en Windows" }, { status: 400 })
  }

  isSyncing = true
  syncLogs = [`[${new Date().toISOString()}] Iniciando sincronización a NAS...`]
  syncLogs.push(`Origen (SSD): ${localBasePath}`)
  syncLogs.push(`Destino (NAS): ${networkBasePath}`)

  try {
    // Si la ruta destino es UNC (ej. \\192.168.11.1\usb1_1), robocopy la soporta directamente
    const robocopyArgs = [
      localBasePath,
      networkBasePath,
      "/E",           // Copiar subdirectorios, incluyendo vacíos
      "/MT:16",       // Multihilo (16 hilos)
      "/Z",           // Modo reiniciable (para reanudar transferencias interrumpidas)
      "/XO",          // Excluir archivos más antiguos (solo copiar nuevos/modificados)
      "/R:3",         // Número de reintentos
      "/W:5",         // Tiempo de espera entre reintentos (segundos)
      "/NP",          // No mostrar progreso por archivo (ensucia mucho los logs)
      "/NFL",         // No registrar la lista de archivos (para no saturar la memoria)
      "/NDL"          // No registrar la lista de directorios
    ]

    syncLogs.push(`Comando: robocopy ${robocopyArgs.join(" ")}`)

    syncProcess = spawn("robocopy", robocopyArgs)

    syncProcess.stdout.on("data", (data: Buffer) => {
      const text = data.toString().trim()
      if (text) {
        syncLogs.push(text)
        if (syncLogs.length > 200) syncLogs.shift() // Mantener los logs acotados
      }
    })

    syncProcess.stderr.on("data", (data: Buffer) => {
      const text = data.toString().trim()
      if (text) {
        syncLogs.push(`ERROR: ${text}`)
        if (syncLogs.length > 200) syncLogs.shift()
      }
    })

    syncProcess.on("close", (code: number) => {
      isSyncing = false
      syncProcess = null
      
      // Robocopy devuelve códigos de salida > 0 incluso en éxito (ej. 1 = copiados con éxito, 0 = no había nada que copiar)
      // > 7 indica un error grave
      if (code > 7) {
        syncLogs.push(`[${new Date().toISOString()}] ❌ Sincronización finalizada con ERRORES (Código: ${code}).`)
      } else {
        syncLogs.push(`[${new Date().toISOString()}] ✅ Sincronización completada correctamente (Código: ${code}).`)
      }
    })

    return NextResponse.json({ success: true, message: "Sincronización iniciada en segundo plano" })
  } catch (error: any) {
    isSyncing = false
    syncProcess = null
    return NextResponse.json({ error: error.message || "Error al iniciar Robocopy" }, { status: 500 })
  }
}

export async function DELETE() {
  if (!isSyncing || !syncProcess) {
    return NextResponse.json({ error: "No hay ninguna sincronización en curso" }, { status: 400 })
  }

  try {
    syncProcess.kill()
    isSyncing = false
    syncProcess = null
    syncLogs.push(`[${new Date().toISOString()}] ⚠️ Sincronización cancelada por el usuario.`)
    
    return NextResponse.json({ success: true, message: "Sincronización cancelada" })
  } catch (error: any) {
    return NextResponse.json({ error: "Error al cancelar el proceso" }, { status: 500 })
  }
}
