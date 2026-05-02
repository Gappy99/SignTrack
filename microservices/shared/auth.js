import axios from 'axios';
import jwt from 'jsonwebtoken';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5104';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

/**
 * Extrae y valida token del header
 */
export async function extractAndValidateToken(token) {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    // Decodificar
    let decoded = jwt.decode(token);
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    // Validar contra AuthService
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/auth/validate-token`,
        { token },
        { timeout: 5000 }
      );

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          user: {
            id: response.data.user.id,
            email: response.data.user.email,
            role: response.data.user.role
          }
        };
      }
    } catch (error) {
      console.warn(`[Auth] AuthService validation failed: ${error.message}`);
    }

    // Fallback: Validar localmente
    const verified = jwt.verify(token, JWT_SECRET);
    return {
      success: true,
      user: {
        id: verified.id || verified.sub,
        email: verified.email,
        role: verified.role
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
