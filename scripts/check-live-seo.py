"""Check the actual public release after publishing, including canonical host and CTA.

    python3 scripts/check-live-seo.py https://www.mantrilo.com [dist]

The live sitemap must list exactly the URLs of the production build in `dist` (the build that was
deployed), and every one of them must serve an indexable page with its own canonical.
"""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen
import sys
import xml.etree.ElementTree as ET

origin = (sys.argv[1] if len(sys.argv) > 1 else 'https://www.mantrilo.com').rstrip('/')
built = Path(sys.argv[2] if len(sys.argv) > 2 else 'dist') / 'sitemap.xml'
SITEMAP = '{http://www.sitemaps.org/schemas/sitemap/0.9}loc'
expected = {n.text for n in ET.parse(built).getroot().iter(SITEMAP)}
assert expected, f'{built} lists no URLs: build with EXPO_PUBLIC_INDEXING_ENABLED=true first'
assert all(url.startswith(origin + '/') for url in expected), f'{built} was built for another origin'

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def get(url, follow=True):
    try:
        opener = urlopen if follow else build_opener(NoRedirect()).open
        response = opener(Request(url, headers={'User-Agent': 'MantriloReleaseCheck/1.0'}), timeout=15)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.geturl(), response.read().decode('utf-8')

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.language = None
        self.alternates = []
        self.robots = []
        self.signup = set()
        self.console_requests = set()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'html':
            self.language = values.get('lang')
        if tag == 'link' and values.get('rel') == 'alternate' and 'hreflang' in values:
            self.alternates.append((values['hreflang'], values['href']))
        if tag == 'link' and values.get('rel') == 'canonical':
            self.canonicals.append(values.get('href'))
        if tag == 'meta' and values.get('name') in ('robots', 'googlebot'):
            self.robots.append(values.get('content', ''))
        if tag == 'a' and (href := values.get('href')):
            url = urlsplit(href)
            query = parse_qs(url.query)
            if url.path.endswith('/login') and query.get('mode') == ['signup']:
                self.signup.add(href)
            if url.path.endswith('/docs') and query.get('tab') in (['try'], ['astrology']):
                self.console_requests.add(href)

status, _, _, robots = get(origin + '/robots.txt')
assert status == 200 and 'Disallow: /' not in robots and f'Sitemap: {origin}/sitemap.xml' in robots
status, _, _, sitemap = get(origin + '/sitemap.xml')
assert status == 200
locations = [n.text for n in ET.fromstring(sitemap).iter(SITEMAP)]
assert len(locations) == len(set(locations)), 'duplicate sitemap URLs'
missing, extra = expected - set(locations), set(locations) - expected
assert not missing and not extra, (
    f'live sitemap differs from {built} (deployed an older build?): '
    f'{len(missing)} missing, e.g. {sorted(missing)[:3]}; {len(extra)} extra, e.g. {sorted(extra)[:3]}'
)
required_requests = {
    '/': ('preset', 'quickstart'),
    '/docs': ('preset', 'quickstart'),
    '/mantra-api': ('preset', 'featured-mantra'),
    '/sacred-audio-api': ('preset', 'sacred-audio'),
    '/books-api': ('preset', 'upanishads'),
    '/astrology-api': ('operation', 'positions'),
    '/astrology-api/daily-panchang': ('operation', 'daily-panchang'),
    '/astrology-api/instant-panchang': ('operation', 'panchang'),
    '/astrology-api/planetary-positions': ('operation', 'positions'),
    '/library/books/bhagavad-gita': ('preset', 'book-reader'),
    '/library/books/isha-upanishad': ('preset', 'upanishads'),
    '/library/books/katha-upanishad': ('preset', 'upanishads'),
    '/library/books/kena-upanishad': ('preset', 'upanishads'),
    '/library/books/mandukya-upanishad': ('preset', 'upanishads'),
    '/library/books/upanishads': ('preset', 'upanishads'),
    '/library/books/mundaka-upanishad': ('preset', 'upanishads'),
    '/library/books/yoga-sutras': ('preset', 'book-reader'),
    '/library/mantras/aham-vaishvanaro-bhuthva': ('preset', 'featured-mantra'),
    '/docs/guides/upanishads': ('preset', 'upanishads'),
    '/docs/guides/search-mantras': ('preset', 'search-mantras'),
    '/docs/guides/sacred-audio': ('preset', 'sacred-audio'),
    '/docs/guides/featured-mantra': ('preset', 'featured-mantra'),
    '/docs/guides/book-reader': ('preset', 'book-reader'),
    '/docs/guides/daily-panchang': ('operation', 'daily-panchang'),
    '/docs/guides/vedic-birth-chart': ('operation', 'chart'),
}
assert {origin + path for path in required_requests} <= expected, (
    'a page with a required console request is not in the sitemap'
)
def check(url):
    status, headers, final, html = get(url)
    assert status == 200 and final == url, (url, status, final)
    head = Head()
    head.feed(html)
    assert head.canonicals == [url], (url, head.canonicals)
    assert not any('noindex' in value.lower() for value in head.robots + headers.get_all('X-Robots-Tag', [])), url
    path = urlsplit(url).path
    assert head.language == 'en', (url, head.language)
    assert not head.alternates, (url, head.alternates)
    if path in required_requests:
        key, value = required_requests[path]
        assert any(
            parse_qs(urlsplit(link).query).get(key) == [value]
            for link in head.console_requests
        ), (url, 'missing direct console request', key, value)
    return head

signups = set()
console_requests = set()
with ThreadPoolExecutor(8) as pool:
    for head in pool.map(check, sorted(expected)):
        signups.update(head.signup)
        console_requests.update(head.console_requests)
for old, new in {
    '/mantra-shloka-api': '/mantra-api',
    '/shastra-books-api': '/books-api',
    '/implementation': '/docs',
    '/access': '/contact',
    '/library/mantras/aham-vaishvanaro-bhutva': '/library/mantras/aham-vaishvanaro-bhuthva',
}.items():
    redirect, headers, _, _ = get(origin + old, follow=False)
    assert redirect in (301, 308) and headers.get('Location') in (new, origin + new), (old, redirect)
    status, _, final, _ = get(origin + old)
    assert status == 200 and final == origin + new, (old, status, final)
assert get(origin + '/docs/guides/unknown-release-check')[0] == 404
assert signups, 'No signup links in the sitemap pages'
signup_origins = set()
for signup in sorted(signups):
    url = urlsplit(signup)
    assert url.scheme == 'https' and url.path.endswith('/login'), signup
    signup_origins.add(url.netloc)
    assert 'next' not in parse_qs(url.query), ('try links must open the console directly', signup)
    assert get(signup)[0] == 200, signup
assert len(signup_origins) == 1, signup_origins
console_paths = {urlsplit(signup).path.removesuffix('/login') + '/docs' for signup in signups}
for link in sorted(console_requests):
    url = urlsplit(link)
    assert url.scheme == 'https' and url.netloc in signup_origins and url.path in console_paths, link
    status, headers, final, _ = get(link)
    assert status == 200 and final == link and 'noindex' in headers.get('X-Robots-Tag', ''), link
print(f'PASS: {len(expected)} index-eligible URLs, legacy redirects, true 404, {len(signups)} signup URLs and {len(console_requests)} direct console request URLs.')

if origin == 'https://www.mantrilo.com':
    path = '/docs?source=redirect-check'
    status, headers, _, body = get('https://mantrilo.com' + path, follow=False)
    if status == 200:
        head = Head()
        head.feed(body)
        assert head.canonicals == [origin + '/docs'], head.canonicals
        print('Apex marketing still serves HTML with a www canonical.')
    else:
        assert status in (301, 308) and headers.get('Location') == origin + path, (status, headers)
    status, headers, _, _ = get('https://mantrilo.com/console/login', follow=False)
    assert status == 200 and 'noindex' in headers.get('X-Robots-Tag', ''), status
