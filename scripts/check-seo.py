"""Check static HTML, links, metadata, structured data and index controls.

Preview: python3 scripts/check-seo.py
Production smoke test: python3 scripts/check-seo.py /tmp/export https://mantrilo.example
The .example domain is a reserved test origin, not Mantrilo's production domain.
"""
import gzip
import json
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'dist')
origin = sys.argv[2].rstrip('/') if len(sys.argv) > 2 else None
manifest = json.loads(Path('src/data/seo-pages.json').read_text())

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = set()
        self.links = []
        self.meta = {}
        self.canonicals = []
        self.h1_count = 0
        self.title = ''
        self.in_title = False
        self.jsonld = []
        self.in_jsonld = False
        self.script_data = ''
        self.language = None
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'html': self.language = a.get('lang')
        if tag == 'h1': self.h1_count += 1
        if tag == 'title': self.in_title = True
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag == 'meta':
            key = a.get('name') or a.get('property')
            if key:
                assert key not in self.meta, f'Duplicate metadata: {key}'
                self.meta[key] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a['href'])
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_jsonld = True
            self.script_data = ''
    def handle_data(self, value):
        if self.in_title: self.title += value
        if self.in_jsonld: self.script_data += value
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.in_jsonld:
            self.jsonld.append(json.loads(self.script_data))
            self.in_jsonld = False

pages = {}
link_count = 0
for route, expected in manifest.items():
    filename = 'index.html' if route == '/' else route.lstrip('/') + '.html'
    page = Page((root / filename).read_text())
    pages[route] = page
    assert page.language == 'en', (route, 'language')
    assert page.title == expected['title'], (route, 'title', page.title)
    assert page.h1_count == 1, (route, 'primary heading', page.h1_count)
    assert page.meta['description'] == expected['description'], (route, 'description')
    for key in ['og:title', 'twitter:title']:
        assert page.meta[key] == expected['title'], (route, key)
    for key in ['og:description', 'twitter:description']:
        assert page.meta[key] == expected['description'], (route, key)
    assert page.meta['robots'] == ('index,follow' if origin and expected['indexable'] else 'noindex,follow'), (route, 'robots')
    assert page.canonicals == ([origin + route] if origin else []), (route, 'canonical', page.canonicals)
    if origin:
        assert page.meta['og:url'] == origin + route
        assert len(page.jsonld) == 1, (route, 'structured data absent')
        graph = page.jsonld[0]['@graph']
        assert graph[0]['@type'] == ('Organization' if route == '/' else 'BreadcrumbList')
        assert 'AggregateRating' not in json.dumps(graph)
    else:
        assert not page.jsonld, (route, 'unconfigured origin must not emit invented structured URLs')
assert len({p.title for p in pages.values()}) == len(pages), 'Duplicate titles'
for route, page in pages.items():
    for href in page.links:
        url = urlsplit(href)
        if url.scheme or url.netloc: continue
        target = url.path or route
        assert target in pages, (route, href, 'broken internal link')
        if url.fragment: assert url.fragment in pages[target].ids, (route, href, 'missing anchor')
        link_count += 1
not_found = Page((root / '404.html').read_text())
assert not_found.h1_count == 1 and not_found.meta['robots'].startswith('noindex')
assert not not_found.canonicals
assert not (root / '[page].html').exists(), 'Catch-all export remains'
assert not (root / '_sitemap.html').exists(), 'Internal route exposed'
urls = ET.parse(root / 'sitemap.xml').getroot()
locations = [node.text for node in urls.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
expected_urls = [origin + route for route, data in manifest.items() if data['indexable']] if origin else []
assert locations == expected_urls, ('sitemap', locations)
robots = (root / 'robots.txt').read_text()
assert ('Allow: /' in robots and f'Sitemap: {origin}/sitemap.xml' in robots) if origin else ('Disallow: /' in robots)
print(f'PASS: {len(pages)} routes, {link_count} internal links, unique metadata, one H1 per page, language, canonical/social tags, JSON-LD, robots, sitemap, and 404 artifact.')
entry = list((root / '_expo/static/js/web').glob('entry-*.js'))
for file in entry:
    data = file.read_bytes()
    print(f'Framework entry JS: {len(data):,} bytes raw; {len(gzip.compress(data)):,} bytes gzip (local file measurement, not real-user CWV).')
