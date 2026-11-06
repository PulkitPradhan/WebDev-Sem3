const io = require("socket.io-client");

const BASE_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  await delay(1000);

  const uniqueId = Date.now().toString().slice(-4);
  const testUser = {
    username: `victor_${uniqueId}`,
    email: `victor_${uniqueId}@example.com`,
    password: "123456"
  };

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testUser)
  });
  const signupData = await signupRes.json();
  console.log("Signup Response:", signupRes.status, signupData);

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  const loginData = await loginRes.json();
  console.log("Login Response:", loginRes.status, loginData);
  const token = loginData.token;

  const noTokenRes = await fetch(`${BASE_URL}/api/notes`);
  const noTokenData = await noTokenRes.json();
  console.log("Blocked without token:", noTokenRes.status, noTokenData);

  const note1Res = await fetch(`${BASE_URL}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "My First Note",
      content: "This is my first note of web dev -III"
    })
  });
  const note1Data = await note1Res.json();
  console.log("Created Note 1:", note1Res.status, note1Data);

  const note2Res = await fetch(`${BASE_URL}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "My Second Note",
      content: "This is my second note of web dev -III"
    })
  });
  const note2Data = await note2Res.json();
  console.log("Created Note 2:", note2Res.status, note2Data);

  const getNotesRes = await fetch(`${BASE_URL}/api/notes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const getNotesData = await getNotesRes.json();
  console.log("Fetched Notes:", getNotesRes.status, getNotesData);

  const socketAditi = io(BASE_URL);
  const socketRohan = io(BASE_URL);

  await delay(500);

  socketAditi.emit("joinRoom", { room: "general", username: "Aditi" });
  await delay(200);

  socketRohan.emit("joinRoom", { room: "general", username: "Rohan" });
  await delay(200);

  socketAditi.emit("chatMessage", {
    room: "general",
    username: "Aditi",
    message: "Hey team, backend is ready 🚀"
  });
  await delay(300);

  socketRohan.emit("chatMessage", {
    room: "general",
    username: "Rohan",
    message: "Testing chat now..."
  });
  await delay(300);

  socketAditi.emit("chatMessage", {
    room: "general",
    username: "Aditi",
    message: "Messages arriving in real time 💬"
  });
  await delay(500);

  socketAditi.disconnect();
  socketRohan.disconnect();

  console.log("All tests and chat simulation completed successfully.");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
