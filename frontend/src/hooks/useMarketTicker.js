import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useMarketTicker() {
  const [ticker, setTicker] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      path: '/ws/market',
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('market:ticker', (data) => setTicker(data));

    return () => {
      socket.disconnect();
    };
  }, []);

  return { ticker, connected };
}
