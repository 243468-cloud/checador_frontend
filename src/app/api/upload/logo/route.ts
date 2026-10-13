import { NextResponse } from 'next/server';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 });
    }

    // 1. Validación de tamaño máximo
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 2 MB.' },
        { status: 400 }
      );
    }

    // 2. Validación de tipo MIME
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      return NextResponse.json(
        {
          error:
            'Los archivos SVG no están permitidos por motivos de seguridad. Utilice imágenes PNG, JPEG o WebP.',
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido (${file.type}). Solo se aceptan formatos PNG, JPEG y WebP.`,
        },
        { status: 400 }
      );
    }

    // 3. Validación de integridad de imagen mediante decodificación con sharp
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.format || !['png', 'jpeg', 'webp'].includes(metadata.format)) {
        return NextResponse.json(
          { error: 'El contenido del archivo no corresponde a una imagen válida.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'El archivo está dañado o no es una imagen válida.' },
        { status: 400 }
      );
    }

    // En un entorno de producción, aquí se guardaría en storage/S3 o se pasaría al backend.
    return NextResponse.json({
      success: true,
      message: 'Logo validado correctamente.',
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al procesar la subida del archivo.' },
      { status: 500 }
    );
  }
}
