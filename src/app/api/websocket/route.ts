import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { event, data } = await request.json();

    // Get WebSocket server URL from environment
    const wsServerUrl = process.env.WS_SERVER_URL;

    if (!wsServerUrl) {
      console.warn('WS_SERVER_URL not configured, WebSocket events will not be sent');
      return NextResponse.json({ success: false, message: 'WebSocket server not configured' });
    }

    // Send event to WebSocket server via HTTP
    try {
      const response = await fetch(`${wsServerUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, data }),
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      } else {
        console.error('Failed to send WebSocket event:', await response.text());
        return NextResponse.json({ success: false, message: 'Failed to send event' });
      }
    } catch (fetchError) {
      console.error('Error sending WebSocket event:', fetchError);
      // Don't fail the request, just log the error
      return NextResponse.json({ success: false, message: 'WebSocket server unreachable' });
    }
  } catch (error) {
    console.error('Error in websocket API route:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
