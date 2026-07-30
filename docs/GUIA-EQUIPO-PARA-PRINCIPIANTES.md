# SignTrack — Documento de Proyecto

## 1. Descripción general

**SignTrack** es una plataforma de comunicación inclusiva, similar en concepto a Microsoft Teams, diseñada para personas sordas. Su característica principal es un módulo de inteligencia artificial que reconoce lenguaje de señas a través de la cámara y lo traduce a texto en tiempo real, permitiendo que la otra persona en una conversación pueda leer lo que se está comunicando.

### Funcionalidades principales

- Registro e inicio de sesión de usuarios.
- Chat de mensajería directa entre contactos.
- Videollamadas en tiempo real.
- Reconocimiento de lenguaje de señas mediante cámara, con traducción a texto.
- Gestión de contactos, grupos, calendario y tareas.

---

## 2. Arquitectura del sistema

El sistema está construido con una arquitectura de **microservicios**: en lugar de un solo programa que hace todo, cada función principal está separada en un servicio independiente. Esto facilita el desarrollo, las pruebas y el mantenimiento.

| Servicio | Función | Puerto |
|---|---|---|
| **Identity** | Autenticación: registro, inicio de sesión, gestión de usuarios | 5104 |
| **Gateway** | Punto de entrada único de la API; distribuye las solicitudes al resto de servicios | 5050 |
| **Calls** | Gestión de videollamadas y salas de reunión | 5200 |
| **Messaging** | Mensajería de chat en tiempo real | 5300 |
| **Recognition** | Reconocimiento de lenguaje de señas mediante IA (MediaPipe) | 3000 |
| **Postgres** | Base de datos relacional (usuarios, mensajes, salas, contactos) | — |
| **Redis** | Almacenamiento en memoria para datos temporales y de sesión | — |
| **LiveKit** | Servicio de videollamadas grupales (3+ personas) | — |
| **Caddy** | Servidor web y proxy inverso: sirve el frontend y enruta las peticiones a cada servicio | — |

El **frontend** (interfaz web que usa el usuario final) está construido con React y se comunica con el backend a través del Gateway.

### Infraestructura actual

El sistema completo corre sobre una computadora personal configurada como servidor, expuesta a internet mediante un túnel seguro (Cloudflare Tunnel), sin necesidad de configuración de red avanzada en el router local. Las videollamadas 1 a 1 utilizan un servicio TURN (OpenRelay) para garantizar la conectividad entre redes distintas, incluso detrás de NAT o firewalls restrictivos.

---

## 3. Estado actual del proyecto

### Completado y funcional

| Módulo | Estado |
|---|---|
| Registro e inicio de sesión | ✅ Funcional |
| Mensajería de texto | ✅ Funcional |
| Videollamadas 1 a 1 (entre redes distintas) | ✅ Funcional |
| Reconocimiento de lenguaje de señas | ✅ Funcional (modelo local) |
| Contactos, grupos, calendario, tareas | ✅ Funcional |

### Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| Videollamadas grupales (3+ personas) | No disponibles en el entorno actual. Requieren infraestructura de red adicional (LiveKit con acceso público) no configurada todavía. |
| Precisión del reconocimiento de señas | Utiliza el modelo local (MediaPipe); una versión con mayor precisión requeriría integración con un servicio de IA en la nube, pendiente de configuración. |
| Notificaciones push | Pendientes de configuración final (llaves VAPID). |
| Disponibilidad del servidor | El acceso público depende de que el servidor (computadora host) esté encendido y con el túnel activo. La URL pública es temporal y cambia en cada reinicio del servicio. |
| Aplicación móvil | Build de distribución en proceso; no incluida en el alcance de este documento. |

---

## 4. Cómo acceder y probar el sistema

1. Solicitar la URL pública vigente (cambia cada vez que se reinicia el servidor).
2. Abrir la URL en el navegador de cualquier dispositivo (celular o computadora).
3. Iniciar sesión con una cuenta de prueba (ver tabla abajo) o registrar una nueva.
4. Ir a la sección **Llamadas**, asignar un título y crear una reunión (modalidad 1 a 1).
5. Compartir el enlace de la reunión con la otra persona mediante el botón "Copiar enlace".
6. Autorizar el acceso a cámara y micrófono cuando el navegador lo solicite.

### Cuentas de prueba

Las siguientes cuentas ya están registradas y conectadas entre sí como contactos:

| Correo | Contraseña |
|---|---|
| maria.demo@signtrack.test | Test1234! |
| carlos.demo@signtrack.test | Test1234! |
| ana.demo@signtrack.test | Test1234! |
| luis.demo@signtrack.test | Test1234! |

Para probar una videollamada real, se recomienda que dos personas del equipo inicien sesión con cuentas distintas, cada una desde su propio dispositivo.

---

## 5. Resumen

SignTrack cuenta con un backend de microservicios funcional, un frontend web operativo, y las funcionalidades principales (autenticación, chat, videollamadas 1 a 1 y reconocimiento de señas) verificadas y en funcionamiento entre distintas redes. Las videollamadas grupales y la distribución móvil quedan como próximos pasos del proyecto.
