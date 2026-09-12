const crypto = require("crypto");

const input = process.argv[2];
const rolls = input === undefined ? 1 : Number(input);

if (!Number.isInteger(rolls) || rolls < 1) {
  console.log("Please provide a valid positive number of rolls.");
  process.exit(1);
}

console.log("Starting dice rolls...");

for (let i = 1; i <= rolls; i++) {
  const dice = crypto.randomInt(1, 7);

  console.log(`Roll ${i}: Dice Rolled: ${dice}`);
}

console.log("Dice rolling completed.");