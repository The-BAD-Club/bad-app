#!/usr/bin/env bash
# Runs the rules tests inside the emulator and turns failures into GitHub annotations (readable without log access).
cd "$(dirname "$0")"
node --test --test-reporter=tap rules.test.mjs > tap.txt 2>&1; code=$?
cat tap.txt
node -e '
const t=require("fs").readFileSync("tap.txt","utf8").split("\n");let cur=null,buf=[];
const flush=()=>{if(cur){const msg=buf.join(" ").replace(/\s+/g," ").slice(0,900);console.log("::error title="+cur.replace(/[:,]/g," ")+"::"+msg)}cur=null;buf=[]};
for(const l of t){const m=l.match(/^\s*not ok \d+ - (.*)/);if(m){flush();cur=m[1];continue}if(/^\s*ok \d+/.test(l)){flush();continue}if(cur&&/error|expected|message|Null value|Property|denied|evaluation|code:/i.test(l))buf.push(l.trim())}flush();
const p=t.find(l=>/^# pass/.test(l)),f=t.find(l=>/^# fail/.test(l));console.log("::notice title=Rules tests::"+(p||"")+" "+(f||""));'
for f in ../firestore-debug.log firestore-debug.log; do [ -f "$f" ] && grep -iE "error|line [0-9]+" "$f" | head -20 | sed 's/^/::warning title=emulator::/'; done
exit $code
