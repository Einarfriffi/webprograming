const express = require("express");

//Import a body parser module to be able to access the request body as json
const bodyParser = require("body-parser");

const cors = require("cors");

const app = express();
const apiPath = "/api/";
const version = "v1";
const port = process.env.PORT || 3000;

//Tell express to use the body parser module
app.use(bodyParser.json());

//Tell express to use cors -- enables CORS for this backend
app.use(cors());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Function to generate a random game sequence
const generateSequence = (level) => {
  const colors = ["red", "yellow", "green", "blue"];
  return Array.from(
    { length: level },
    () => colors[Math.floor(Math.random() * colors.length)]
  );
};

// Game state variables
let gameState = {
  highScore: 0,
  level: 1,
  sequence: generateSequence(1),
};

// Router setup for API versioning
const apiRouter = express.Router();
app.use(apiPath + version, apiRouter);

// GET game state (current level & sequence)
apiRouter.get("/game-state", (req, res) => {
  res.status(200).json(gameState);
});

// PUT - Reset game state
apiRouter.put("/game-state", (req, res) => {
  gameState.level = 1;
  gameState.sequence = generateSequence(1);
  res.status(200).json({ message: "Game reset successfully", gameState });
});

// POST - Post sequence to current game-state
apiRouter.post("/game-state/sequence", (req, res) => {
  // Validate the user input - Check if the sequence is present
  if (
    !req.body ||
    !Array.isArray(req.body.sequence) ||
    req.body.sequence.length <= 0
  ) {
    return res
      .status(400)
      .json({ message: "A non-empty sequence array is required." });
  }
  /*Validate the user input - Check if the sequence length is of the correct 
  length accoring to the game level*/
  if (req.body.sequence.length !== gameState.level) {
    return res.status(400).json({
      message: `Sequence must be exactly ${gameState.level} items long.`,
    });
  }

  const { sequence } = req.body;

  // Check if user sequence is the same as the current game state sequence
  if (JSON.stringify(sequence) === JSON.stringify(gameState.sequence)) {
    // Update the high score if a new high score has been reached
    if (gameState.level > gameState.highScore) {
      gameState.highScore = gameState.level;
    }

    gameState.level++;
    gameState.sequence = generateSequence(gameState.level);

    return res.status(200).json({
      gameState,
    });
  } else {
    // Restart the game state:
    gameState.level = 1;
    gameState.sequence = generateSequence(1);
    return res.status(400).json({
      message: "Incorrect sequence. Restarting at level 1.",
      gameState,
    });
  }
});

// 404 Handler for unsupported routes
app.use((req, res) => {
  res.status(404).json({ error: "Resource not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  next(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server
app.listen(port, () => {
  console.log(`Simon Says app running on port ${port}`);
});
