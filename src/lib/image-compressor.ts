/**
 * Comprime y redimensiona una imagen seleccionada desde el dispositivo (celular o laptop)
 * para convertirla en una cadena Data URL Base64 ligera (~30KB - 80KB) ideal para
 * guardarse directamente en la base de datos sin sobrecargar la red ni requerir almacenamiento externo.
 */
export async function fileToBase64Image(
  file: File,
  maxDimension: number = 512,
  quality: number = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Fondo transparente para PNG
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Si es PNG con transparencias, mantener PNG; de lo contrario JPEG/WEBP
        const isPng = file.type === 'image/png';
        const format = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
