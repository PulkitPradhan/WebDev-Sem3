const fs = require("fs");
const fileName = "sample.txt";

fs.writeFileSync(fileName, "Hello, this is my first file.");
console.log("File created successfully.");


const data = fs.readFileSync(fileName, "utf-8");
console.log("File content:", data);


fs.appendFileSync(fileName, "\nThis content was added later.");
console.log("File updated successfully.");


const updatedData = fs.readFileSync(fileName, "utf-8");
console.log("Updated content:", updatedData);


fs.unlinkSync(fileName);
console.log("File deleted successfully.");