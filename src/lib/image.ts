/** Réduit une photo (max 1280 px, JPEG) pour qu'elle tienne dans le stockage du navigateur. */
export function compresserPhoto(fichier: File, tailleMax = 1280, qualite = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, tailleMax / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Traitement de l’image impossible'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', qualite));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Ce fichier n’est pas une image lisible'));
    };
    img.src = url;
  });
}
