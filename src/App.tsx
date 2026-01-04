import React, { useState, useEffect } from 'react';
import { RotateCcw, Move, RefreshCw } from 'lucide-react';

type Color = 'red' | 'yellow' | 'blue' | 'none';
type Tile = { front: Color; back: Color; owner: number } | null;
type Board = Tile[][];
type GamePhase = 'placement' | 'movement';

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
  const [isAIThinking, setIsAIThinking] = useState(false);

  // AI 함수들
  const getEmptyCells = (): [number, number][] => {
    const empty: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (!board[i][j]) empty.push([i, j]);
      }
    }
    return empty;
  };

  const evaluateBoard = (targetColor: Color): number => {
    let score = 0;
    
    // 가로 체크
    for (let i = 0; i < 4; i++) {
      const rowColors = board[i].map(cell => cell?.front);
      const targetCount = rowColors.filter(c => c === targetColor).length;
      score += targetCount * targetCount;
    }
    
    // 세로 체크
    for (let j = 0; j < 4; j++) {
      const colColors = board.map(row => row[j]?.front);
      const targetCount = colColors.filter(c => c === targetColor).length;
      score += targetCount * targetCount;
    }
    
    // 대각선 체크
    const diag1 = board.map((row, i) => row[i]?.front);
    const diag2 = board.map((row, i) => row[3 - i]?.front);
    score += diag1.filter(c => c === targetColor).length ** 2;
    score += diag2.filter(c => c === targetColor).length ** 2;
    
    return score;
  };

  const makeAIMove = () => {
    setIsAIThinking(true);
    
    setTimeout(() => {
      const tiles = player2Tiles;
      const targetColor = player2Target;
      
      // 착수 가능한 말 찾기
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

      if (availableTiles.length > 0) {
        // 착수
        const emptyCells = getEmptyCells();
        let bestScore = -1;
        let bestMove: { row: number; col: number; tile: any } | null = null;

        for (const cell of emptyCells) {
          for (const tile of availableTiles) {
            const testBoard = board.map(r => [...r]);
            testBoard[cell[0]][cell[1]] = { front: tile.front, back: tile.back, owner: 2 };
            
            const oldBoard = board;
            setBoard(testBoard);
            const score = evaluateBoard(targetColor);
            setBoard(oldBoard);

            if (score > bestScore) {
              bestScore = score;
              bestMove = { row: cell[0], col: cell[1], tile };
            }
          }
        }

        if (bestMove) {
          const { row, col, tile } = bestMove;
          const flip = tile.front !== (tile.type === 'yellowRed' ? 'yellow' : tile.type === 'blueYellow' ? 'blue' : 'red');
          
          const newBoard = board.map(r => [...r]);
          newBoard[row][col] = { front: tile.front, back: tile.back, owner: 2 };
          setBoard(newBoard);
          
          setPlayer2Tiles({ ...tiles, [tile.type]: tiles[tile.type as keyof typeof tiles] - 1 });
          setMoveCount(moveCount + 1);
          
          if (moveCount + 1 >= 14) setPhase('movement');
          
          setCurrentPlayer(1);
        }
      } else if (phase === 'movement') {
        // 이동 또는 뒤집기 (간단하게 랜덤)
        const myTiles: [number, number][] = [];
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            if (board[i][j]?.owner === 2) myTiles.push([i, j]);
          }
        }
        
        if (Math.random() > 0.5 && myTiles.length > 0) {
          // 뒤집기
          const randomTile = myTiles[Math.floor(Math.random() * myTiles.length)];
          const [row, col] = randomTile;
          const newBoard = board.map(r => [...r]);
          const tile = newBoard[row][col]!;
          newBoard[row][col] = { front: tile.back, back: tile.front, owner: tile.owner };
          setBoard(newBoard);
          setCurrentPlayer(1);
        } else {
          // 이동
          const emptyCells = getEmptyCells();
          if (myTiles.length > 0 && emptyCells.length > 0) {
            const randomTile = myTiles[Math.floor(Math.random() * myTiles.length)];
            const [fromRow, fromCol] = randomTile;
            
            const adjacentCells = [
              [fromRow - 1, fromCol], [fromRow + 1, fromCol],
              [fromRow, fromCol - 1], [fromRow, fromCol + 1]
            ].filter(([r, c]) => r >= 0 && r < 4 && c >= 0 && c < 4 && !board[r][c]);
            
            if (adjacentCells.length > 0) {
              const [toRow, toCol] = adjacentCells[Math.floor(Math.random() * adjacentCells.length)];
              const newBoard = board.map(r => [...r]);
              newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
              newBoard[fromRow][fromCol] = null;
              setBoard(newBoard);
              setCurrentPlayer(1);
            }
          }
        }
      }
      
      setIsAIThinking(false);
    }, 500);
  };

  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 2 && !winner && !isAIThinking) {
      makeAIMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, gameMode, winner]);

  const checkBingo = (player: number, targetColor: Color): boolean => {
    // 가로 체크
    for (let i = 0; i < 4; i++) {
      if (board[i].every(cell => cell?.front === targetColor)) return true;
    }
    // 세로 체크
    for (let j = 0; j < 4; j++) {
      if (board.every(row => row[j]?.front === targetColor)) return true;
    }
    // 대각선 체크
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
          // 같은 칸 클릭 시 선택 취소
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
  };

  const TileSelector = ({ player }: { player: number }) => {
    const tiles = player === 1 ? player1Tiles : player2Tiles;
    const isCurrentPlayer = player === currentPlayer;
    
    if (!isCurrentPlayer) return null;
    
    const handleTileSelect = (tileType: string) => {
      setSelectedTileType(tileType);
      setActionMode(null); // 말 선택 시 이동/뒤집기 모드 해제
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
          플레이어 {winner} 승리! (목표색: {winner === 1 ? player1Target : player2Target})
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
        {currentPlayer === 2 && <TileSelector player={2} />}
      </div>
      
      {phase === 'movement' && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setActionMode(actionMode === 'move' ? null : 'move');
              setSelectedCell(null);
            }}
            className={`px-4 py-2 rounded flex items-center gap-2 ${actionMode === 'move' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            <Move size={20} /> 이동
          </button>
          <button
            onClick={() => {
              setActionMode(actionMode === 'flip' ? null : 'flip');
              setSelectedCell(null);
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