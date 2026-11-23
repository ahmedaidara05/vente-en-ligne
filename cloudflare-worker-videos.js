const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name, X-Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

function mimeFromExt(ext) {
  const e = (ext || '').toLowerCase();
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'mp4') return 'video/mp4';
  if (e === 'webm') return 'video/webm';
  if (e === 'mov') return 'video/quicktime';
  return '';
}

function isImageExt(ext) {
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes((ext || '').toLowerCase());
}

function sniffImageMime(bytes) {
  if (!bytes || bytes.byteLength < 4) return '';
  const u = new Uint8Array(bytes);
  if (u[0] === 0xff && u[1] === 0xd8) return 'image/jpeg';
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return 'image/gif';
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && bytes.byteLength >= 12) {
    if (u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return 'image/webp';
  }
  return '';
}

function resolveContentType(filename, declared, bytes) {
  const ext = extOf(filename);
  const byExt = mimeFromExt(ext);
  const bySniff = bytes ? sniffImageMime(bytes) : '';
  if (bySniff) return bySniff;
  if (isImageExt(ext)) return byExt || 'image/jpeg';
  if (declared && declared !== 'application/octet-stream') {
    if (isImageExt(ext) && declared.startsWith('video/')) return byExt || 'image/jpeg';
    return declared;
  }
  if (byExt) return byExt;
  return declared || 'application/octet-stream';
}

function serveMimeForKey(key, stored) {
  const ext = extOf(key);
  if (isImageExt(ext)) return mimeFromExt(ext) || 'image/jpeg';
  if (stored && stored !== 'application/octet-stream') return stored;
  return mimeFromExt(ext) || stored || 'application/octet-stream';
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
        return json({ ok: true, service: 'idus-media', bucket: 'videos' });
      }

      if (path === '/upload' && request.method === 'POST') {
        const ct = request.headers.get('content-type') || '';
        let bytes, filename, contentType;
        if (ct.includes('multipart/form-data')) {
          const form = await request.formData();
          const file = form.get('file');
          if (!file || typeof file.arrayBuffer !== 'function') {
            return json({ error: 'Champ file manquant' }, 400);
          }
          bytes = await file.arrayBuffer();
          filename = file.name || 'file.bin';
          contentType = file.type || '';
        } else {
          bytes = await request.arrayBuffer();
          filename = request.headers.get('X-File-Name') || 'file.bin';
          contentType = request.headers.get('X-Content-Type') || ct || '';
        }
        if (!bytes || bytes.byteLength === 0) return json({ error: 'Fichier vide' }, 400);
        if (bytes.byteLength > 25 * 1024 * 1024) {
          return json({ error: 'Fichier trop volumineux (max ~25 Mo)' }, 413);
        }

        contentType = resolveContentType(filename, contentType, bytes);
        const isImage = contentType.startsWith('image/');
        let ext = extOf(filename);
        if (!ext || (isImage && !isImageExt(ext))) {
          ext = contentType === 'image/png' ? 'png'
            : contentType === 'image/webp' ? 'webp'
            : contentType === 'image/gif' ? 'gif'
            : isImage ? 'jpg' : 'mp4';
        }
        const folder = isImage ? 'img' : 'v';
        const key = folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 10) + '.' + ext;
        await env.VIDEOS.put(key, bytes, {
          httpMetadata: { contentType },
          customMetadata: { originalName: filename },
        });
        const publicUrl = url.origin + '/file/' + key;
        return json({ ok: true, key, url: publicUrl, size: bytes.byteLength, contentType });
      }

      if ((path.startsWith('/file/') || path.startsWith('/video/')) &&
          (request.method === 'GET' || request.method === 'HEAD')) {
        const prefix = path.startsWith('/file/') ? '/file/' : '/video/';
        const key = decodeURIComponent(path.slice(prefix.length));
        if (!key || key.includes('..')) return json({ error: 'Clé invalide' }, 400);
        const obj = await env.VIDEOS.get(key);
        if (!obj) return json({ error: 'Fichier introuvable' }, 404);

        const headers = new Headers(CORS);
        const stored = (obj.httpMetadata && obj.httpMetadata.contentType) || '';
        const ctype = serveMimeForKey(key, stored);
        headers.set('Content-Type', ctype);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        if (obj.size != null) headers.set('Content-Length', String(obj.size));

        if (request.method === 'HEAD') {
          return new Response(null, { status: 200, headers });
        }

        const range = request.headers.get('Range');
        if (range && obj.size) {
          const m = /bytes=(\d+)-(\d*)/.exec(range);
          if (m) {
            const start = parseInt(m[1], 10);
            const end = m[2] ? parseInt(m[2], 10) : obj.size - 1;
            const slice = await env.VIDEOS.get(key, {
              range: { offset: start, length: end - start + 1 },
            });
            headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + obj.size);
            headers.set('Content-Length', String(end - start + 1));
            return new Response(slice.body, { status: 206, headers });
          }
        }
        return new Response(obj.body, { status: 200, headers });
      }

      if ((path.startsWith('/file/') || path.startsWith('/video/')) && request.method === 'DELETE') {
        const prefix = path.startsWith('/file/') ? '/file/' : '/video/';
        const key = decodeURIComponent(path.slice(prefix.length));
        if (!key) return json({ error: 'Clé invalide' }, 400);
        await env.VIDEOS.delete(key);
        return json({ ok: true, deleted: key });
      }

      return json({ error: 'Not found', path }, 404);
    } catch (e) {
      return json({ error: e.message || String(e) }, 500);
    }
  },
};
