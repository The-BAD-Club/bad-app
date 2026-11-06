"""Turns legal/privacy.md and legal/terms.md into privacy.html and terms.html (run: python3 legal/make.py)."""
import markdown,os
here=os.path.dirname(os.path.abspath(__file__));root=os.path.dirname(here)
T='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · The BAD Club</title><meta name="description" content="{title} for the BAD App by The BAD Club LLC.">
<link rel="icon" href="favicon-32.png"><meta name="theme-color" content="#000000">
<style>:root{{color-scheme:light dark;--bg:#fff;--ink:#000;--muted:#6E6E6E;--line:#e5e5e5}}@media(prefers-color-scheme:dark){{:root{{--bg:#000;--ink:#fff;--muted:#969696;--line:#262626}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif}}
main{{max-width:680px;margin:0 auto;padding:28px 22px 64px}}a{{color:inherit}}
.top{{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase}}
.top b{{font-size:1.4rem;letter-spacing:.02em}}h2{{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:2.2rem;line-height:1.1;margin:0 0 6px}}
h2+p{{color:var(--muted);margin-top:0}}ul{{padding-left:20px}}li{{margin:6px 0}}p strong:only-child{{display:block;margin-top:26px;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase}}
footer{{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.8rem}}</style></head>
<body><main><div class="top"><b>BAD</b><a href="./">Back to the app</a></div>
{body}
<footer><b>The BAD Club LLC</b> · License No. 2649469.01 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></footer></main></body></html>
'''
for n,t in [('privacy','Privacy policy'),('terms','Terms of use')]:
    body=markdown.markdown(open(os.path.join(here,n+'.md')).read())
    open(os.path.join(root,n+'.html'),'w').write(T.format(title=t,body=body))
print('ok')
