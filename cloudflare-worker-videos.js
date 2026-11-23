const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name, X-Content-Type',
  'Access-Control-Max-Age': '86400',
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
function guessType(filename, declared) {
  const f = (filename || '').toLowerCase();
  if (declared && declared !== 'application/octet-stream') return declared;
  if (/\.(jpg|jpeg)$/.test(f)) return 'image/jpeg';
  if (/\.png$/.test(f)) return 'image/png';
  if (/\.webp$/.test(f)) return 'image/webp';
  if (/\.gif$/.test(f)) return 'image/gif';
  if (/\.mp4$/.test(f)) return 'video/mp4';
  if (/\.webm$/.test(f)) return 'video/webm';
  if (/\.mov$/.test(f)) return 'video/quicktime';
  return declared || 'application/octet-stream';
}
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/' && request.method === 'GET') {
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
        contentType = guessType(filename, contentType);
        const isImage = contentType.startsWith('image/');
        const ext = (filename.split('.').pop() || (isImage ? 'jpg' : 'mp4'))
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') || (isImage ? 'jpg' : 'mp4');
        const folder = isImage ? 'img' : 'v';
        const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
        await env.VIDEOS.put(key, bytes, {
          httpMetadata: { contentType },
          customMetadata: { originalName: filename },
        });
        const publicUrl = `${url.origin}/file/${key}`;
        return json({ ok: true, key, url: publicUrl, size: bytes.byteLength, contentType });
      }
      if ((path.startsWith('/file/') || path.startsWith('/video/')) && request.method === 'GET') {
        const prefix = path.startsWith('/file/') ? '/file/' : '/video/';
        const key = decodeURIComponent(path.slice(prefix.length));
        if (!key || key.includes('..')) return json({ error: 'Clé invalide' }, 400);
        const obj = await env.VIDEOS.get(key);
        if (!obj) return json({ error: 'Fichier introuvable' }, 404);
        const headers = new Headers(CORS);
        let ctype = obj.httpMetadata?.contentType || 'application/octet-stream';
        if (ctype.startsWith('video/') && /\.(jpg|jpeg|png|webp|gif)$/i.test(key)) {
          ctype = key.toLowerCase().endsWith('.png') ? 'image/png'
            : key.toLowerCase().endsWith('.webp') ? 'image/webp'
            : key.toLowerCase().endsWith('.gif') ? 'image/gif'
            : 'image/jpeg';
        }
        headers.set('Content-Type', ctype);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        if (obj.size != null) headers.set('Content-Length', String(obj.size));
        const range = request.headers.get('Range');
        if (range && obj.size) {
          const m = /bytes=(\d+)-(\d*)/.exec(range);
          if (m) {
            const start = parseInt(m[1], 10);
            const end = m[2] ? parseInt(m[2], 10) : obj.size - 1;
            const slice = await env.VIDEOS.get(key, {
              range: { offset: start, length: end - start + 1 },
            });
            headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
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
