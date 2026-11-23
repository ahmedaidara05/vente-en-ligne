/* IDUS — récupère les images R2 servies avec un mauvais Content-Type (video/mp4) */
(function () {
  function fix(el) {
    if (!el || !el.src || el.dataset.fixed) return;
    el.dataset.fixed = '1';
    var src = el.src;
    fetch(src, { mode: 'cors' })
      .then(function (r) { return r.blob(); })
      .then(function (b) {
        if (!b || !b.size) return;
        var t = 'image/jpeg';
        if (/\.png/i.test(src)) t = 'image/png';
        else if (/\.webp/i.test(src)) t = 'image/webp';
        else if (/\.gif/i.test(src)) t = 'image/gif';
        el.src = URL.createObjectURL(new Blob([b], { type: t }));
      })
      .catch(function () {});
  }
  document.addEventListener(
    'error',
    function (e) {
      if (e.target && e.target.tagName === 'IMG') fix(e.target);
    },
    true
  );
  function scan() {
    document
      .querySelectorAll('img[src*="workers.dev"],img[src*="/video/"],img[src*="/file/"]')
      .forEach(function (img) {
        if (!img.dataset.fixed) fix(img);
      });
  }
  var t;
  new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(scan, 80);
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
