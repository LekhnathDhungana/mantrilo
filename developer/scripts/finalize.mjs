import { readdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
for(const file of await readdir('dist')){
 if(!file.endsWith('.html'))continue;
 let html=await readFile(`dist/${file}`,'utf8');
 if(!html.includes('name="robots"'))html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"/></head>');
 await writeFile(`dist/${file}`,html);
}
await copyFile('dist/+not-found.html','dist/404.html');await rm('dist/_sitemap.html',{force:true});await rm('dist/+not-found.html',{force:true});
await rm('dist/(console)',{recursive:true,force:true});await rm('dist/(console).html',{force:true});
await writeFile('dist/robots.txt','User-agent: *\nDisallow: /\n');
console.log('Private console export ready. Every HTML route is noindex.');
