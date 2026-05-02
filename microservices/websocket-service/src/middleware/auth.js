import axios from 'axios';
import jwt from 'jsonwebtoken';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5104';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware de autenticación para Socket.io
 * Valida JWT token y obtiene información del usuario
 */
export async function authMiddleware(socket, next) {
  try {
    // Obtener token del header
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Decodificar JWT localmente primero (sin verificación)
    let decoded;
    try {
      decoded = jwt.decode(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token format'));
      }
    } catch (err) {
      return next(new Error('Authentication error: Token decode failed'));
    }

    // Validar contra AuthService
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/auth/validate-token`,
        { token },
        { 
          timeout: 5000,
          headers: { 'X-Request-ID': socket.id }
        }
      );

      if (response.status === 200 && response.data.success) {
        socket.userId = response.data.user.id;
        socket.userEmail = response.data.user.email;
        socket.userRole = response.data.user.role;
        socket.token = token;

        console.log(`[Auth] Socket ${socket.id} authenticated as ${socket.userId}`);
        next();
      } else {
        next(new Error('Authentication error: Validation failed'));
      }
    } catch (error) {
      console.warn(`[Auth] AuthService validation failed: ${error.message}`);
      
      // Fallback: Validar JWT localmente si AuthService no responde
      try {
        const verified = jwt.verify(token, JWT_SECRET);
        socket.userId = verified.id || verified.sub;
        socket.userEmail = verified.email;
        socket.userRole = verified.role;
        socket.token = token;

        console.log(`[Auth] Socket ${socket.id} authenticated locally as ${socket.userId}`);
        next();
      } catch (verifyError) {
        next(new Error('Authentication error: Token verification failed'));
      }
    }
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    next(new Error('Authentication error: Server error'));
  }
}

/**
 * Validar token en HTTP requests
 */
export async function validateTokenHTTP(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Decodificar
    let decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Validar contra AuthService
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/auth/validate-token`,
        { token },
        { timeout: 5000 }
      );

      if (response.status === 200 && response.data.success) {
        req.user = {
          id: response.data.user.id,
          email: response.data.user.email,
          role: response.data.user.role
        };
        next();
        return;
      }
    } catch (error) {
      console.warn(`[Auth] AuthService validation failed: ${error.message}`);
    }

    // Fallback: Validar localmente
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: verified.id || verified.sub,
        email: verified.email,
        role: verified.role
      };
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}
