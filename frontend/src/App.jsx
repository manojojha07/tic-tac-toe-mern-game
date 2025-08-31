import React, { useState, useEffect } from "react";
import Square from "./Square/Square";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import Navbar from "./Componets/Navbar";
import About from "./Componets/About";
import Blog from "./Componets/Blog";
import HowToPlay from "./Componets/HowToPlay";
import Play from "./Componets/Play";

const initialBoard = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

const App = () => {
  const [gameState, setGameState] = useState(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState("circle");
  const [finishedState, setFinishedState] = useState(false);
  const [finishedArrayState, setFinishedArrayState] = useState([]);
  const [playOnline, setPlayOnline] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState(null);
  const [playingAs, setPlayingAs] = useState(null);

  // Check if a player has won or if it's a draw
  const checkWinner = () => {
    // Rows
    for (let row = 0; row < 3; row++) {
      if (
        gameState[row][0] &&
        gameState[row][0] === gameState[row][1] &&
        gameState[row][1] === gameState[row][2]
      ) {
        setFinishedArrayState([row * 3, row * 3 + 1, row * 3 + 2]);
        return gameState[row][0];
      }
    }
    // Columns
    for (let col = 0; col < 3; col++) {
      if (
        gameState[0][col] &&
        gameState[0][col] === gameState[1][col] &&
        gameState[1][col] === gameState[2][col]
      ) {
        setFinishedArrayState([col, col + 3, col + 6]);
        return gameState[0][col];
      }
    }
    // Diagonals
    if (
      gameState[0][0] &&
      gameState[0][0] === gameState[1][1] &&
      gameState[1][1] === gameState[2][2]
    ) {
      setFinishedArrayState([0, 4, 8]);
      return gameState[0][0];
    }
    if (
      gameState[0][2] &&
      gameState[0][2] === gameState[1][1] &&
      gameState[1][1] === gameState[2][0]
    ) {
      setFinishedArrayState([2, 4, 6]);
      return gameState[0][2];
    }

    const isDraw = gameState.flat().every((e) => e === "circle" || e === "cross");
    if (isDraw) return "draw";

    return null;
  };

  // Check for winner whenever board changes
  useEffect(() => {
    const winner = checkWinner();
    if (winner) {
      setFinishedState(winner);
    }
  }, [gameState]);

  // Setup socket events
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setPlayOnline(true);
      setWaitingForOpponent(true);
    };

    const onOpponentNotFound = () => {
      setOpponentName(false);
    };

    const onOpponentFound = (data) => {
      setPlayingAs(data.playingAs);
      setOpponentName(data.opponentName);
      setWaitingForOpponent(false);
      setGameState(initialBoard);
      setFinishedState(false);
      setFinishedArrayState([]);
      setCurrentPlayer("circle");
    };

    const onOpponentLeft = () => {
      setFinishedState("opponentLeftMatch");
    };

    const onMove = (data) => {
      const id = data.state.id;
      setGameState((prevState) => {
        const newState = prevState.map((row) => [...row]);
        const rowIndex = Math.floor(id / 3);
        const colIndex = id % 3;
        newState[rowIndex][colIndex] = data.state.sign;
        return newState;
      });
      setCurrentPlayer(data.state.sign === "circle" ? "cross" : "circle");
    };

    socket.on("connect", onConnect);
    socket.on("OpponentNotFound", onOpponentNotFound);
    socket.on("OpponentFound", onOpponentFound);
    socket.on("opponentLeftMatch", onOpponentLeft);
    socket.on("playerMoveFromServer", onMove);

    return () => {
      socket.off("connect", onConnect);
      socket.off("OpponentNotFound", onOpponentNotFound);
      socket.off("OpponentFound", onOpponentFound);
      socket.off("opponentLeftMatch", onOpponentLeft);
      socket.off("playerMoveFromServer", onMove);
      socket.disconnect();
    };
  }, [socket]);

  // Ask player for name
  const takePlayerName = async () => {
    const result = await Swal.fire({
      title: "Enter your name",
      input: "text",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You need to write something!";
        }
      },
    });
    return result;
  };

  // Play online click
  const playOnlineClick = async () => {
    const result = await takePlayerName();
    if (!result.isConfirmed) return;

    const username = result.value;
    setPlayerName(username);
    setWaitingForOpponent(true);

    // https://tic-tac-toe-mern-game.onrender.com
    const newSocket = io("https://tic-tac-toe-mern-game.onrender.com", {
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      newSocket.emit("request_to_play", {
        playerName: username,
      });
    });

    setSocket(newSocket);
  };

  // Copy link to clipboard
  const handleShareClick = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    Swal.fire("Copied!", "Share this URL with friend.", "success");
  };

  // === UI RENDERING ===

  if (waitingForOpponent && !opponentName) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-gray-900 text-white">
        <p className="text-2xl">Waiting for opponent...</p>
      </div>
    );
  }

  if (playOnline && opponentName) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-gray-900 text-white py-10">
        <div className="flex justify-between w-[440px] mb-6 text-center font-semibold">
          <div
            className={`p-1 w-[120px] rounded-bl-[50px] rounded-tr-[50px] ${
              currentPlayer === playingAs ? "bg-[#3fa7f0]" : "bg-purple-500"
            }`}
          >
            {playerName}
          </div>
          <div
            className={`p-1 w-[120px] rounded-bl-[50px] rounded-tr-[50px] ${
              currentPlayer !== playingAs ? "bg-pink-700" : "bg-gray-400"
            }`}
          >
            {opponentName}
          </div>
        </div>

        <h1 className="text-xl font-bold p-2 w-[340px] rounded-lg mb-4 bg-gray-700 text-center">
          Tic Tac Toe
        </h1>

        <div className="grid grid-cols-3 gap-2">
          {gameState.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <Square
                key={rowIndex * 3 + colIndex}
                id={rowIndex * 3 + colIndex}
                currentElement={cell}
                gameState={gameState}
                setGameState={setGameState}
                currentPlayer={currentPlayer}
                setCurrentPlayer={setCurrentPlayer}
                finishedState={finishedState}
                finishedArrayState={finishedArrayState}
                socket={socket}
                playingAs={playingAs}
              />
            ))
          )}
        </div>

        {finishedState && finishedState !== "draw" && finishedState !== "opponentLeftMatch" && (
          <h3 className="mt-4 text-2xl font-bold">
            {finishedState === playingAs ? "You" : finishedState} 🎉 won the game
          </h3>
        )}

        {finishedState === "draw" && (
          <h3 className="mt-4 text-2xl font-bold">Match Draw ☺️ try again </h3>
        )}

        {finishedState === "opponentLeftMatch" && (
          <h3 className="mt-4 text-2xl font-bold">
            🥇 You won the match. 🤡 Opponent has left.
          </h3>
        )}

        {!finishedState && opponentName && (
          <h3 className="mt-4 text-2xl font-bold">
            You are playing against 🤼‍♂️ {opponentName}
          </h3>
        )}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div id="about">
        <About />
      </div>

      <div
        id="play"
        className="min-h-screen bg-gray-600 py-10 w-full px-4 md:px-[80px] flex flex-col items-center justify-center"
      >
        <h1 className="text-2xl text-center text-white font-extrabold py-10">
          Play With Friend
        </h1>
        <Play />
        <br />
        <div className="flex gap-4 w-full md:w-1/2">
          <button
            onClick={playOnlineClick}
            className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded text-center hover:bg-purple-700 transition text-lg"
          >
            Play
          </button>
          <button
            onClick={handleShareClick}
            className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded text-center hover:bg-green-700 transition text-lg"
          >
            Share
          </button>
        </div>
      </div>

      <div id="blog">
        <Blog />
      </div>

      <div id="how-to-play">
        <HowToPlay />
      </div>
    </>
  );
};

export default App;
