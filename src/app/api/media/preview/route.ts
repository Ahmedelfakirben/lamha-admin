import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
type ReadStreamOpts = Parameters<typeof fs.createReadStream>[1]

function streamFile(path: string, options?: ReadStreamOpts): ReadableStream {
    const downloadStream = fs.createReadStream(path, options);
    return new ReadableStream({
        start(controller) {
            downloadStream.on("data", (chunk: string | Buffer) => controller.enqueue(new Uint8Array(typeof chunk === "string" ? Buffer.from(chunk) : chunk)));
            downloadStream.on("end", () => controller.close());
            downloadStream.on("error", (error: NodeJS.ErrnoException) => controller.error(error));
        },
        cancel() {
            downloadStream.destroy();
        },
    });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const filePath = searchParams.get("file")

    if (!filePath) return new NextResponse("Parámetro 'file' faltante", { status: 400 })

    const normalizedPath = path.normalize(filePath)
    if (!fs.existsSync(normalizedPath)) return new NextResponse("Archivo no encontrado", { status: 404 })

    const stat = fs.statSync(normalizedPath)
    const fileSize = stat.size
    const range = req.headers.get("range")

    const ext = path.extname(normalizedPath).toLowerCase()
    let contentType = "application/octet-stream"
    if (ext === ".webp") contentType = "image/webp"
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg"
    else if (ext === ".png") contentType = "image/png"
    else if (ext === ".mp4") contentType = "video/mp4"
    else if (ext === ".mov") contentType = "video/quicktime"

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      
      const stream = streamFile(normalizedPath, { start, end })
      
      return new NextResponse(stream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      })
    } else {
      const stream = streamFile(normalizedPath)
      return new NextResponse(stream, {
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      })
    }
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 })
  }
}
