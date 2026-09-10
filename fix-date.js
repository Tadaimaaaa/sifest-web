const fs = require("fs");
const path = require("path");

const eventDirs = ["seminar", "mtq", "futsal", "esport", "bazaar"];
const basePath = "d:/HMJ SI/Festival HMJ SI/Website/sifest-web/src/app/(dashboard)/event/";

eventDirs.forEach(dir => {
  const filePath = path.join(basePath, dir, "page.tsx");
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    
    const updatedContent = content.replace(
      /Tanggal Pelaksanaan<\/label>[\s\n]*<input[\s\n]*type="text"/g,
      "Tanggal Pelaksanaan</label>\n                <input \n                  type=\"date\""
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, "utf8");
      console.log("Updated " + filePath);
    }
  }
});

