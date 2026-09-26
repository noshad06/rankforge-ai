exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  let body = {};

  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: "Invalid JSON" })
    };
  }

  const username = String(body.username || "");
  const password = String(body.password || "");

  if (username === "ali" && password === "ABC321") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: "Admin login successful",
        username: "ali"
      })
    };
  }

  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "Invalid admin username or password"
    })
  };
};
