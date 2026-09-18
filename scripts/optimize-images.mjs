/**
 * 构建前自动压缩 public/images 里的封面图。
 *
 * 为什么需要：在后台上传的封面常常是手机 / 微信原图（动辄 3MB、3000px 宽），
 * 直接放到静态站上，封面要好几秒才出来。这个脚本在每次构建前把大图压到
 * 「网页够用」的尺寸（最宽 1600px、300KB 以内），原格式不变，路径不变，
 * 所以后台里填的封面地址不用改。
 *
 * 安全：只处理 public/images；压出来更小才覆盖；sharp 不存在时直接跳过。
 */
import { readdir, readFile, writeFile, stat, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'public', 'images');

const MAX_WIDTH = 1600;
const SIZE_LIMIT = 300 * 1024;
const START_QUALITY = 82;
const MIN_QUALITY = 58;

const require = createRequire(import.meta.url);

/**
 * sharp 是 astro 的可选依赖，用 pnpm 安装时它藏在 astro 自己的依赖目录里，
 * 顶层 import('sharp') 会找不到。这里多试几条解析路径。
 */
async function loadSharp() {
  const candidates = [];
  try {
    candidates.push(require.resolve('sharp'));
  } catch {
    /* 顶层没有 */
  }
  try {
    // 从 astro 包的位置再解析一次（pnpm 的严格目录结构下 sharp 在这里）
    const astroPkg = require.resolve('astro/package.json');
    candidates.push(createRequire(astroPkg).resolve('sharp'));
  } catch {
    /* 也找不到就算了 */
  }
  for (const c of candidates) {
    try {
      return (await import(c.startsWith('file:') ? c : `file:///${c.replace(/\\/g, '/')}`)).default;
    } catch {
      /* 换下一个 */
    }
  }
  return null;
}

const sharp = await loadSharp();
if (!sharp) {
  console.log('[images] 未找到 sharp，跳过图片压缩（不影响构建）');
  process.exit(0);
}

let files = [];
try {
  files = await readdir(IMG_DIR);
} catch {
  console.log('[images] public/images 不存在，跳过');
  process.exit(0);
}

const targets = files.filter((f) => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));

if (targets.length === 0) {
  console.log('[images] 没有需要处理的图片');
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;

for (const file of targets) {
  const src = path.join(IMG_DIR, file);
  const before = await stat(src);
  totalBefore += before.size;

  // 先读进内存再交给 sharp：直接传路径会让 sharp 一直握着文件句柄，
  // Windows 上紧接着覆盖同名文件会失败（UNKNOWN / EBUSY）。
  const input = await readFile(src);

  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch (e) {
    console.log(`[images] 跳过 ${file}（读不出来：${e.message}）`);
    totalAfter += before.size;
    continue;
  }

  const tooWide = (meta.width ?? 0) > MAX_WIDTH;
  const tooBig = before.size > SIZE_LIMIT;

  if (!tooWide && !tooBig) {
    totalAfter += before.size;
    continue;
  }

  const isPng = path.extname(file).toLowerCase() === '.png';
  let quality = START_QUALITY;
  let outBuf;

  while (true) {
    const pipeline = sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true });
    outBuf = await (isPng
      ? pipeline.png({ quality, compressionLevel: 9, effort: 6, palette: true })
      : pipeline.jpeg({ quality, mozjpeg: true, progressive: true })
    ).toBuffer();
    if (outBuf.length <= SIZE_LIMIT || quality <= MIN_QUALITY) break;
    quality -= 8;
  }

  if (outBuf.length < before.size) {
    await writeFile(`${src}.tmp`, outBuf);
    await rename(`${src}.tmp`, src);
    console.log(
      `[images] ${file}: ${(before.size / 1024).toFixed(0)}KB → ${(outBuf.length / 1024).toFixed(0)}KB` +
        (tooWide ? `（${meta.width}px → ${MAX_WIDTH}px）` : '')
    );
    totalAfter += outBuf.length;
  } else {
    console.log(`[images] ${file}: 压完没变小，保留原图`);
    totalAfter += before.size;
  }
}

console.log(
  `[images] 完成：封面总体积 ${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB`
);
