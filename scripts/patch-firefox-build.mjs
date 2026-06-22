import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputDir = "dist-firefox";
const assetsDir = join(outputDir, "assets");

const reactSetInnerHtmlPattern =
  /function\(e,t\)\{if\(e\.namespaceURI!=="http:\/\/www\.w3\.org\/2000\/svg"\|\|"innerHTML"in e\)e\.innerHTML=t;else\{for\(([$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*)=\1\|\|document\.createElement\("div"\),\1\.innerHTML="<svg>"\+t\.valueOf\(\)\.toString\(\)\+"<\/svg>",t=\1\.firstChild;e\.firstChild;\)e\.removeChild\(e\.firstChild\);for\(;t\.firstChild;\)e\.appendChild\(t\.firstChild\)\}\}/u;

const replacement = 'function(){throw Error("Raw HTML rendering is disabled in Simple New Tab.")}';

let patchedCount = 0;

for (const fileName of await readdir(assetsDir)) {
  if (!fileName.endsWith(".js")) {
    continue;
  }

  const filePath = join(assetsDir, fileName);
  const code = await readFile(filePath, "utf8");
  const nextCode = code.replace(reactSetInnerHtmlPattern, () => {
    patchedCount += 1;
    return replacement;
  });

  if (nextCode !== code) {
    await writeFile(filePath, nextCode);
  }
}

if (patchedCount !== 1) {
  throw new Error(`Expected to patch React raw HTML renderer once, patched ${patchedCount} time(s).`);
}

console.log("Patched Firefox build to disable unused raw HTML rendering.");
