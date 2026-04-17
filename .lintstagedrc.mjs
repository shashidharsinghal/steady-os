export default {
  "*.{ts,tsx}": (files) => {
    const lintable = files.filter((f) => !f.endsWith(".d.ts"));
    const cmds = [`prettier --write ${files.join(" ")}`];
    if (lintable.length > 0) {
      cmds.push(`eslint --fix --max-warnings=0 ${lintable.join(" ")}`);
    }
    return cmds;
  },
  "*.{js,mjs,jsx}": ["prettier --write"],
  "*.{json,md,yaml,yml,css}": ["prettier --write"],
};
