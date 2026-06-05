app.post("/api/scout", (req, res) => {
  const { income, occupation, goal, season } = req.body;

  let message = "";

  if (occupation.includes("farmer")) {
    message = "Income is seasonal. Save during harvest months.";
  } else {
    message = "Income appears stable. Maintain consistent savings.";
  }

  res.json({
    insight: message,
    recommendation: goal === "loan"
      ? "Build savings before borrowing"
      : "Continue disciplined saving",
  });
});