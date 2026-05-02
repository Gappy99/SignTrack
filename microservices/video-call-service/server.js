import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '../env/video-call-service.env.dev' });

// Import routes
import callRoutes from './src/routes/callRoutes.js';

// Import utilities
import { initializeServiceClients } from '../shared/serviceClient.js';

// Initialize app
const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Routes
app.use('/calls', callRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    service: 'Video Call Service',
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${req.id}] Error:`, err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Initialize Service Clients
function initServiceClients() {
  try {
    initializeServiceClients();
    console.log('✓ Service clients initialized');
  } catch (error) {
    console.warn('⚠ Service client initialization warning:', error.message);
  }
}

// Start server
async function startServer() {
  try {
    await connectDatabase();
    
    // Initialize service clients (optional)
    initServiceClients();
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Video Call Service                  ║
║   Running on port ${PORT}             ║
║   Environment: ${process.env.NODE_ENV}        ║
╚════════════════════════════════════════╝
      `);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
