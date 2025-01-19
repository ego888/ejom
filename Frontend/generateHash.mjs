import bcrypt from 'bcrypt';
const password = 'test';  // Replace with the password you want to use
bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log(hash);  // Use this hash in the next step
});
