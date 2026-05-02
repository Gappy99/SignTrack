import swaggerUi from 'swagger-ui-express';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  AuthServiceSignTrack - OpenAPI 3.0.0 Specification                        ║
 * ║  Documentación completa y profesional de la API REST de autenticación       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const BASE_PATH = '/api/v1';

/**
 * TAGS - Categorías de la documentación para organizar los endpoints
 */
const TAGS = [
  {
    name: 'Auth',
    description: 'Endpoints para autenticación, registro de usuarios, verificación de email y recuperación de contraseñas',
    externalDocs: {
      description: 'Más información sobre autenticación',
      url: 'https://docs.example.com/auth'
    }
  },
  {
    name: 'Users',
    description: 'Endpoints para gestión, consulta y administración de usuarios en el sistema'
  },
  {
    name: 'Roles',
    description: 'Endpoints para asignación, consulta y gestión de roles de usuario (requiere permisos de administrador)'
  },
  {
    name: 'SignLanguage',
    description: 'Endpoints para acceder a recursos multimedia de lenguaje de signos para accesibilidad de la aplicación'
  },
  {
    name: 'VideoCalls',
    description: 'Endpoints para gestión de videollamadas: iniciar, unirse, salir, consultar estado, terminar e historial'
  },
  {
    name: 'Orchestrator',
    description: 'Endpoints de orquestación de traducción en tiempo real: detección, streams, historial, estadísticas y métricas'
  },
  {
    name: 'Health',
    description: 'Endpoints de monitoreo y estado del servicio (para health checks de load balancers y orquestadores)'
  }
];

/**
 * SEGURIDAD - Esquemas de autenticación
 */
const AUTH_SECURITY = [{ bearerAuth: [] }];

/**
 * RESPUESTAS COMUNES - Definiciones reutilizables de respuestas de error
 */
const COMMON_RESPONSES = {
  BadRequest: {
    description: 'Solicitud inválida - Errores de validación de datos',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        examples: {
          validationError: {
            summary: 'Error de validación',
            value: {
              success: false,
              message: 'Validation failed: Email is required',
              error: 'VALIDATION_ERROR',
              details: ['email: Email is required', 'password: Must be at least 8 characters']
            }
          },
          duplicateEmail: {
            summary: 'Email duplicado',
            value: {
              success: false,
              message: 'Email already registered',
              error: 'DUPLICATE_EMAIL'
            }
          }
        }
      }
    }
  },
  Unauthorized: {
    description: 'No autorizado - Token faltante, expirado o inválido',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        examples: {
          missingToken: {
            summary: 'Token no proporcionado',
            value: {
              success: false,
              message: 'No authorization token was provided',
              error: 'MISSING_TOKEN'
            }
          },
          invalidToken: {
            summary: 'Token inválido',
            value: {
              success: false,
              message: 'Invalid or expired token',
              error: 'INVALID_TOKEN'
            }
          },
          expiredToken: {
            summary: 'Token expirado',
            value: {
              success: false,
              message: 'Token has expired (30 minute validity)',
              error: 'TOKEN_EXPIRED'
            }
          }
        }
      }
    }
  },
  Forbidden: {
    description: 'Acceso denegado - Permisos insuficientes (requiere rol de administrador)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          success: false,
          message: 'Insufficient permissions for this operation. Admin role required.',
          error: 'FORBIDDEN'
        }
      }
    }
  },
  NotFound: {
    description: 'Recurso no encontrado',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        examples: {
          userNotFound: {
            summary: 'Usuario no encontrado',
            value: {
              success: false,
              message: 'User not found with the provided ID',
              error: 'USER_NOT_FOUND'
            }
          },
          resourceNotFound: {
            summary: 'Recurso no encontrado',
            value: {
              success: false,
              message: 'Sign language resource not found with key: invalid-key',
              error: 'RESOURCE_NOT_FOUND'
            }
          }
        }
      }
    }
  },
  InternalServerError: {
    description: 'Error interno del servidor - Ocurrió un error inesperado',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          success: false,
          message: 'Internal server error occurred',
          error: 'INTERNAL_SERVER_ERROR'
        }
      }
    }
  },
  ServiceUnavailable: {
    description: 'Servicio temporalmente no disponible (ej: Fallo en servicio de email)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          success: false,
          message: 'Email service temporarily unavailable. Please try again later.',
          error: 'SERVICE_UNAVAILABLE'
        }
      }
    }
  }
};

const COMMON_PARAMETERS = {
  UserIdPathParam: {
    name: 'userId',
    in: 'path',
    required: true,
    description: 'ID único del usuario en el sistema (MongoDB ObjectId)',
    schema: { type: 'string', example: '66f6f2cf2a1e6b17f34ef001' }
  },
  RoleNamePathParam: {
    name: 'roleName',
    in: 'path',
    required: true,
    description: 'Nombre del rol a consultar (ej: ADMIN_ROLE, USER_ROLE, MODERATOR_ROLE)',
    schema: { type: 'string', example: 'ADMIN_ROLE' }
  },
  SignLanguageKeyParam: {
    name: 'key',
    in: 'path',
    required: true,
    description: 'Identificador único del recurso de lenguaje de signos (ej: login, register, forgot-password)',
    schema: { type: 'string', example: 'login' }
  },
  CallIdPathParam: {
    name: 'callId',
    in: 'path',
    required: true,
    description: 'Identificador único de la videollamada (ej: call_550e8400-e29b-41d4-a716-446655440000)',
    schema: { type: 'string', example: 'call_550e8400-e29b-41d4-a716-446655440000' }
  },
  StreamIdPathParam: {
    name: 'streamId',
    in: 'path',
    required: true,
    description: 'Identificador único del stream de traducción (ej: stream_550e8400-e29b-41d4-a716-446655440000)',
    schema: { type: 'string', example: 'stream_550e8400-e29b-41d4-a716-446655440000' }
  },
  DetectionIdPathParam: {
    name: 'detectionId',
    in: 'path',
    required: true,
    description: 'Identificador único de una detección de seña (ej: detect_550e8400-e29b-41d4-a716-446655440000)',
    schema: { type: 'string', example: 'detect_550e8400-e29b-41d4-a716-446655440000' }
  }
};

/**
 * COMPONENTS - Definición de esquemas, securitySchemes y parámetros reutilizables
 */
const COMPONENTS = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Bearer token obtenido en el endpoint login. Válido por 30 minutos. Se proporciona en el header "Authorization: Bearer {token}"'
    }
  },
  schemas: {
    // ==================== ERRORES ====================
    ErrorResponse: {
      type: 'object',
      description: 'Estructura estándar de respuesta de error',
      properties: {
        success: { type: 'boolean', example: false, description: 'Indica si la solicitud fue exitosa' },
        message: { type: 'string', example: 'Error message describing what went wrong', description: 'Mensaje descriptivo del error' },
        error: { type: 'string', example: 'ERROR_CODE', description: 'Código de error para identificar el tipo' },
        details: { type: 'array', items: { type: 'string' }, description: 'Detalles adicionales del error (ej: errores de validación)' }
      },
      required: ['success', 'message']
    },

    // ==================== REGISTRO ====================
    RegisterDto: {
      type: 'object',
      description: 'Datos requeridos para registrar un nuevo usuario en el sistema',
      properties: {
        name: {
          type: 'string',
          maxLength: 25,
          example: 'Juan',
          description: 'Primer nombre del usuario (máximo 25 caracteres)'
        },
        surname: {
          type: 'string',
          maxLength: 25,
          example: 'Pérez García',
          description: 'Apellido(s) del usuario (máximo 25 caracteres)'
        },
        username: {
          type: 'string',
          minLength: 3,
          example: 'juanperez',
          description: 'Nombre de usuario único para autenticación (sin espacios)'
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'juan.perez@example.com',
          description: 'Dirección de correo electrónico válida (será verificada)'
        },
        password: {
          type: 'string',
          format: 'password',
          minLength: 8,
          example: 'SecurePass123!',
          description: 'Contraseña (mínimo 8 caracteres, se recomienda incluir mayúsculas, minúsculas y números)'
        },
        phone: {
          type: 'string',
          minLength: 8,
          maxLength: 8,
          pattern: '^[0-9]{8}$',
          example: '55552222',
          description: 'Número de teléfono (exactamente 8 dígitos numéricos)'
        },
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Foto de perfil del usuario (multipart/form-data, máximo 10MB, formatos: JPEG, PNG, GIF, WebP)'
        }
      },
      required: ['name', 'surname', 'username', 'email', 'password', 'phone']
    },

    RegisterResponseDto: {
      type: 'object',
      description: 'Respuesta exitosa al registro de un nuevo usuario',
      properties: {
        success: { type: 'boolean', example: true, description: 'Indica que el registro fue exitoso' },
        message: { type: 'string', example: 'Usuario registrado exitosamente', description: 'Mensaje confirmatorio' },
        user: { $ref: '#/components/schemas/UserResponseDto', description: 'Datos completos del usuario creado' },
        emailVerificationRequired: {
          type: 'boolean',
          example: true,
          description: 'Indica si se requiere verificación de email antes de usar ciertas funciones'
        }
      }
    },

    // ==================== LOGIN ====================
    LoginDto: {
      type: 'object',
      description: 'Credenciales para iniciar sesión en el sistema',
      properties: {
        emailOrUsername: {
          type: 'string',
          example: 'juanperez',
          description: 'Email o nombre de usuario del usuario registrado'
        },
        password: {
          type: 'string',
          format: 'password',
          example: 'SecurePass123!',
          description: 'Contraseña en texto plano del usuario'
        }
      },
      required: ['emailOrUsername', 'password']
    },

    AuthResponseDto: {
      type: 'object',
      description: 'Respuesta exitosa de autenticación con JWT token',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login exitoso' },
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NmY2ZjJjZjJhMWU2YjE3ZjM0ZWYwMDEiLCJpYXQiOjE3MTk1NDAwMDAsImV4cCI6MTcxOTU0MTgwMH0.signature',
          description: 'JWT Bearer token para usar en autorizaciones. Válido por 30 minutos.'
        },
        userDetails: { $ref: '#/components/schemas/UserDetailsDto', description: 'Información básica del usuario autenticado' },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-28T21:30:00.000Z',
          description: 'Fecha y hora UTC de expiración del token'
        }
      }
    },

    // ==================== USUARIO ====================
    UserDetailsDto: {
      type: 'object',
      description: 'Información resumida del usuario (usada en respuestas de autenticación)',
      properties: {
        id: {
          type: 'string',
          example: '66f6f2cf2a1e6b17f34ef001',
          description: 'ID único del usuario (MongoDB ObjectId)'
        },
        username: {
          type: 'string',
          example: 'juanperez',
          description: 'Nombre de usuario'
        },
        profilePicture: {
          type: 'string',
          format: 'uri',
          example: 'https://res.cloudinary.com/kinalcorp/image/upload/...',
          description: 'URL de la foto de perfil en Cloudinary'
        },
        role: {
          type: 'string',
          example: 'USER_ROLE',
          description: 'Rol del usuario en el sistema'
        }
      }
    },

    UserResponseDto: {
      type: 'object',
      description: 'Información completa de un usuario del sistema',
      properties: {
        id: {
          type: 'string',
          example: '66f6f2cf2a1e6b17f34ef001',
          description: 'Identificador único del usuario (MongoDB ObjectId)'
        },
        name: {
          type: 'string',
          example: 'Juan',
          description: 'Primer nombre del usuario'
        },
        surname: {
          type: 'string',
          example: 'Pérez García',
          description: 'Apellido(s) del usuario'
        },
        username: {
          type: 'string',
          example: 'juanperez',
          description: 'Nombre de usuario único'
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'juan.perez@example.com',
          description: 'Dirección de correo electrónico'
        },
        profilePicture: {
          type: 'string',
          format: 'uri',
          example: 'https://res.cloudinary.com/kinalcorp/image/upload/...',
          description: 'URL de la foto de perfil'
        },
        phone: {
          type: 'string',
          example: '55552222',
          description: 'Teléfono del usuario (8 dígitos)'
        },
        role: {
          type: 'string',
          example: 'USER_ROLE',
          description: 'Rol del usuario (USER_ROLE, ADMIN_ROLE, etc.)'
        },
        status: {
          type: 'boolean',
          example: true,
          description: 'Estado activo (true) o inactivo (false) de la cuenta'
        },
        isEmailVerified: {
          type: 'boolean',
          example: true,
          description: 'Indica si el correo del usuario ha sido verificado'
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-20T10:00:00.000Z',
          description: 'Timestamp UTC de creación de la cuenta'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-28T15:30:00.000Z',
          description: 'Timestamp UTC de última actualización'
        }
      }
    },

    // ==================== ROLES ====================
    UpdateUserRoleDto: {
      type: 'object',
      description: 'Datos para actualizar el rol de un usuario',
      properties: {
        roleName: {
          type: 'string',
          example: 'ADMIN_ROLE',
          description: 'Nuevo nombre de rol a asignar al usuario'
        }
      },
      required: ['roleName']
    },

    // ==================== EMAIL ====================
    VerifyEmailDto: {
      type: 'object',
      description: 'Token para verificar la dirección de correo del usuario',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInB1cnBvc2UiOiJlbWFpbF92ZXJpZmljYXRpb24ifQ...',
          description: 'Token JWT de verificación enviado al correo del usuario'
        }
      },
      required: ['token']
    },

    ResendVerificationDto: {
      type: 'object',
      description: 'Solicitud para reenviar el correo de verificación',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'juan.perez@example.com',
          description: 'Correo del usuario que necesita verificación'
        }
      },
      required: ['email']
    },

    ForgotPasswordDto: {
      type: 'object',
      description: 'Solicitud para iniciar el proceso de recuperación de contraseña',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'juan.perez@example.com',
          description: 'Correo asociado a la cuenta'
        }
      },
      required: ['email']
    },

    ResetPasswordDto: {
      type: 'object',
      description: 'Datos para restablecer la contraseña del usuario',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInB1cnBvc2UiOiJwYXNzd29yZF9yZXNldCJ9...',
          description: 'Token JWT de recuperación enviado por correo'
        },
        newPassword: {
          type: 'string',
          format: 'password',
          minLength: 8,
          example: 'NewSecurePass456!',
          description: 'Nueva contraseña (mínimo 8 caracteres)'
        }
      },
      required: ['token', 'newPassword']
    },

    EmailResponseDto: {
      type: 'object',
      description: 'Respuesta genérica para operaciones relacionadas con email',
      properties: {
        success: { type: 'boolean', example: true, description: 'Indica si la operación fue exitosa' },
        message: {
          type: 'string',
          example: 'Verification email sent successfully',
          description: 'Mensaje descriptivo del resultado'
        },
        data: {
          type: 'object',
          nullable: true,
          additionalProperties: true,
          description: 'Datos adicionales (puede variar según la operación)'
        }
      }
    },

    // ==================== HEALTH ====================
    HealthResponseDto: {
      type: 'object',
      description: 'Respuesta de estado del servicio de autenticación',
      properties: {
        status: {
          type: 'string',
          enum: ['Healthy', 'Degraded', 'Unhealthy'],
          example: 'Healthy',
          description: 'Estado actual del servicio'
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-28T21:00:00.000Z',
          description: 'Timestamp UTC cuando se verificó el estado'
        },
        service: {
          type: 'string',
          example: 'KinalSports Authentication Service',
          description: 'Nombre identificador del servicio'
        }
      }
    },

    // ==================== LENGUAJE DE SIGNOS ====================
    SignLanguageResourceDto: {
      type: 'object',
      description: 'Recurso multimedia de lenguaje de signos para accesibilidad',
      properties: {
        key: {
          type: 'string',
          example: 'login',
          description: 'Identificador único del recurso (ej: login, register, forgot-password, reset-password)'
        },
        description: {
          type: 'string',
          example: 'Demostración en lenguaje de signos del proceso de login',
          description: 'Descripción detallada del contenido del recurso'
        },
        videoUrl: {
          type: 'string',
          format: 'uri',
          example: 'https://res.cloudinary.com/kinalcorp/video/upload/v1719541200/login.mp4',
          description: 'URL del video en Cloudinary con demostración en lenguaje de signos'
        },
        imageUrl: {
          type: 'string',
          format: 'uri',
          example: 'https://res.cloudinary.com/kinalcorp/image/upload/v1719541200/login.png',
          description: 'URL de imagen representativa en Cloudinary (miniatura o frame del video)'
        }
      }
    },

    SignLanguageResourcesListDto: {
      type: 'object',
      description: 'Respuesta con lista completa de recursos de lenguaje de signos',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/SignLanguageResourceDto' },
          description: 'Array de recursos de lenguaje de signos disponibles'
        }
      }
    },

    SignLanguageResourceItemDto: {
      type: 'object',
      description: 'Respuesta con un recurso individual de lenguaje de signos',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/SignLanguageResourceDto', description: 'Recurso específico solicitado' }
      }
    },

    // ==================== VIDEO CALL & ORCHESTRATOR ====================
    CallMetadataDto: {
      type: 'object',
      description: 'Metadatos opcionales de contexto de la videollamada',
      properties: {
        topic: { type: 'string', example: 'Emergency Meeting' },
        notes: { type: 'string', example: 'Important discussion' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['urgent', 'priority']
        }
      }
    },

    InitiateCallDto: {
      type: 'object',
      description: 'Payload para iniciar una nueva videollamada',
      properties: {
        recipientId: {
          type: 'string',
          example: 'user-123',
          description: 'ID del usuario destinatario de la llamada'
        },
        metadata: { $ref: '#/components/schemas/CallMetadataDto' }
      },
      required: ['recipientId']
    },

    DetectAndTranslateDto: {
      type: 'object',
      description: 'Payload para detectar una seña desde un frame y traducirla',
      properties: {
        frame: {
          type: 'string',
          example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          description: 'Frame en base64 o data URL (image/*)'
        },
        callId: {
          type: 'string',
          example: 'call_550e8400-e29b-41d4-a716-446655440000',
          description: 'ID de la llamada asociada al frame'
        }
      },
      required: ['frame', 'callId']
    },

    StartTranslationStreamDto: {
      type: 'object',
      description: 'Payload para iniciar stream continuo de traducción',
      properties: {
        callId: {
          type: 'string',
          example: 'call_550e8400-e29b-41d4-a716-446655440000'
        }
      },
      required: ['callId']
    },

    UpdateStreamMetricsDto: {
      type: 'object',
      description: 'Incrementos de métricas de stream',
      properties: {
        frames: { type: 'integer', minimum: 0, example: 10 },
        translations: { type: 'integer', minimum: 0, example: 8 }
      }
    }
  },
  responses: COMMON_RESPONSES,
  parameters: COMMON_PARAMETERS
};


/**
 * AUTH ENDPOINTS
 * Operaciones de autenticación, registro, verificación de email y recuperación de contraseña
 */
const AUTH_PATHS = {
  [`${BASE_PATH}/auth/register`]: {
    post: {
      tags: ['Auth'],
      operationId: 'registerNewUser',
      summary: 'Registrar nuevo usuario',
      description: `Crea una nueva cuenta de usuario en el sistema. 
        - Acepta multipart/form-data (incluyendo archivo de foto de perfil)
        - Valida datos únicos (email, username)
        - Envía correo de verificación automáticamente
        - Foto de perfil es opcional (máximo 10MB)
        - Devuelve 201 Created con datos del usuario creado`,
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/RegisterDto' },
            examples: {
              sinFotoPerfil: {
                summary: 'Registro sin foto de perfil',
                value: {
                  name: 'Juan',
                  surname: 'Pérez García',
                  username: 'juanperez',
                  email: 'juan.perez@example.com',
                  password: 'SecurePass123!',
                  phone: '55552222'
                }
              },
              conFotoPerfil: {
                summary: 'Registro con foto de perfil',
                value: {
                  name: 'María',
                  surname: 'López Rodríguez',
                  username: 'marialopez',
                  email: 'maria.lopez@example.com',
                  password: 'SecurePass456!',
                  phone: '55551111',
                  profilePicture: '[archivo binario JPEG/PNG/GIF, máximo 10MB]'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Usuario registrado exitosamente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterResponseDto' },
              examples: {
                exitoso: {
                  summary: 'Registro exitoso',
                  value: {
                    success: true,
                    message: 'Usuario registrado exitosamente',
                    emailVerificationRequired: true,
                    user: {
                      id: '66f6f2cf2a1e6b17f34ef001',
                      name: 'Juan',
                      surname: 'Pérez García',
                      username: 'juanperez',
                      email: 'juan.perez@example.com',
                      profilePicture: null,
                      phone: '55552222',
                      role: 'USER_ROLE',
                      status: true,
                      isEmailVerified: false,
                      createdAt: '2026-04-28T15:00:00.000Z',
                      updatedAt: '2026-04-28T15:00:00.000Z'
                    }
                  }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/auth/login`]: {
    post: {
      tags: ['Auth'],
      operationId: 'authenticateUser',
      summary: 'Iniciar sesión (Autenticación)',
      description: `Autentica un usuario en el sistema.
        - Acepta email O username + contraseña
        - Genera JWT token válido por 30 minutos
        - Incluye información básica del usuario
        - Retorna fecha de expiración del token`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginDto' },
            examples: {
              conEmail: {
                summary: 'Login usando email',
                value: {
                  emailOrUsername: 'juan.perez@example.com',
                  password: 'SecurePass123!'
                }
              },
              conUsername: {
                summary: 'Login usando username',
                value: {
                  emailOrUsername: 'juanperez',
                  password: 'SecurePass123!'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Autenticación exitosa',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponseDto' },
              example: {
                success: true,
                message: 'Login exitoso',
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NmY2ZjJjZjJhMWU2YjE3ZjM0ZWYwMDEiLCJpYXQiOjE3MTk1NDAwMDAsImV4cCI6MTcxOTU0MTgwMH0.abc123',
                expiresAt: '2026-04-28T21:30:00.000Z',
                userDetails: {
                  id: '66f6f2cf2a1e6b17f34ef001',
                  username: 'juanperez',
                  profilePicture: null,
                  role: 'USER_ROLE'
                }
              }
            }
          }
        },
        400: {
          description: 'Credenciales inválidas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Invalid email/username or password',
                error: 'INVALID_CREDENTIALS'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/auth/profile`]: {
    get: {
      tags: ['Auth'],
      operationId: 'getCurrentUserProfile',
      summary: 'Obtener perfil del usuario autenticado',
      description: `Retorna los datos completos del usuario autenticado actualmente.
        - Requiere JWT token válido en header Authorization
        - Token puede estar expirado hasta 30 minutos
        - Incluye toda la información del usuario`,
      security: AUTH_SECURITY,
      responses: {
        200: {
          description: 'Perfil obtenido exitosamente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Perfil obtenido exitosamente' },
                  data: { $ref: '#/components/schemas/UserResponseDto' }
                }
              },
              example: {
                success: true,
                message: 'Perfil obtenido exitosamente',
                data: {
                  id: '66f6f2cf2a1e6b17f34ef001',
                  name: 'Juan',
                  surname: 'Pérez García',
                  username: 'juanperez',
                  email: 'juan.perez@example.com',
                  profilePicture: null,
                  phone: '55552222',
                  role: 'USER_ROLE',
                  status: true,
                  isEmailVerified: true,
                  createdAt: '2026-04-28T15:00:00.000Z',
                  updatedAt: '2026-04-28T15:00:00.000Z'
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: {
          description: 'Usuario no encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/auth/verify-email`]: {
    post: {
      tags: ['Auth'],
      operationId: 'verifyEmailAddress',
      summary: 'Verificar correo electrónico',
      description: `Valida y activa la verificación del correo del usuario.
        - Usa el token enviado al correo durante el registro
        - El token expira en 24 horas
        - Una vez verificado, el usuario puede acceder a todas las funciones`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VerifyEmailDto' },
            example: {
              token: 'eyJhbGciOiJIUzI1NiIsInB1cnBvc2UiOiJlbWFpbF92ZXJpZmljYXRpb24ifQ.eyJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE3MTk1NDAwMDB9.xyz789'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Correo verificado exitosamente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailResponseDto' },
              example: {
                success: true,
                message: 'Email verified successfully',
                data: { verified: true }
              }
            }
          }
        },
        400: {
          description: 'Token inválido o expirado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Invalid or expired verification token',
                error: 'INVALID_TOKEN'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/auth/resend-verification`]: {
    post: {
      tags: ['Auth'],
      operationId: 'resendEmailVerification',
      summary: 'Reenviar correo de verificación',
      description: `Genera y envía un nuevo token de verificación de email.
        - Úsalo si no recibiste el correo inicial
        - Genera un nuevo token que expira en 24 horas
        - El email ya no debe estar verificado previamente`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResendVerificationDto' },
            example: {
              email: 'juan.perez@example.com'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Correo de verificación reenviado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailResponseDto' },
              example: {
                success: true,
                message: 'Verification email resent successfully',
                data: null
              }
            }
          }
        },
        400: {
          description: 'Email ya está verificado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Email is already verified',
                error: 'ALREADY_VERIFIED'
              }
            }
          }
        },
        404: {
          description: 'Usuario no encontrado con ese email',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'No user found with this email address',
                error: 'USER_NOT_FOUND'
              }
            }
          }
        },
        503: { $ref: '#/components/responses/ServiceUnavailable' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/auth/forgot-password`]: {
    post: {
      tags: ['Auth'],
      operationId: 'initiatePasswordRecovery',
      summary: 'Solicitar recuperación de contraseña',
      description: `Inicia el proceso de recuperación de contraseña.
        - Genera un token de recuperación y lo envía por email
        - El token expira en 1 hora
        - Por seguridad, siempre retorna success aunque el email no exista
        - El usuario debe verificar su correo para obtener el link de reset`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ForgotPasswordDto' },
            example: {
              email: 'juan.perez@example.com'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Solicitud procesada (mismo mensaje si usuario existe o no, por seguridad)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailResponseDto' },
              example: {
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent',
                data: null
              }
            }
          }
        },
        503: {
          description: 'Servicio de email no disponible',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Email service temporarily unavailable',
                error: 'SERVICE_UNAVAILABLE'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/auth/reset-password`]: {
    post: {
      tags: ['Auth'],
      operationId: 'resetForgottenPassword',
      summary: 'Restablecer contraseña',
      description: `Cambia la contraseña usando el token de recuperación.
        - Token debe ser válido (no expirado, máximo 1 hora)
        - Nueva contraseña debe cumplir requisitos de seguridad
        - Después del reset, el usuario puede iniciar sesión con la nueva contraseña`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResetPasswordDto' },
            example: {
              token: 'eyJhbGciOiJIUzI1NiIsInB1cnBvc2UiOiJwYXNzd29yZF9yZXNldCJ9.eyJzdWIiOiI2NmY2ZjJjZjJhMWU2YjE3ZjM0ZWYwMDEiLCJpYXQiOjE3MTk1NDAwMDB9.abc123',
              newPassword: 'NewSecurePass456!'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Contraseña restablecida exitosamente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailResponseDto' },
              example: {
                success: true,
                message: 'Password reset successfully',
                data: null
              }
            }
          }
        },
        400: {
          description: 'Token inválido, expirado o contraseña no válida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                tokenExpirado: {
                  summary: 'Token expirado',
                  value: {
                    success: false,
                    message: 'Password reset token has expired',
                    error: 'TOKEN_EXPIRED'
                  }
                },
                passwordDebil: {
                  summary: 'Contraseña no cumple requisitos',
                  value: {
                    success: false,
                    message: 'Password must be at least 8 characters',
                    error: 'WEAK_PASSWORD'
                  }
                }
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  }
};

/**
 * USER ENDPOINTS
 * Gestión de usuarios y administración de roles
 */
const USER_PATHS = {
  [`${BASE_PATH}/users/{userId}/role`]: {
    put: {
      tags: ['Roles'],
      operationId: 'updateUserRoleAssignment',
      summary: 'Actualizar rol de usuario (Solo Administrador)',
      description: `Cambia el rol de un usuario en el sistema.
        - Requiere JWT token válido Y rol de administrador
        - Útil para promover usuarios a administradores
        - Retorna los datos completos del usuario actualizado
        - Devuelve 403 si no eres administrador`,
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/UserIdPathParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateUserRoleDto' },
            examples: {
              hacerAdmin: {
                summary: 'Promover usuario a administrador',
                value: { roleName: 'ADMIN_ROLE' }
              },
              hacerUsuarioNormal: {
                summary: 'Cambiar a usuario regular',
                value: { roleName: 'USER_ROLE' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Rol actualizado exitosamente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserResponseDto' },
              example: {
                id: '66f6f2cf2a1e6b17f34ef001',
                name: 'Juan',
                surname: 'Pérez García',
                username: 'juanperez',
                email: 'juan.perez@example.com',
                profilePicture: null,
                phone: '55552222',
                role: 'ADMIN_ROLE',
                status: true,
                isEmailVerified: true,
                createdAt: '2026-04-28T15:00:00.000Z',
                updatedAt: '2026-04-28T20:15:00.000Z'
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: {
          description: 'Usuario no encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'User not found with the provided ID',
                error: 'USER_NOT_FOUND'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/users/{userId}/roles`]: {
    get: {
      tags: ['Roles'],
      operationId: 'getUserRoleList',
      summary: 'Obtener roles de un usuario',
      description: `Retorna un array con todos los roles asignados a un usuario específico.
        - Requiere JWT token válido
        - Devuelve lista de strings (nombres de roles)
        - Importante para verificar permisos del usuario`,
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/UserIdPathParam' }],
      responses: {
        200: {
          description: 'Roles obtenidos exitosamente',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { type: 'string', description: 'Nombre del rol' },
                description: 'Array de roles del usuario'
              },
              examples: {
                usuarioRegular: {
                  summary: 'Usuario con rol básico',
                  value: ['USER_ROLE']
                },
                usuarioConMultiplesRoles: {
                  summary: 'Usuario con múltiples roles',
                  value: ['USER_ROLE', 'MODERATOR_ROLE']
                },
                administrador: {
                  summary: 'Usuario administrador',
                  value: ['ADMIN_ROLE']
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: {
          description: 'Usuario no encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'User not found with the provided ID',
                error: 'USER_NOT_FOUND'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/users/by-role/{roleName}`]: {
    get: {
      tags: ['Users'],
      operationId: 'listUsersByRole',
      summary: 'Obtener usuarios por rol (Solo Administrador)',
      description: `Retorna lista de todos los usuarios con un rol específico.
        - Requiere JWT token válido Y rol de administrador
        - Útil para auditoría y gestión de permisos
        - Devuelve datos completos de cada usuario
        - Devuelve 403 si no eres administrador`,
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/RoleNamePathParam' }],
      responses: {
        200: {
          description: 'Usuarios encontrados',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/UserResponseDto' },
                description: 'Lista de usuarios con el rol especificado'
              },
              example: [
                {
                  id: '66f6f2cf2a1e6b17f34ef001',
                  name: 'Juan',
                  surname: 'Pérez García',
                  username: 'juanperez',
                  email: 'juan.perez@example.com',
                  profilePicture: null,
                  phone: '55552222',
                  role: 'ADMIN_ROLE',
                  status: true,
                  isEmailVerified: true,
                  createdAt: '2026-04-28T15:00:00.000Z',
                  updatedAt: '2026-04-28T20:15:00.000Z'
                },
                {
                  id: '66f6f2cf2a1e6b17f34ef002',
                  name: 'María',
                  surname: 'López Rodríguez',
                  username: 'marialopez',
                  email: 'maria.lopez@example.com',
                  profilePicture: 'https://res.cloudinary.com/...',
                  phone: '55551111',
                  role: 'ADMIN_ROLE',
                  status: true,
                  isEmailVerified: true,
                  createdAt: '2026-04-22T10:00:00.000Z',
                  updatedAt: '2026-04-28T18:00:00.000Z'
                }
              ]
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  }
};

/**
 * HEALTH ENDPOINTS
 * Monitoreo y estado del servicio
 */
const HEALTH_PATHS = {
  [`${BASE_PATH}/health`]: {
    get: {
      tags: ['Health'],
      operationId: 'checkServiceHealth',
      summary: 'Verificar estado del servicio',
      description: `Endpoint de health check para monitoreo de infraestructura.
        - No requiere autenticación
        - Ideal para load balancers y orquestadores (Kubernetes, Docker Swarm)
        - Responde rápidamente indicando si el servicio está disponible
        - Útil para CI/CD pipelines y monitoreo automático`,
      responses: {
        200: {
          description: 'Servicio está en funcionamiento',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthResponseDto' },
              examples: {
                saludable: {
                  summary: 'Servicio saludable',
                  value: {
                    status: 'Healthy',
                    timestamp: '2026-04-28T21:00:00.000Z',
                    service: 'KinalSports Authentication Service'
                  }
                },
                degradado: {
                  summary: 'Servicio degradado',
                  value: {
                    status: 'Degraded',
                    timestamp: '2026-04-28T21:00:30.000Z',
                    service: 'KinalSports Authentication Service'
                  }
                }
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  }
};

/**
 * SIGN LANGUAGE ENDPOINTS
 * Recursos multimedia para accesibilidad
 */
const SIGNLANGUAGE_PATHS = {
  [`${BASE_PATH}/signlanguage`]: {
    get: {
      tags: ['SignLanguage'],
      operationId: 'listAllSignLanguageResources',
      summary: 'Obtener todos los recursos de lenguaje de signos',
      description: `Retorna catálogo completo de recursos multimedia de lenguaje de signos.
        - No requiere autenticación
        - Útil para llenar UI con videos e imágenes de ayuda
        - Cada recurso tiene video y imagen representativa
        - URLs apuntan a Cloudinary (CDN optimizado)
        - Ideal para mostrar tutoriales en lenguaje de signos`,
      responses: {
        200: {
          description: 'Catálogo de recursos obtenido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignLanguageResourcesListDto' },
              example: {
                success: true,
                data: [
                  {
                    key: 'login',
                    description: 'Demostración en lenguaje de signos del proceso de login',
                    videoUrl: 'https://res.cloudinary.com/kinalcorp/video/upload/v1719541200/login.mp4',
                    imageUrl: 'https://res.cloudinary.com/kinalcorp/image/upload/v1719541200/login.png'
                  },
                  {
                    key: 'register',
                    description: 'Demostración en lenguaje de signos del proceso de registro',
                    videoUrl: 'https://res.cloudinary.com/kinalcorp/video/upload/v1719541200/register.mp4',
                    imageUrl: 'https://res.cloudinary.com/kinalcorp/image/upload/v1719541200/register.png'
                  },
                  {
                    key: 'forgot-password',
                    description: 'Demostración en lenguaje de signos para recuperar contraseña',
                    videoUrl: 'https://res.cloudinary.com/kinalcorp/video/upload/v1719541200/forgot-password.mp4',
                    imageUrl: 'https://res.cloudinary.com/kinalcorp/image/upload/v1719541200/forgot-password.png'
                  }
                ]
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  [`${BASE_PATH}/signlanguage/{key}`]: {
    get: {
      tags: ['SignLanguage'],
      operationId: 'getSignLanguageResourceByKey',
      summary: 'Obtener recurso de lenguaje de signos por clave',
      description: `Obtiene un recurso específico de lenguaje de signos usando su identificador.
        - No requiere autenticación
        - Ejemplos de claves: "login", "register", "forgot-password", "reset-password"
        - Retorna 404 si la clave no existe
        - Cada recurso incluye video + imagen para máxima accesibilidad`,
      parameters: [{ $ref: '#/components/parameters/SignLanguageKeyParam' }],
      responses: {
        200: {
          description: 'Recurso encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignLanguageResourceItemDto' },
              example: {
                success: true,
                data: {
                  key: 'login',
                  description: 'Demostración en lenguaje de signos del proceso de login',
                  videoUrl: 'https://res.cloudinary.com/kinalcorp/video/upload/v1719541200/login.mp4',
                  imageUrl: 'https://res.cloudinary.com/kinalcorp/image/upload/v1719541200/login.png'
                }
              }
            }
          }
        },
        404: {
          description: 'Recurso no encontrado con esa clave',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: "Sign language resource 'invalid-key' not found.",
                error: 'RESOURCE_NOT_FOUND'
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  }
};

/**
 * VIDEO CALL ENDPOINTS
 * Gestión completa del ciclo de vida de videollamadas
 */
const VIDEOCALL_PATHS = {
  '/calls/initiate': {
    post: {
      tags: ['VideoCalls'],
      operationId: 'initiateVideoCall',
      summary: 'Iniciar una videollamada',
      description: `Crea una nueva sesión de videollamada.
        - Requiere JWT token válido
        - El iniciador se toma automáticamente del token
        - El destinatario debe ser distinto al iniciador
        - El estado inicial de la llamada es "pending"`,
      security: AUTH_SECURITY,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InitiateCallDto' },
            example: {
              recipientId: 'user-123',
              metadata: {
                topic: 'Emergency Meeting',
                notes: 'Important discussion',
                tags: ['urgent', 'priority']
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Llamada iniciada exitosamente',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Call initiated successfully',
                data: {
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  initiatorId: 'user-456',
                  status: 'pending',
                  createdAt: '2024-01-15T10:00:00.000Z',
                  recipientId: 'user-123'
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/calls/{callId}/join': {
    post: {
      tags: ['VideoCalls'],
      operationId: 'joinVideoCall',
      summary: 'Unirse a una videollamada',
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/CallIdPathParam' }],
      responses: {
        200: {
          description: 'Usuario unido exitosamente a la llamada',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Joined call successfully',
                data: {
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  status: 'active',
                  participants: ['user-456', 'user-123'],
                  startTime: '2024-01-15T10:01:00.000Z',
                  participantCount: 2
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/calls/{callId}/leave': {
    post: {
      tags: ['VideoCalls'],
      operationId: 'leaveVideoCall',
      summary: 'Salir de una videollamada',
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/CallIdPathParam' }],
      responses: {
        200: {
          description: 'Usuario salió exitosamente de la llamada',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Left call successfully',
                data: {
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  status: 'active',
                  participantCount: 1,
                  endTime: null
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/calls/{callId}/status': {
    get: {
      tags: ['VideoCalls'],
      operationId: 'getVideoCallStatus',
      summary: 'Obtener estado de una videollamada',
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/CallIdPathParam' }],
      responses: {
        200: {
          description: 'Estado de llamada obtenido exitosamente',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  status: 'active',
                  initiatorId: 'user-456',
                  participants: ['user-456', 'user-123'],
                  participantCount: 2,
                  startTime: '2024-01-15T10:01:00.000Z',
                  endTime: null,
                  duration: 180,
                  formattedDuration: '00:03:00',
                  isActive: true,
                  metadata: {
                    topic: 'Emergency Meeting',
                    notes: 'Important discussion',
                    tags: ['urgent', 'priority']
                  },
                  createdAt: '2024-01-15T10:00:00.000Z',
                  updatedAt: '2024-01-15T10:04:00.000Z'
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/calls/{callId}/end': {
    post: {
      tags: ['VideoCalls'],
      operationId: 'endVideoCall',
      summary: 'Terminar una videollamada',
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/CallIdPathParam' }],
      responses: {
        200: {
          description: 'Llamada finalizada exitosamente',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Call ended successfully',
                data: {
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  status: 'ended',
                  participants: ['user-456', 'user-123'],
                  startTime: '2024-01-15T10:01:00.000Z',
                  endTime: '2024-01-15T10:25:00.000Z',
                  duration: 1440,
                  formattedDuration: '00:24:00',
                  sessionSummary: {
                    totalParticipants: 2,
                    durationSeconds: 1440,
                    initiator: 'user-456',
                    endedBy: 'user-456'
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/calls/user/history': {
    get: {
      tags: ['VideoCalls'],
      operationId: 'getUserVideoCallHistory',
      summary: 'Obtener historial de videollamadas del usuario',
      security: AUTH_SECURITY,
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          description: 'Cantidad máxima de llamadas a retornar'
        },
        {
          name: 'skip',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 0, default: 0 },
          description: 'Cantidad de registros a omitir para paginación'
        }
      ],
      responses: {
        200: {
          description: 'Historial de llamadas obtenido exitosamente',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  calls: [
                    {
                      callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                      status: 'ended',
                      initiatorId: 'user-456',
                      participants: ['user-456', 'user-123'],
                      participantCount: 2,
                      startTime: '2024-01-15T10:01:00.000Z',
                      endTime: '2024-01-15T10:25:00.000Z',
                      duration: 1440,
                      formattedDuration: '00:24:00',
                      createdAt: '2024-01-15T10:00:00.000Z'
                    }
                  ],
                  pagination: {
                    total: 128,
                    limit: 10,
                    skip: 0,
                    hasMore: true
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/calls/user/active': {
    get: {
      tags: ['VideoCalls'],
      operationId: 'getUserActiveVideoCall',
      summary: 'Obtener llamada activa del usuario',
      security: AUTH_SECURITY,
      responses: {
        200: {
          description: 'Resultado de búsqueda de llamada activa',
          content: {
            'application/json': {
              examples: {
                conLlamadaActiva: {
                  summary: 'Usuario con llamada activa',
                  value: {
                    success: true,
                    data: {
                      callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                      status: 'active',
                      initiatorId: 'user-456',
                      participants: ['user-456', 'user-123'],
                      participantCount: 2,
                      startTime: '2024-01-15T10:01:00.000Z',
                      metadata: {
                        topic: 'Emergency Meeting',
                        notes: 'Important discussion',
                        tags: ['urgent']
                      }
                    }
                  }
                },
                sinLlamadaActiva: {
                  summary: 'Usuario sin llamada activa',
                  value: {
                    success: true,
                    data: null,
                    message: 'No active calls'
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  }
};

/**
 * ORCHESTRATOR ENDPOINTS
 * Flujo de traducción de señas en tiempo real
 */
const ORCHESTRATOR_PATHS = {
  '/orchestrate/detect': {
    post: {
      tags: ['Orchestrator'],
      operationId: 'detectAndTranslateSign',
      summary: 'Detectar seña y traducir desde un frame',
      security: AUTH_SECURITY,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/DetectAndTranslateDto' },
            example: {
              frame: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              callId: 'call_550e8400-e29b-41d4-a716-446655440000'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Detección y traducción completadas',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Detection and translation completed',
                data: {
                  detectionId: 'detect_550e8400-e29b-41d4-a716-446655440000',
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  userId: 'user-456',
                  signs: ['HOLA', 'MUNDO'],
                  text: 'Hola mundo',
                  confidence: 0.92,
                  processingTime: 245,
                  timestamp: '2024-01-15T10:00:00.000Z'
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/stream': {
    post: {
      tags: ['Orchestrator'],
      operationId: 'startTranslationStream',
      summary: 'Iniciar stream de traducción',
      security: AUTH_SECURITY,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StartTranslationStreamDto' },
            example: {
              callId: 'call_550e8400-e29b-41d4-a716-446655440000'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Stream de traducción iniciado',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Translation stream started',
                data: {
                  streamId: 'stream_550e8400-e29b-41d4-a716-446655440000',
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  userId: 'user-456',
                  status: 'active',
                  startedAt: '2024-01-15T10:00:00.000Z'
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/stream/{streamId}/stop': {
    post: {
      tags: ['Orchestrator'],
      operationId: 'stopTranslationStream',
      summary: 'Detener stream de traducción',
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/StreamIdPathParam' }],
      responses: {
        200: {
          description: 'Stream detenido exitosamente',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Translation stream stopped',
                data: {
                  streamId: 'stream_550e8400-e29b-41d4-a716-446655440000',
                  status: 'stopped',
                  endedAt: '2024-01-15T10:10:00.000Z'
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/history/{callId}': {
    get: {
      tags: ['Orchestrator'],
      operationId: 'getTranslationHistoryByCall',
      summary: 'Obtener historial de traducciones por llamada',
      parameters: [
        { $ref: '#/components/parameters/CallIdPathParam' },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 }
        },
        {
          name: 'skip',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 0, default: 0 }
        }
      ],
      responses: {
        200: {
          description: 'Historial de traducciones obtenido',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    detectionId: 'detect_1',
                    signs: ['HOLA'],
                    text: 'Hola',
                    confidence: 0.94,
                    timestamp: '2024-01-15T10:00:00.000Z'
                  },
                  {
                    detectionId: 'detect_2',
                    signs: ['MUNDO'],
                    text: 'Mundo',
                    confidence: 0.89,
                    timestamp: '2024-01-15T10:00:01.000Z'
                  }
                ]
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/statistics/{callId}': {
    get: {
      tags: ['Orchestrator'],
      operationId: 'getTranslationStatisticsByCall',
      summary: 'Obtener estadísticas de traducción por llamada',
      parameters: [{ $ref: '#/components/parameters/CallIdPathParam' }],
      responses: {
        200: {
          description: 'Estadísticas de traducción obtenidas',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  totalDetections: 120,
                  averageConfidence: 0.91,
                  averageProcessingTimeMs: 230,
                  topSigns: ['HOLA', 'GRACIAS', 'AYUDA']
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/result/{detectionId}': {
    get: {
      tags: ['Orchestrator'],
      operationId: 'getTranslationResultByDetectionId',
      summary: 'Obtener resultado de detección por ID',
      parameters: [{ $ref: '#/components/parameters/DetectionIdPathParam' }],
      responses: {
        200: {
          description: 'Resultado de detección obtenido',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  detectionId: 'detect_550e8400-e29b-41d4-a716-446655440000',
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  signs: ['HOLA', 'MUNDO'],
                  text: 'Hola mundo',
                  confidence: 0.92,
                  processingTime: 245,
                  timestamp: '2024-01-15T10:00:00.000Z'
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/stream/{streamId}': {
    get: {
      tags: ['Orchestrator'],
      operationId: 'getTranslationStreamInfo',
      summary: 'Obtener información de stream de traducción',
      parameters: [{ $ref: '#/components/parameters/StreamIdPathParam' }],
      responses: {
        200: {
          description: 'Información de stream obtenida',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  streamId: 'stream_550e8400-e29b-41d4-a716-446655440000',
                  callId: 'call_550e8400-e29b-41d4-a716-446655440000',
                  status: 'active',
                  framesProcessed: 135,
                  translationsDetected: 87,
                  startedAt: '2024-01-15T10:00:00.000Z',
                  updatedAt: '2024-01-15T10:05:00.000Z'
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  },

  '/orchestrate/stream/{streamId}/metrics': {
    patch: {
      tags: ['Orchestrator'],
      operationId: 'updateTranslationStreamMetrics',
      summary: 'Actualizar métricas de stream',
      security: AUTH_SECURITY,
      parameters: [{ $ref: '#/components/parameters/StreamIdPathParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateStreamMetricsDto' },
            example: {
              frames: 10,
              translations: 8
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Métricas de stream actualizadas',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  streamId: 'stream_550e8400-e29b-41d4-a716-446655440000',
                  framesProcessed: 145,
                  translationsDetected: 95,
                  updatedAt: '2024-01-15T10:06:00.000Z'
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalServerError' }
      }
    }
  }
};


/**
 * OPENAPI SPEC COMPLETO
 * Especificación completa de la API REST para autenticación y gestión de usuarios
 */
export const spec = {
  openapi: '3.0.0',
  info: {
    title: 'AuthServiceSignTrack API',
    version: '1.0.0',
    description: `
# 🔐 AuthServiceSignTrack - API REST Completa

API REST profesional para autenticación, gestión de usuarios y recursos de accesibilidad en lenguaje de signos.

## Características principales

- **Autenticación JWT**: Tokens seguros válidos por 30 minutos
- **Gestión de Usuarios**: Registro, verificación de email, recuperación de contraseña
- **Control de Roles**: Sistema de roles para administración
- **Accesibilidad**: Recursos multimedia en lenguaje de signos
- **Videollamadas**: Ciclo de vida completo de sesiones de llamada
- **Orquestación IA**: Detección y traducción de señas en tiempo real
- **Health Checks**: Monitoreo de disponibilidad del servicio

## Autenticación

Usa Bearer tokens en el header \`Authorization\`:
\`\`\`
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

Obtén un token usando el endpoint \`POST /api/v1/auth/login\`.

## Rate Limiting

- **AuthPolicy**: Aplicado a registro, login, y recuperación de contraseña
- **ApiPolicy**: Aplicado a otros endpoints autenticados

## Códigos de estado

- **200 OK**: Solicitud exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Validación fallida
- **401 Unauthorized**: Token faltante o inválido
- **403 Forbidden**: Permisos insuficientes (requiere rol de administrador)
- **404 Not Found**: Recurso no encontrado
- **503 Service Unavailable**: Servicio externo no disponible (ej: email)
- **500 Internal Server Error**: Error inesperado en el servidor
    `,
    contact: {
      name: 'AuthServiceSignTrack Support',
      email: 'support@authservicesigntrack.com',
      url: 'https://authservicesigntrack.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Servidor local de desarrollo',
      variables: {
        port: {
          default: '5104',
          description: 'Puerto del servidor'
        }
      }
    }
  ],
  tags: TAGS,
  components: COMPONENTS,
  security: AUTH_SECURITY,
  paths: {
    ...AUTH_PATHS,
    ...USER_PATHS,
    ...HEALTH_PATHS,
    ...SIGNLANGUAGE_PATHS,
    ...VIDEOCALL_PATHS,
    ...ORCHESTRATOR_PATHS
  }
};

/**
 * FUNCIÓN PARA MONTRAR SWAGGER UI EN EXPRESS/NESTJS
 * @param {Object} app - Instancia de la aplicación Express o NestJS
 * @param {Object} options - Opciones de configuración
 * @param {string} options.route - Ruta donde montar Swagger UI (default: /docs)
 */
export function setup(app, options = {}) {
  if (!app) return;
  const route = options.route || '/docs';
  app.use(route, swaggerUi.serve, swaggerUi.setup(spec, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      filter: true
    },
    customCss: '.swagger-ui .topbar { display: none }'
  }));
}

export default {
  setup,
  spec
};