import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '../env/sign-translation-orchestrator.env.dev' });

// Import routes
import orchestratorRoutes from './src/routes/orchestratorRoutes.js';

// Import utilities
import { initializeServiceClients } from '../shared/serviceClient.js';
import { initializeRedis } from '../shared/redisClient.js';

// Initialize app
const app = express();
const PORT = process.env.PORT || 3203;

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
app.use('/orchestrate', orchestratorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    service: 'Sign Translation Orchestrator',
    uptime: process.uptime(),
    dependencies: {
      frameProcessor: process.env.FRAME_PROCESSOR_URL,
      featureExtraction: process.env.IA_FEATURE_EXTRACTION_URL,
      inference: process.env.IA_INFERENCE_URL,
      translation: process.env.IA_TRANSLATION_URL,
      websocket: process.env.WEBSOCKET_SERVICE_URL
    }
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

// Initialize Redis
async function initRedis() {
  try {
    await initializeRedis();
    console.log('✓ Redis initialized successfully');
  } catch (error) {
    console.error('✗ Redis initialization failed:', error.message);
    process.exit(1);
  }
}

// Initialize Service Clients
function initServiceClients() {
  try {
    initializeServiceClients();
    console.log('✓ Service clients initialized');
  } catch (error) {
    console.error('✗ Service client initialization failed:', error.message);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize Redis
    await initRedis();
    
    // Initialize service clients
    initServiceClients();
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Sign Translation Orchestrator       ║
║   Running on port ${PORT}             ║
║   Environment: ${process.env.NODE_ENV}        ║
╚════════════════════════════════════════╝
      `);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`
Connected to services:
  - Frame Processor: ${process.env.FRAME_PROCESSOR_URL}
  - AI Inference: ${process.env.IA_INFERENCE_URL}
  - AI Translation: ${process.env.IA_TRANSLATION_URL}
  - WebSocket: ${process.env.WEBSOCKET_SERVICE_URL}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
