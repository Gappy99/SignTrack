import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '../env/websocket-service.env.dev' });

// Import event handlers
import { registerCallHandlers } from './src/handlers/callHandlers.js';
import { registerFrameHandlers } from './src/handlers/frameHandlers.js';
import { registerTranslationHandlers } from './src/handlers/translationHandlers.js';
import { authMiddleware } from './src/middleware/auth.js';

// Initialize app and HTTP server
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3202;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7, // 10MB for frames
  transports: ['websocket', 'polling']
});

// Socket.IO middleware
io.use((socket, next) => {
  console.log(`[Socket] New connection attempt: ${socket.id}`);
  socket.requestId = uuidv4();
  next();
});

// Authentication middleware
io.use(authMiddleware);

// Connection handler
io.on('connection', (socket) => {
  console.log(`
╔════════════════════════════════════════╗
║   Client Connected                    ║
║   Socket ID: ${socket.id}  ║
║   User: ${socket.userId || 'unknown'}                ║
╚════════════════════════════════════════╝
  `);

  // Store connection info
  socket.connectionTime = Date.now();
  socket.isActive = true;

  // Register event handlers
  registerCallHandlers(io, socket);
  registerFrameHandlers(io, socket);
  registerTranslationHandlers(io, socket);

  // Disconnect handler
  socket.on('disconnect', (reason) => {
    console.log(`✗ Client disconnected: ${socket.id} (Reason: ${reason})`);
    socket.isActive = false;
    io.emit('user:disconnected', {
      socketId: socket.id,
      userId: socket.userId
    });
  });

  // Error handler
  socket.on('error', (error) => {
    console.error(`[Socket ${socket.id}] Error:`, error);
  });

  // Send welcome message
  socket.emit('connection:established', {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    message: 'Connected to WebSocket Service'
  });
});

// REST endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    service: 'WebSocket Service',
    uptime: process.uptime(),
    connectedClients: io.engine.clientsCount
  });
});

app.get('/stats', (req, res) => {
  res.status(200).json({
    connectedClients: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   WebSocket Service                   ║
║   Running on port ${PORT}             ║
║   Environment: ${process.env.NODE_ENV}        ║
╚════════════════════════════════════════╝
      `);
      console.log(`WebSocket: ws://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Stats: http://localhost:${PORT}/stats`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };
export default app;
