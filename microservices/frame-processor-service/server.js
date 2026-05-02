import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '../env/frame-processor-service.env.dev' });

// Import routes
import processorRoutes from './src/routes/processorRoutes.js';

// Import utilities
import { initializeServiceClients } from '../shared/serviceClient.js';
import { initializeRedis } from '../shared/redisClient.js';

// Initialize app
const app = express();
const PORT = process.env.PORT || 3201;

// Middleware
app.use(express.json({ limit: '50mb' })); // Larger limit for base64 frames
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
app.use('/process', processorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    service: 'Frame Processor Service',
    uptime: process.uptime(),
    capabilities: {
      featureExtraction: process.env.IA_FEATURE_EXTRACTION_URL,
      inference: process.env.IA_INFERENCE_URL
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
    // Initialize Redis
    await initRedis();
    
    // Initialize service clients
    initServiceClients();
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Frame Processor Service             ║
║   Running on port ${PORT}             ║
║   Environment: ${process.env.NODE_ENV}        ║
╚════════════════════════════════════════╝
      `);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Connected to IA services:`);
      console.log(`  - Feature Extraction: ${process.env.IA_FEATURE_EXTRACTION_URL}`);
      console.log(`  - Inference: ${process.env.IA_INFERENCE_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
