/**
 * 自动压缩 public/images 里的图片（封面、头像、后台上传的任何图）。
 *
 * 为什么需要：后台上传的常常是手机 / 微信原图（动辄 3MB、3000px 宽），
 * 直接放到静态站上要好几秒才出来。每次构建都会自动压到「网页够用」的尺寸：
 * 主图最宽 1600px、300KB 以内；另外生成 800px（列表卡片）和 400px（头像）
 * 两档小图。原格式和路径都不变，后台里填的地址不用改。
 *
 * 这个文件既能单独运行（node scripts/optimize-images.mjs），也被
 * astro.config.mjs 里的 integration 在每次构建开始时调用——两条路都覆盖，
 * 免得哪天构建命令改了就漏掉压缩。
 *
 * 安全：只处理 public/images；压出来更小才覆盖；sharp 找不到就跳过。
 */
import { readdir, readFile, writeFile, stat, rename, unlink, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'public', 'images');

const MAX_WIDTH = 1600;
const SIZE_LIMIT = 300 * 1024;
const START_QUALITY = 82;
const MIN_QUALITY = 58;
const SMALL_WIDTH = 800; // 列表卡片实际只显示 500px 左右，800 足够（含 1.5 倍屏）
const SMALL_LIMIT = 150 * 1024;
const TINY_WIDTH = 400; // 头像之类的小图，网页上最多也就显示 100 出头
const TINY_LIMIT = 60 * 1024;

const require = createRequire(import.meta.url);

const exists = async (p) => {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
};

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

export async function optimizeImages() {
  const sharp = await loadSharp();
  if (!sharp) {
    console.log('[images] 未找到 sharp，跳过图片压缩（不影响构建）');
    return;
  }

  let files = [];
  try {
    files = await readdir(IMG_DIR);
  } catch {
    console.log('[images] public/images 不存在，跳过');
    return;
  }

  // 跳过自己生成的小图（-800 / -400），否则会给小图再生小图，越攒越多
  const targets = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) return false;
    return !/-(800|400)$/.test(path.basename(f, ext));
  });

  if (targets.length === 0) {
    console.log('[images] 没有需要处理的图片');
    return;
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

    const isPng = path.extname(file).toLowerCase() === '.png';
    const tooWide = (meta.width ?? 0) > MAX_WIDTH;
    const tooBig = before.size > SIZE_LIMIT;

    if (tooWide || tooBig) {
      let quality = isPng ? 85 : START_QUALITY;
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
    } else {
      totalAfter += before.size;
    }

    // 列表卡片用：卡片只有 500px 宽，没必要加载 1600px 的
    const smallName = file.replace(/\.(jpe?g|png)$/i, (ext) => `-${SMALL_WIDTH}${ext}`);
    const smallPath = path.join(IMG_DIR, smallName);
    if ((meta.width ?? 0) > SMALL_WIDTH + 100) {
      let q = isPng ? 85 : 80;
      let smallBuf;
      while (true) {
        const pipeline = sharp(input, { failOn: 'none' })
          .rotate()
          .resize({ width: SMALL_WIDTH, withoutEnlargement: true });
        smallBuf = await (isPng
          ? pipeline.png({ quality: q, compressionLevel: 9, effort: 6, palette: true })
          : pipeline.jpeg({ quality: q, mozjpeg: true, progressive: true })
        ).toBuffer();
        if (smallBuf.length <= SMALL_LIMIT || q <= MIN_QUALITY) break;
        q -= 8;
      }
      await writeFile(smallPath, smallBuf);
      console.log(`[images] + ${smallName}: ${(smallBuf.length / 1024).toFixed(0)}KB（列表卡片用）`);
    } else if (await exists(smallPath)) {
      await unlink(smallPath);
    }

    // 头像这类小尺寸显示用：统一存成 jpg，比 png 小得多；
    // 前端找不到这张就自动退回原图
    const tinyName = file.replace(/\.(jpe?g|png)$/i, `-${TINY_WIDTH}.jpg`);
    const tinyPath = path.join(IMG_DIR, tinyName);
    if ((meta.width ?? 0) > TINY_WIDTH + 40) {
      let q = 80;
      let tinyBuf;
      while (true) {
        tinyBuf = await sharp(input, { failOn: 'none' })
          .rotate()
          .resize({ width: TINY_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: q, mozjpeg: true, progressive: true })
          .toBuffer();
        if (tinyBuf.length <= TINY_LIMIT || q <= MIN_QUALITY) break;
        q -= 8;
      }
      await writeFile(tinyPath, tinyBuf);
      console.log(`[images] + ${tinyName}: ${(tinyBuf.length / 1024).toFixed(0)}KB（头像等小图用）`);
    } else if (await exists(tinyPath)) {
      await unlink(tinyPath);
    }
  }

  console.log(
    `[images] 完成：图片总体积 ${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB`
  );
}

// 只有直接 `node scripts/optimize-images.mjs` 时才自动跑；
// 被 astro.config.mjs import 时不跑，由构建钩子调用。
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await optimizeImages();
}
