// 全站信息现在放在 src/site.json 里，在后台「站点信息」那一栏就能改，不用碰代码。
// 这个文件只负责把 JSON 读出来给各个页面用，别在这里改内容。
import data from './site.json';

export const site = data as {
  name: string;
  title: string;
  description: string;
  author: string;
  intro: string;
  keywords: string[];
  avatar: string;
  resumeUrl: string;
  about: string[];
  email: string;
  analyticsToken: string;
  links: { name: string; url: string }[];
};
