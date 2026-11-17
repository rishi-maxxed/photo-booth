// Fallback path: use photos from the gallery instead of the camera.

export function pickImages(multiple) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !!multiple;
    input.hidden = true;
    document.body.appendChild(input);
    const finish = (files) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish([...input.files]));
    input.addEventListener('cancel', () => finish([]));
    input.click();
  });
}

async function decode(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export async function filesToCanvases(files, maxSide = 1920) {
  const out = [];
  for (const f of files) {
    const src = await decode(f);
    const w = src.width || src.naturalWidth;
    const h = src.height || src.naturalHeight;
    const k = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close();
    out.push(c);
  }
  return out;
}
