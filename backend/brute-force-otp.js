const bcrypt = require('bcryptjs');

const hash = "$2b$10$c5A.38hzu7nuZ53jGfUi.eA1rLlCuOMS7miSgojqj1Nt0OE3rR94O";

function main() {
  console.log("Checking if the OTP is a common default code...");
  const defaults = ["123456", "000000", "111111", "999999", "654321", "12345", "00000"];
  for (const code of defaults) {
    if (bcrypt.compareSync(code, hash)) {
      console.log(`FOUND default OTP: ${code}`);
      return;
    }
  }

  console.log("Brute-forcing 6-digit codes (000000 to 999999)...");
  // Let's check ranges of 100,000 numbers at a time
  for (let i = 0; i <= 999999; i++) {
    const code = String(i).padStart(6, '0');
    if (bcrypt.compareSync(code, hash)) {
      console.log(`FOUND OTP: ${code}`);
      return;
    }
    if (i % 100000 === 0 && i > 0) {
      console.log(`Checked up to ${i}...`);
    }
  }
  console.log("Not found in 6-digit codes.");
}

main();
