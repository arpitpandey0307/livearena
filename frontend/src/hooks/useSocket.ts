import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { url = '/', autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  const connect = () => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Socket connected:', socketRef.current?.id);
    });

    socketRef.current.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (err) => {
      setError(err.message);
      console.error('Socket connection error:', err);
    });
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const emit = <T>(event: string, data: T) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = <T>(event: string, callback: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const once = <T>(event: string, callback: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.once(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
  };
}

// Game-specific socket hook
export function useGameSocket(roomCode: string | null) {
  const { socket, isConnected, error, emit, on, off } = useSocket({ autoConnect: true });
  const [roomState, setRoomState] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'accepted' | 'rejected'>('idle');
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');

  useEffect(() => {
    if (!socket) return;

    // Room events
    on('room:joined', (data: any) => {
      console.log('Room joined:', data);
    });

    on('room:state', (state: any) => {
      setRoomState(state);
    });

    on('room:player-joined', (data: any) => {
      console.log('Player joined:', data);
    });

    on('room:player-left', (data: any) => {
      console.log('Player left:', data);
    });

    // Game events
    on('game:started', (data: any) => {
      setGameStatus('active');
      setGameState(data);
    });

    on('question:started', (question: any) => {
      setCurrentQuestion(question);
      setAnswerStatus('idle');
    });

    on('answer:accepted', (data: any) => {
      setAnswerStatus('accepted');
    });

    on('answer:rejected', (data: any) => {
      setAnswerStatus('rejected');
    });

    on('question:ended', (data: any) => {
      setCurrentQuestion((prev: any) => ({
        ...prev,
        correctOptionId: data.correctOptionId,
        explanation: data.explanation,
        ended: true,
      }));
    });

    on('leaderboard:updated', (data: any[]) => {
      setLeaderboard(data);
    });

    on('game:completed', (data: any) => {
      setGameStatus('completed');
      setGameState(data);
    });

    on('error', (err: any) => {
      console.error('Socket error:', err);
    });

    return () => {
      off('room:joined');
      off('room:state');
      off('room:player-joined');
      off('room:player-left');
      off('game:started');
      off('question:started');
      off('answer:accepted');
      off('answer:rejected');
      off('question:ended');
      off('leaderboard:updated');
      off('game:completed');
      off('error');
    };
  }, [socket]);

  const joinRoom = (participantId: string) => {
    if (roomCode) {
      emit('room:join', { roomCode, participantId });
    }
  };

  const joinAsHost = (hostToken: string) => {
    if (roomCode) {
      emit('room:host-join', { roomCode, hostToken });
    }
  };

  const startGame = (hostToken: string) => {
    emit('game:start', { roomCode, hostToken });
  };

  const submitAnswer = (participantId: string, questionId: string, selectedOptionId: string) => {
    emit('answer:submit', {
      roomCode,
      participantId,
      questionId,
      selectedOptionId,
    });
  };

  const nextQuestion = (hostToken: string) => {
    emit('game:next-question', { roomCode, hostToken });
  };

  return {
    socket,
    isConnected,
    error,
    roomState,
    gameState,
    currentQuestion,
    leaderboard,
    answerStatus,
    gameStatus,
    joinRoom,
    joinAsHost,
    startGame,
    submitAnswer,
    nextQuestion,
  };
}
