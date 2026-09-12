// CLI Calculator using process.argv

const operation = process.argv[2];
const num1 = Number(process.argv[3]);
const num2 = Number(process.argv[4]);

let result;

if (operation === "add") {
  result = num1 + num2;
} else if (operation === "subtract") {
  result = num1 - num2;
} else if (operation === "multiply") {
  result = num1 * num2;
} else if (operation === "divide") {
  if (num2 === 0) {
    console.log("Error: Cannot divide by zero");
    process.exit(1);
  }
  result = num1 / num2;
} else {
  console.log("Invalid operation");
  process.exit(1);
}

console.log("Result:", result);