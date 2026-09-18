// 网站基本信息 —— 改这里就能改全站，不用碰其他文件
// 留空的字段不会显示出来，网站保持干净；填了才会出现对应模块。
export const site = {
  name: '赵鹏 · 作品集',
  title: '工作成果记录',
  description: '赵鹏的工作成果记录。',
  author: '赵鹏',

  // 首屏一句话：别人点进来第一眼看到的定位（建议写方向 + 擅长）
  intro: '把做过的项目，记成看得见的成果。',

  // 能力关键词，显示在名字下面，例：['微短剧后期', '项目统筹', '全流程交付']
  keywords: [] as string[],

  // 头像/职业照，在后台上传后填 '/images/你的文件名.jpg'，留空则不显示
  avatar: '',

  // 简历 PDF 地址，例：'/files/简历-赵鹏.pdf'，留空则不显示下载按钮
  resumeUrl: '',

  // 关于页正文，一段一个引号，例：['第一段…', '第二段…']
  about: [] as string[],

  email: 'zhaopeng6822@qq.com',

  // 访问统计（Cloudflare Web Analytics）。想知道有没有人看过你的作品集就留着，
  // 不想统计了就把引号里的内容清空，写成 '' 即可。
  analyticsToken: '4703ff56134b4c1f9eb5177ba1ebbe55',

  // 外部链接，例：{ name: 'GitHub', url: 'https://github.com/你的用户名' }
  links: [] as { name: string; url: string }[],
};
