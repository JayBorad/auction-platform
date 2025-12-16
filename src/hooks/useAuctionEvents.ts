import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { AuctionEvent } from '@/lib/websocket';

interface UseAuctionEventsOptions {
  auctionId: string;
  onBidPlaced?: (data: any) => void;
  onPlayerChanged?: (data: any) => void;
  onAuctionStarted?: (data: any) => void;
  onAuctionEnded?: (data: any) => void;
  onAuctionPaused?: (data: any) => void;
  onAuctionResumed?: (data: any) => void;
  onTimerUpdate?: (data: any) => void;
  onPlayerSold?: (data: any) => void;
  onAuctionUpdated?: (data: any) => void;
  debounceMs?: number;
}

export function useAuctionEvents({
  auctionId,
  onBidPlaced,
  onPlayerChanged,
  onAuctionStarted,
  onAuctionEnded,
  onAuctionPaused,
  onAuctionResumed,
  onTimerUpdate,
  onPlayerSold,
  onAuctionUpdated,
  debounceMs = 500
}: UseAuctionEventsOptions) {
  const { wsManager } = useWebSocket();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventRef = useRef<{ type: string; timestamp: number } | null>(null);

  const debouncedCallback = useCallback((callback: () => void) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(callback, debounceMs);
  }, [debounceMs]);

  const handleAuctionEvent = useCallback((event: AuctionEvent) => {
    // Only process events for this auction
    if (event.auctionId !== auctionId) return;

    // Prevent duplicate events within short time window
    const now = Date.now();
    if (lastEventRef.current &&
        lastEventRef.current.type === event.type &&
        now - lastEventRef.current.timestamp < 100) {
      return;
    }
    lastEventRef.current = { type: event.type, timestamp: now };

    console.log(`[AuctionEvents] ${event.type} for auction ${auctionId}`);

    switch (event.type) {
      case 'bid_placed':
        if (onBidPlaced) {
          // Bid events are frequent, use immediate callback
          onBidPlaced(event.data);
        }
        break;
      case 'player_changed':
        if (onPlayerChanged) {
          // Player changes are important, immediate callback
          onPlayerChanged(event.data);
        }
        break;
      case 'auction_started':
        if (onAuctionStarted) {
          onAuctionStarted(event.data);
        }
        break;
      case 'auction_ended':
        if (onAuctionEnded) {
          onAuctionEnded(event.data);
        }
        break;
      case 'auction_paused':
        if (onAuctionPaused) {
          onAuctionPaused(event.data);
        }
        break;
      case 'auction_resumed':
        if (onAuctionResumed) {
          onAuctionResumed(event.data);
        }
        break;
      case 'timer_sync':
        if (onTimerUpdate) {
          onTimerUpdate(event.data);
        }
        break;
      case 'player_sold':
        if (onPlayerSold) {
          onPlayerSold(event.data);
        }
        break;
      case 'auction_updated':
        if (onAuctionUpdated) {
          onAuctionUpdated(event.data);
        }
        break;
    }
  }, [
    auctionId,
    onBidPlaced,
    onPlayerChanged,
    onAuctionStarted,
    onAuctionEnded,
    onAuctionPaused,
    onAuctionResumed,
    onTimerUpdate,
    onPlayerSold,
    onAuctionUpdated
  ]);

  useEffect(() => {
    if (!auctionId) return;

    // Join auction room
    wsManager.joinAuction(auctionId);

    // Listen for auction events
    const cleanup = wsManager.onAuctionEvent(handleAuctionEvent);

    return () => {
      // Leave auction room
      wsManager.leaveAuction(auctionId);
      cleanup();

      // Clear any pending debounced callbacks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [auctionId, wsManager, handleAuctionEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
}
