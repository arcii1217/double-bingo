import React, { useState, useEffect } from 'react';
import { RotateCcw, Move, RefreshCw } from 'lucide-react';

type Color = 'red' | 'yellow' | 'blue' | 'none';
type Tile = { front: Color; back: Color; owner: number } | null;
type Board = Tile[][];
type GamePhase = 'placement' | 'movement';
type GameMode = 'pvp' | 'ai';

const COLOR_MAP = {
  red: '#EF4444',
  yellow: '#EAB308',
  blue: '#3B82F6',
  none: '#9CA3AF'
};

const DoubleBingoGame = () => {
  const [board, setBoard] = useState<Board>(Array(4).fill(null).map(() => Array(4).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [phase, setPhase] = useState<GamePhase>('placement');
  const [moveCount, setMoveCount] = useState(0);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [actionMode, setActionMode] = useState<'place' | 'move' | 'flip' | null>(null);
  const [flipPlacement, setFlipPlacement] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  const [player1Tiles, setPlayer1Tiles] = useState({
    yellowRed: 3, blueYellow: 3, redBlue: 3
  });
  const [player2Tiles, setPlayer2Tiles] = useState({
    yellowRed: 3, blueYellow: 3, redBlue: 3
  });
  
  const [player1Target] = useState<Color>(['red', 'yellow', 'blue'][Math.floor(Math.random() * 3)] as Color);
  const [player2Target] = useState<Color>(['red', 'yellow', 'blue'].filter(c => c !== player1Target)[Math.floor(Math.random() * 2)] as Color);
  
  const [winner, setWinner] = useState<number | null>(null);
  const [selectedTileType, setSelectedTileType] = useState<string | null>(null);

  const checkBingo = (player: number, targetColor: Color): boolean => {
    for (let i = 0; i < 4; i++) {
      if (board[i].every(cell => cell?.front === targetColor)) return true;
    }
    for (let j = 0; j < 4; j++) {
      if (board.every(row => row[j]?.front === targetColor)) return true;
    }
    if (board.every((row, i) => row[i]?.front === targetColor)) return true;
    if (board.every((row, i) => row[3 - i]?.front === targetColor)) return true;
    return false;
  };

  useEffect(() => {
    if (checkBingo(1, player1Target)) {
      setWinner(1);
    } else if (checkBingo(2, player2Target)) {
      setWinner(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const getEmptyCells = (): [number, number][] => {
    const empty: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (!board[i][j]) empty.push([i, j]);
      }
    }
    return empty;
  };

  const evaluateBoard = (testBoard: Board, aiColor: Color, playerColor: Color): number => {
    let aiScore = 0;
    let playerScore = 0;
    
    // 승리 조건 체크
    const checkWin = (color: Color): boolean => {
      for (let i = 0; i < 4; i++) {
        if (testBoard[i].every(cell => cell?.front === color)) return true;
      }
      for (let j = 0; j < 4; j++) {
        if (testBoard.every(row => row[j]?.front === color)) return true;
      }
      if (testBoard.every((row, i) => row[i]?.front === color)) return true;
      if (testBoard.every((row, i) => row[3 - i]?.front === color)) return true;
      return false;
    };
    
    if (checkWin(aiColor)) return 10000;
    if (checkWin(playerColor)) return -10000;
    
    // 라인별 점수 계산
    const evaluateLine = (colors: (Color | undefined)[]): { ai: number; player: number } => {
      const aiCount = colors.filter(c => c === aiColor).length;
      const playerCount = colors.filter(c => c === playerColor).length;
      const emptyCount = colors.filter(c => !c).length;
      
      let ai = 0, player = 0;
      
      if (aiCount > 0 && playerCount === 0) {
        ai = aiCount ** 3 + emptyCount * 2;
      }
      if (playerCount > 0 && aiCount === 0) {
        player = playerCount ** 3 + emptyCount * 2;
      }
      
      return { ai, player };
    };
    
    // 가로
    for (let i = 0; i < 4; i++) {
      const colors = testBoard[i].map(cell => cell?.front);
      const score = evaluateLine(colors);
      aiScore += score.ai;
      playerScore += score.player;
    }
    
    // 세로
    for (let j = 0; j < 4; j++) {
      const colors = testBoard.map(row => row[j]?.front);
      const score = evaluateLine(colors);
      aiScore += score.ai;
      playerScore += score.player;
    }
    
    // 대각선
    const diag1 = testBoard.map((row, i) => row[i]?.front);
    const diag2 = testBoard.map((row, i) => row[3 - i]?.front);
    const score1 = evaluateLine(diag1);
    const score2 = evaluateLine(diag2);
    aiScore += score1.ai + score2.ai;
    playerScore += score1.player + score2.player;
    
    return aiScore - playerScore * 1.2; // 방어에 더 가중치
  };

  const getAllPossibleMoves = (testBoard: Board, player: number, tiles: any) => {
    const moves: any[] = [];
    
    // 착수 가능한 수
    const availableTiles: { type: string; front: Color; back: Color }[] = [];
    if (tiles.yellowRed > 0) {
      availableTiles.push({ type: 'yellowRed', front: 'yellow', back: 'red' });
      availableTiles.push({ type: 'yellowRed', front: 'red', back: 'yellow' });
    }
    if (tiles.blueYellow > 0) {
      availableTiles.push({ type: 'blueYellow', front: 'blue', back: 'yellow' });
      availableTiles.push({ type: 'blueYellow', front: 'yellow', back: 'blue' });
    }
    if (tiles.redBlue > 0) {
      availableTiles.push({ type: 'redBlue', front: 'red', back: 'blue' });
      availableTiles.push({ type: 'redBlue', front: 'blue', back: 'red' });
    }
    
    const emptyCells = getEmptyCells();
    for (const [row, col] of emptyCells) {
      for (const tile of availableTiles) {
        moves.push({ type: 'place', row, col, tile });
      }
    }
    
    // 이동 가능한 수
    if (phase === 'movement' || moveCount >= 14) {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (testBoard[i][j]?.owner === player) {
            const adjacent = [
              [i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]
            ].filter(([r, c]) => r >= 0 && r < 4 && c >= 0 && c < 4 && !testBoard[r][c]);
            
            for (const [toRow, toCol] of adjacent) {
              moves.push({ type: 'move', fromRow: i, fromCol: j, toRow, toCol });
            }
          }
        }
      }
      
      // 뒤집기 가능한 수
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (testBoard[i][j]?.owner === player) {
            moves.push({ type: 'flip', row: i, col: j });
          }
        }
      }
    }
    
    return moves;
  };

  const applyMove = (testBoard: Board, move: any, player: number, tiles: any) => {
    const newBoard = testBoard.map(r => [...r]);
    const newTiles = { ...tiles };
    
    if (move.type === 'place') {
      newBoard[move.row][move.col] = { front: move.tile.front, back: move.tile.back, owner: player };
      newTiles[move.tile.type] = newTiles[move.tile.type] - 1;
    } else if (move.type === 'move') {
      newBoard[move.toRow][move.toCol] = newBoard[move.fromRow][move.fromCol];
      newBoard[move.fromRow][move.fromCol] = null;
    } else if (move.type === 'flip') {
      const tile = newBoard[move.row][move.col]!;
      newBoard[move.row][move.col] = { front: tile.back, back: tile.front, owner: tile.owner };
    }
    
    return { newBoard, newTiles };
  };

  const minimax = (testBoard: Board, depth: number, isMaximizing: boolean, alpha: number, beta: number, aiTiles: any, playerTiles: any, currentMoveCount: number): number => {
    const aiColor = player2Target;
    const playerColor = player1Target;
    
    const score = evaluateBoard(testBoard, aiColor, playerColor);
    
    if (depth === 0 || Math.abs(score) >= 10000) {
      return score;
    }
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      const moves = getAllPossibleMoves(testBoard, 2, aiTiles);
      
      for (const move of moves.slice(0, 30)) { // 가지치기: 상위 30개만
        const { newBoard, newTiles } = applyMove(testBoard, move, 2, aiTiles);
        const evaluation = minimax(newBoard, depth - 1, false, alpha, beta, newTiles, playerTiles, currentMoveCount + 1);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const moves = getAllPossibleMoves(testBoard, 1, playerTiles);
      
      for (const move of moves.slice(0, 30)) {
        const { newBoard, newTiles } = applyMove(testBoard, move, 1, playerTiles);
        const evaluation = minimax(newBoard, depth - 1, true, alpha, beta, aiTiles, newTiles, currentMoveCount + 1);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };
  const makeAIMove = () => {
    setIsAIThinking(true);
    
    setTimeout(() => {
      if (winner) {
        setIsAIThinking(false);
        return;
      }
      
      const tiles = player2Tiles;
      const aiColor = player2Target;
      const playerColor = player1Target;
      
      const depth = moveCount < 10 ? 3 : 4; // 후반으로 갈수록 더 깊게 탐색
      const allMoves = getAllPossibleMoves(board, 2, tiles);
      
      if (allMoves.length === 0) {
        setCurrentPlayer(1);
        setIsAIThinking(false);
        return;
      }
      
      let bestMove = null;
      let bestScore = -Infinity;
      
      // 모든 가능한 수를 평가
      for (const move of allMoves) {
        const { newBoard, newTiles } = applyMove(board, move, 2, tiles);
        
        // 즉시 승리하는 수 체크
        const score = evaluateBoard(newBoard, aiColor, playerColor);
        if (score >= 10000) {
          bestMove = move;
          break;
        }
        
        // Minimax로 평가
        const evaluation = minimax(newBoard, depth, false, -Infinity, Infinity, newTiles, player1Tiles, moveCount + 1);
        
        if (evaluation > bestScore) {
          bestScore = evaluation;
          bestMove = move;
        }
      }
      
      if (bestMove) {
        if (bestMove.type === 'place') {
          const newBoard = board.map(r => [...r]);
          newBoard[bestMove.row][bestMove.col] = { 
            front: bestMove.tile.front, 
            back: bestMove.tile.back, 
            owner: 2 
          };
          setBoard(newBoard);
          setPlayer2Tiles({ ...tiles, [bestMove.tile.type]: tiles[bestMove.tile.type as keyof typeof tiles] - 1 });
          setMoveCount(moveCount + 1);
          if (moveCount + 1 >= 14) setPhase('movement');
        } else if (bestMove.type === 'move') {
          const newBoard = board.map(r => [...r]);
          newBoard[bestMove.toRow][bestMove.toCol] = newBoard[bestMove.fromRow][bestMove.fromCol];
          newBoard[bestMove.fromRow][bestMove.fromCol] = null;
          setBoard(newBoard);
        } else if (bestMove.type === 'flip') {
          const newBoard = board.map(r => [...r]);
          const tile = newBoard[bestMove.row][bestMove.col]!;
          newBoard[bestMove.row][bestMove.col] = { 
            front: tile.back, 
            back: tile.front, 
            owner: tile.owner 
          };
          setBoard(newBoard);
        }
        
        setCurrentPlayer(1);
      }
      
      setIsAIThinking(false);
    }, 1000);
  };

  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 2 && !winner && !isAIThinking) {
      makeAIMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, gameMode, winner]);

  const placeTile = (row: number, col: number, flip: boolean = false) => {
    if (board[row][col] || !selectedTileType) return;
    
    const tiles = currentPlayer === 1 ? player1Tiles : player2Tiles;
    const setTiles = currentPlayer === 1 ? setPlayer1Tiles : setPlayer2Tiles;
    
    let front: Color, back: Color;
    if (selectedTileType === 'yellowRed') {
      [front, back] = flip ? ['red', 'yellow'] : ['yellow', 'red'];
    } else if (selectedTileType === 'blueYellow') {
      [front, back] = flip ? ['yellow', 'blue'] : ['blue', 'yellow'];
    } else {
      [front, back] = flip ? ['blue', 'red'] : ['red', 'blue'];
    }
    
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = { front, back, owner: currentPlayer };
    setBoard(newBoard);
    
    setTiles({ ...tiles, [selectedTileType]: tiles[selectedTileType as keyof typeof tiles] - 1 });
    setMoveCount(moveCount + 1);
    setSelectedTileType(null);
    setFlipPlacement(false);
    setActionMode(null);
    
    if (moveCount + 1 >= 14) {
      setPhase('movement');
    }
    
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
  };

  const moveTile = (toRow: number, toCol: number) => {
    if (!selectedCell || board[toRow][toCol]) return;
    
    const [fromRow, fromCol] = selectedCell;
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      const newBoard = board.map(r => [...r]);
      newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
      newBoard[fromRow][fromCol] = null;
      setBoard(newBoard);
      setSelectedCell(null);
      setActionMode(null);
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const flipTile = (row: number, col: number) => {
    if (!board[row][col]) return;
    
    const newBoard = board.map(r => [...r]);
    const tile = newBoard[row][col]!;
    newBoard[row][col] = { front: tile.back, back: tile.front, owner: tile.owner };
    setBoard(newBoard);
    setActionMode(null);
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
  };

  const handleCellClick = (row: number, col: number) => {
    if (winner || isAIThinking || (gameMode === 'ai' && currentPlayer === 2)) return;
    
    if (selectedTileType) {
      placeTile(row, col, flipPlacement);
    } else if (actionMode === 'move') {
      if (selectedCell) {
        if (selectedCell[0] === row && selectedCell[1] === col) {
          setSelectedCell(null);
        } else {
          moveTile(row, col);
        }
      } else if (board[row][col]) {
        setSelectedCell([row, col]);
      }
    } else if (actionMode === 'flip') {
      flipTile(row, col);
    }
  };

  const resetGame = () => {
    setBoard(Array(4).fill(null).map(() => Array(4).fill(null)));
    setCurrentPlayer(1);
    setPhase('placement');
    setMoveCount(0);
    setPlayer1Tiles({ yellowRed: 3, blueYellow: 3, redBlue: 3 });
    setPlayer2Tiles({ yellowRed: 3, blueYellow: 3, redBlue: 3 });
    setWinner(null);
    setSelectedCell(null);
    setActionMode(null);
    setSelectedTileType(null);
    setFlipPlacement(false);
    setIsAIThinking(false);
  };

  const TileSelector = ({ player }: { player: number }) => {
    const tiles = player === 1 ? player1Tiles : player2Tiles;
    const isCurrentPlayer = player === currentPlayer;
    
    if (!isCurrentPlayer) return null;
    
    const handleTileSelect = (tileType: string) => {
      setSelectedTileType(tileType);
      setActionMode(null);
      setSelectedCell(null);
    };
    
    return (
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => handleTileSelect('yellowRed')}
          disabled={tiles.yellowRed === 0}
          className={`px-3 py-2 rounded border-2 ${selectedTileType === 'yellowRed' ? 'border-black' : 'border-gray-300'} ${tiles.yellowRed === 0 ? 'opacity-30' : ''}`}
        >
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded" style={{ background: `linear-gradient(to right, ${COLOR_MAP.yellow} 50%, ${COLOR_MAP.red} 50%)` }} />
            <span className="text-sm">×{tiles.yellowRed}</span>
          </div>
        </button>
        <button
          onClick={() => handleTileSelect('blueYellow')}
          disabled={tiles.blueYellow === 0}
          className={`px-3 py-2 rounded border-2 ${selectedTileType === 'blueYellow' ? 'border-black' : 'border-gray-300'} ${tiles.blueYellow === 0 ? 'opacity-30' : ''}`}
        >
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded" style={{ background: `linear-gradient(to right, ${COLOR_MAP.blue} 50%, ${COLOR_MAP.yellow} 50%)` }} />
            <span className="text-sm">×{tiles.blueYellow}</span>
          </div>
        </button>
        <button
          onClick={() => handleTileSelect('redBlue')}
          disabled={tiles.redBlue === 0}
          className={`px-3 py-2 rounded border-2 ${selectedTileType === 'redBlue' ? 'border-black' : 'border-gray-300'} ${tiles.redBlue === 0 ? 'opacity-30' : ''}`}
        >
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded" style={{ background: `linear-gradient(to right, ${COLOR_MAP.red} 50%, ${COLOR_MAP.blue} 50%)` }} />
            <span className="text-sm">×{tiles.redBlue}</span>
          </div>
        </button>
        {selectedTileType && (
          <button
            onClick={() => setFlipPlacement(!flipPlacement)}
            className={`px-3 py-2 rounded text-sm ${flipPlacement ? 'bg-purple-600 text-white' : 'bg-purple-400 text-white'}`}
          >
            {flipPlacement ? '뒤집어 놓기 ON' : '뒤집어 놓기'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">양면 빙고</h1>
      
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setGameMode('pvp');
            resetGame();
          }}
          className={`px-4 py-2 rounded ${gameMode === 'pvp' ? 'bg-blue-500 text-white' : 'bg-white'}`}
        >
          👥 PvP
        </button>
        <button
          onClick={() => {
            setGameMode('ai');
            resetGame();
          }}
          className={`px-4 py-2 rounded ${gameMode === 'ai' ? 'bg-green-500 text-white' : 'bg-white'}`}
        >
          🤖 vs AI
        </button>
      </div>
      
      {winner && (
        <div className="mb-4 p-4 bg-green-500 text-white rounded-lg text-xl font-bold">
          {winner === 1 ? '플레이어 1' : (gameMode === 'ai' ? 'AI' : '플레이어 2')} 승리! (목표색: {winner === 1 ? player1Target : player2Target})
        </div>
      )}
      
      <div className="mb-4 text-lg">
        현재 차례: <span className="font-bold">{gameMode === 'ai' && currentPlayer === 2 ? 'AI' : `플레이어 ${currentPlayer}`}</span>
        {isAIThinking && <span className="ml-2 text-sm text-gray-600">(AI 생각 중...)</span>}
        <span className="ml-4 text-sm text-gray-600">
          (목표색: {currentPlayer === 1 ? player1Target : player2Target})
        </span>
      </div>
      
      <div className="mb-4 text-sm text-gray-600">
        착수 횟수: {moveCount}/14 {phase === 'movement' && '(착수/이동/뒤집기 가능)'}
      </div>
      
      <div className="mb-4">
        {currentPlayer === 1 && <TileSelector player={1} />}
        {currentPlayer === 2 && gameMode === 'pvp' && <TileSelector player={2} />}
      </div>
      
      {phase === 'movement' && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              const newMode = actionMode === 'move' ? null : 'move';
              setActionMode(newMode);
              setSelectedCell(null);
              if (newMode === 'move') {
                setSelectedTileType(null);
                setFlipPlacement(false);
              }
            }}
            className={`px-4 py-2 rounded flex items-center gap-2 ${actionMode === 'move' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            <Move size={20} /> 이동
          </button>
          <button
            onClick={() => {
              const newMode = actionMode === 'flip' ? null : 'flip';
              setActionMode(newMode);
              setSelectedCell(null);
              if (newMode === 'flip') {
                setSelectedTileType(null);
                setFlipPlacement(false);
              }
            }}
            className={`px-4 py-2 rounded flex items-center gap-2 ${actionMode === 'flip' ? 'bg-purple-500 text-white' : 'bg-white'}`}
          >
            <RefreshCw size={20} /> 뒤집기
          </button>
        </div>
      )}
      
      <div className="mb-6 inline-block bg-white p-4 rounded-lg shadow-lg">
        {board.map((row, i) => (
          <div key={i} className="flex">
            {row.map((cell, j) => (
              <div
                key={j}
                onClick={() => handleCellClick(i, j)}
                className={`w-20 h-20 border-4 border-gray-800 flex items-center justify-center cursor-pointer relative
                  ${selectedCell?.[0] === i && selectedCell?.[1] === j ? 'ring-4 ring-yellow-400' : ''}
                `}
                style={{ backgroundColor: cell ? COLOR_MAP[cell.front] : '#f3f4f6' }}
              >
                {cell && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-gray-800"
                    style={{ backgroundColor: COLOR_MAP[cell.back] }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <button
        onClick={resetGame}
        className="px-6 py-3 bg-red-500 text-white rounded-lg flex items-center gap-2 hover:bg-red-600"
      >
        <RotateCcw size={20} /> 게임 초기화
      </button>
    </div>
  );
};

export default DoubleBingoGame;