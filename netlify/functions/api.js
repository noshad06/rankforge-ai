exports.handler = async (event) => {
  const path = event.path || "";

  if (event.httpMethod === "POST" && path.includes("/api/admin/login")) {
    let body = {};

    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid request" })
      };
    }

    const username = body.username || "";
    const password = body.password || "";

    if (username === "ali" && password === "ABC321") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "rankforge_admin=loggedin; Path=/; HttpOnly; SameSite=Lax"
        },
        body: JSON.stringify({
          ok: true,
          message: "Admin login successful"
        })
      };
    }

    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Invalid admin credentials"
      })
    };
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error: "API route not found"
    })
  };
};
