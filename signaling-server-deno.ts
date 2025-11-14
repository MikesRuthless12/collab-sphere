// Deno Deploy WebRTC Signaling Server
// Deploy this to Deno Deploy as a SEPARATE project from your frontend

interface Client {
  id: string;
  ws: WebSocket;
  roomId: string;
  name: string;
}

const clients = new Map<string, Client>();
const rooms = new Map<string, Set<string>>();

function broadcast(roomId: string, message: any, excludeId?: string) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  const messageStr = JSON.stringify(message);
  for (const clientId of roomClients) {
    if (excludeId && clientId === excludeId) continue;
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}

function handleMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) return;

  const { type, roomId, name, targetId, ...rest } = message;

  if (type === '__join') {
    // Add client to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(clientId);
    client.roomId = roomId;
    client.name = name;

    // Notify others in the room
    broadcast(roomId, { type: '__join', senderId: clientId, name }, clientId);
    console.log(`Client ${clientId} joined room ${roomId}`);
  } else if (type === '__leave') {
    const roomId = client.roomId;
    if (roomId && rooms.has(roomId)) {
      rooms.get(roomId)!.delete(clientId);
      broadcast(roomId, { type: '__leave', senderId: clientId });
      if (rooms.get(roomId)!.size === 0) {
        rooms.delete(roomId);
      }
    }
    clients.delete(clientId);
    console.log(`Client ${clientId} left room ${roomId}`);
  } else {
    // Forward signaling messages (offer, answer, ice-candidate)
    const roomId = client.roomId;
    if (roomId) {
      const forwardMessage = { ...rest, type, senderId: clientId, targetId };
      if (targetId) {
        // Send to specific client
        const targetClient = clients.get(targetId);
        if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
          targetClient.ws.send(JSON.stringify(forwardMessage));
        }
      } else {
        // Broadcast to all in room except sender
        broadcast(roomId, forwardMessage, clientId);
      }
    }
  }
}

async function handleConnection(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const roomId = url.pathname.slice(1); // Get room ID from path

  if (!roomId) {
    return new Response('Room ID required', { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = `client-${Math.random().toString(36).substring(2, 9)}`;

  const client: Client = {
    id: clientId,
    ws: socket,
    roomId,
    name: 'Anonymous',
  };

  clients.set(clientId, client);

  socket.onopen = () => {
    console.log(`WebSocket opened for client ${clientId}`);
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleMessage(clientId, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  };

  socket.onclose = () => {
    const client = clients.get(clientId);
    if (client) {
      const roomId = client.roomId;
      if (roomId && rooms.has(roomId)) {
        rooms.get(roomId)!.delete(clientId);
        broadcast(roomId, { type: '__leave', senderId: clientId });
        if (rooms.get(roomId)!.size === 0) {
          rooms.delete(roomId);
        }
      }
      clients.delete(clientId);
    }
    console.log(`WebSocket closed for client ${clientId}`);
  };

  return response;
}

// Main server handler
Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // Health check endpoint
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      activeRooms: rooms.size,
      activeClients: clients.size
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // WebSocket upgrade
  if (req.headers.get('upgrade') === 'websocket') {
    try {
      return await handleConnection(req);
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
  }

  // Default response
  return new Response(
    JSON.stringify({
      message: 'Collab Sphere WebRTC Signaling Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        websocket: 'wss://your-signaling-server.deno.dev/{roomId}',
        health: 'https://your-signaling-server.deno.dev/health',
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
});
