import markdownIt from "markdown-it";
const md = markdownIt({ html: true, linkify: true, typographer: true });
export default function (c) {
  ["src/images", "src/styles.css", "src/robots.txt", "src/_headers", "src/_redirects"].forEach((p) => c.addPassthroughCopy(p));
  c.setLibrary("md", md);
  c.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  c.addFilter("slug2", (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  c.addFilter("u", (p) => (p ? encodeURI(decodeURI(String(p))) : ""));
  c.addFilter("absUrl", (p, base) => (!p ? "" : /^https?:/.test(p) ? p : base.replace(/\/$/, "") + p));
  c.addFilter("year", () => new Date().getFullYear());
  return { dir: { input: "src", output: "_site", includes: "_includes", data: "_data" }, templateFormats: ["njk", "md"], markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
