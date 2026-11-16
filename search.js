// The home page's "try it" search: top 5 recordings with their ISRC. The app has the full version.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('f'), q = $('q'), out = $('out'), status = $('status'), more = $('moreInApp');
  if (!form) return;
  var run = 0, n = 0;

  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = '__mf' + (++n), s = document.createElement('script'), done = false;
      var timer = setTimeout(function () { finish(); reject(new Error('timeout')); }, 15000);
      function finish() { done = true; clearTimeout(timer); delete window[name]; s.remove(); }
      window[name] = function (d) { if (done) return; finish(); resolve(d); };
      s.onerror = function () { if (done) return; finish(); reject(new Error('network')); };
      s.src = url + '&output=jsonp&callback=' + name;
      document.head.appendChild(s);
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function dur(s) { return s ? Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) : ''; }
  function say(text) { status.hidden = !text; status.textContent = text || ''; }
  function toast(text) {
    var t = el('div', 'toast', text);
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1600);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = q.value.trim(), id = ++run;
    out.textContent = '';
    more.hidden = true;
    if ($('hintEmpty')) $('hintEmpty').hidden = true;
    if (!text) { say(''); return; }
    say('Searching…');
    jsonp('https://api.deezer.com/search?q=' + encodeURIComponent(text) + '&limit=25').then(function (d) {
      if (id !== run) return;
      var seen = {}, words = text.toLowerCase().split(/\s+/);
      var rows = (d.data || []).filter(function (t) { if (!t.isrc || seen[t.isrc]) return false; seen[t.isrc] = 1; return true; })
        .map(function (t, i) { var title = ((t.title || '') + ' ' + ((t.artist && t.artist.name) || '')).toLowerCase(); return { t: t, i: i, s: words.filter(function (w) { return title.indexOf(w) >= 0; }).length }; })
        .sort(function (a, b) { return b.s - a.s || a.i - b.i; }).map(function (x) { return x.t; });
      if (!rows.length) { say('Nothing found. Try adding the artist name, or check the spelling.'); return; }
      say('');
      rows.slice(0, 5).forEach(function (t) {
        var li = el('li'), img;
        if (t.album && t.album.cover_medium) { img = el('img'); img.alt = ''; img.loading = 'lazy'; img.width = 48; img.height = 48; img.src = t.album.cover_medium; }
        else img = el('div', 'noart');
        var body = el('div');
        body.appendChild(el('div', 't', t.title));
        body.appendChild(el('div', 'm', [t.artist && t.artist.name, t.album && t.album.title, dur(t.duration)].filter(Boolean).join(' · ')));
        var b = el('button', 'code', t.isrc.toUpperCase());
        b.type = 'button';
        b.dataset.code = t.isrc.toUpperCase();
        b.appendChild(el('small', null, 'Copy'));
        body.appendChild(b);
        li.appendChild(img);
        li.appendChild(body);
        out.appendChild(li);
      });
      more.hidden = rows.length <= 5;
    }, function () {
      if (id === run) say('Could not search right now. Check your connection and try again.');
    });
  });

  out.addEventListener('click', function (e) {
    var b = e.target.closest('.code');
    if (!b) return;
    var text = 'isrc:' + b.dataset.code;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
      function () { toast('Copied ' + text); },
      function () { toast('Press and hold the code to copy it'); });
  });
})();
