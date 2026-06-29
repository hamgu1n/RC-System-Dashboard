const { execSync } = require("child_process");

exports.default = async ({ appOutDir }) => {
  if (process.platform !== "darwin") return;

  console.log("Stripping xattrs from", appOutDir);
  execSync(`xattr -cr "${appOutDir}"`);
};
