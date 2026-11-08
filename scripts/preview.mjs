import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8' };
const pages = JSON.parse(await readFile('src/data/seo-pages.json','utf8'));
createServer(async (request, response) => {
  // Local QA stays nonindexable even when testing a production-mode export.
  response.setHeader('X-Robots-Tag','noindex, nofollow');
  response.setHeader('Cache-Control','no-store');
  response.setHeader('X-Content-Type-Options','nosniff');
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let canonical = pathname === '/index.html' ? '/' : pathname.replace(/\/$/,'').replace(/\.html$/,'');
    if (canonical === '') canonical = '/';
    if (pages[canonical] && pathname !== canonical) {
      response.writeHead(308,{Location:canonical+url.search}).end(); return;
    }
    if (pathname.endsWith('.conf') || ['/404.html','/_sitemap','/_sitemap.html','/+not-found','/+not-found.html'].includes(pathname)) throw new Error('Private build artifact');
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try { if ((await stat(file)).isDirectory()) file = path.join(file,'index.html'); }
    catch { if (!path.extname(file)) file += '.html'; }
    const body = await readFile(file);
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(body);
  } catch {
    response.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    try { response.end(await readFile(path.join(root,'404.html'))); }
    catch { response.end('Not found'); }
  }
}).listen(4187,'127.0.0.1',()=>console.log('Mantrilo local preview: http://localhost:4187 (loopback only, noindex)'));
