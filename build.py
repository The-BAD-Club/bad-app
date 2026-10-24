"""Builds index.html for GitHub Pages from the shared app source in /home/claude/src."""
SRC='/home/claude/src/'
FB='https://www.gstatic.com/firebasejs/10.12.2/'
h=open(SRC+'1-head.html').read()
css=open('src/gate.css').read()
h=h.replace('</style>',css+'\n</style>',1)
h=h.replace('<span>Community over competition · #MakeBadGoodAgain</span></footer>',
 '<span>Community over competition · #MakeBadGoodAgain</span><button class="signout" onclick="badSignOut()">Sign out</button></footer>',1)
head=''.join(f'<script src="{FB}{m}"></script>\n' for m in ['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'])
head+='<script src="config.js"></script>\n'
js="".join(open(SRC+f).read()+"\n" for f in ['0-logo.js','0-placeholders.js'])
js+=open('src/fb-shim.js').read()+"\n"
js+="".join(open(SRC+f).read()+"\n" for f in ['2-core.js','3-create.js','4-views.js','8-courts.js','9-checkin.js','5-admin.js','10-shop.js','6-brand.js','7-boot.js'])
doc=h if h.lstrip().lower().startswith('<!doctype') else '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#000000">\n'+h
out=doc+"\n"+head+"<script>\n"+js+"</script>\n"
open('index.html','w').write(out);open('/tmp/claude-0/-home-claude/f6b3cde0-93ca-5963-9c82-01167234d9c2/scratchpad/web.js','w').write(js)
print(len(out))
