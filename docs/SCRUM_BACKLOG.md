# SignTrack — Backlog Scrum (Backend)

> Metodología Scrum · Proyecto escolar · Backend C# + Recognition (Python)

---

## Roles sugeridos

| Rol | Responsabilidad |
|-----|-----------------|
| **Product Owner** | Prioriza historias, valida demos |
| **Scrum Master** | Facilita ceremonias, remueve bloqueos |
| **Dev Backend C#** | Identity, Calls, Messaging, Gateway |
| **Dev IA** | Recognition, MediaPipe, modelos |
| **Dev Frontend** | Repo `SignTrack-frontend` (fuera de alcance backend) |

---

## Ceremonias (propuesta)

| Ceremonia | Frecuencia | Duración |
|-----------|------------|----------|
| Sprint Planning | Inicio de sprint (2 semanas) | 2 h |
| Daily Standup | Diario | 15 min |
| Sprint Review | Fin de sprint | 1 h |
| Retrospectiva | Fin de sprint | 45 min |

---

## Sprint 0 — Estructura inicial ✅ (esta rama)

**Objetivo:** Monorepo limpio con microservicios scaffold y detector de señas aislado.

| ID | Historia | Estado |
|----|----------|--------|
| S0-1 | Eliminar legacy KinalSports/museum | ✅ |
| S0-2 | Mover IA a `services/recognition/` | ✅ |
| S0-3 | Mover Auth a `services/identity/` | ✅ |
| S0-4 | Crear stubs Gateway, Calls, Messaging | ✅ |
| S0-5 | Documentar arquitectura y backlog | ✅ |
| S0-6 | Verificar build `dotnet build SignTrack.sln` | ✅ |

**Definition of Done Sprint 0:**
- [ ] `dotnet build` sin errores
- [ ] `GET /health` responde en Identity, Gateway, Calls, Messaging
- [ ] `pnpm recognition:api` levanta puerto 3000
- [ ] Sin referencias a KinalSports/museum en código activo

---

## Sprint 1 — Identity estable ✅

**Objetivo:** Servicio de identidad listo para consumo del frontend y otros microservicios.

| ID | Historia | Estado |
|----|----------|--------|
| S1-1 | Renombrar a `SignTrack.Identity.*` | ✅ |
| S1-2 | CORS + frontend `:5173` | ✅ |
| S1-3 | EF `MigrateAsync()` | ✅ |
| S1-4 | Swagger + JWT Bearer | ✅ |
| S1-5 | User Secrets (sin secretos en repo) | ✅ |
| S1-6 | SignLanguage → Accessibility | ⏸️ Sprint futuro |

**DoD Sprint 1:** Login/register vía Swagger; JWT `SignTrack.Identity`; frontend → `:5104`.

---

## Sprint 2 — Videollamadas (Calls)

**Objetivo:** Crear/unir salas de videollamada (signaling inicial).

| ID | Historia | Prioridad | Puntos | Asignado |
|----|----------|-----------|--------|----------|
| S2-1 | Modelo `CallRoom`, `Participant` en Calls | Alta | 5 | Backend |
| S2-2 | `POST /rooms` crear sala | Alta | 3 | Backend |
| S2-3 | `POST /rooms/{id}/join` unirse | Alta | 3 | Backend |
| S2-4 | WebSocket/SignalR para signaling WebRTC | Alta | 8 | Backend |
| S2-5 | Validar JWT en Calls | Alta | 2 | Backend |
| S2-6 | Gateway enruta `/api/calls/*` → Calls | Media | 3 | Backend |

**DoD Sprint 2:** Dos clientes pueden crear sala y recibir oferta SDP vía signaling.

---

## Sprint 3 — Mensajería + Recognition en llamada

**Objetivo:** Chat escrito en sala + pipeline de frames hacia detector.

| ID | Historia | Prioridad | Puntos | Asignado |
|----|----------|-----------|--------|----------|
| S3-1 | Modelo `Message` por sala | Alta | 3 | Backend |
| S3-2 | REST + WebSocket para chat en tiempo real | Alta | 5 | Backend |
| S3-3 | Calls envía frames a Recognition (`/predict-letter`) | Alta | 5 | Backend + IA |
| S3-4 | Publicar traducción a participantes vía Messaging | Alta | 5 | Backend |
| S3-5 | Post-proceso texto con `coherence.py` | Media | 3 | IA |

**DoD Sprint 3:** En una llamada, una seña detectada aparece como mensaje de sistema en el chat.

---

## Sprint 4 — Bot traductor + voz

**Objetivo:** Experiencia inclusiva completa en backend.

| ID | Historia | Prioridad | Puntos | Asignado |
|----|----------|-----------|--------|----------|
| S4-1 | Integrar TTS (`speech.py` o Azure) | Media | 5 | IA |
| S4-2 | Configuración por usuario: solo texto / texto+voz | Media | 3 | Backend |
| S4-3 | Historial de traducciones por llamada | Baja | 5 | Backend |
| S4-4 | Tests integración Calls + Recognition | Alta | 5 | QA/Dev |
| S4-5 | Demo sprint review end-to-end | Alta | 2 | Todos |

---

## Backlog del producto (sin sprint asignado)

| ID | Historia | Prioridad |
|----|----------|-----------|
| BP-1 | Notificaciones push / email invitación a sala | Media |
| BP-2 | Grabación de llamadas (consentimiento) | Baja |
| BP-3 | Salas persistentes tipo "equipo de trabajo" | Media |
| BP-4 | Moderación / reportes | Baja |
| BP-5 | Métricas y health dashboard | Baja |

---

## Métricas de velocidad (plantilla)

| Sprint | Comprometido | Completado | Notas |
|--------|--------------|------------|-------|
| 0 | 6 | — | Estructura inicial |
| 1 | — | — | |
| 2 | — | — | |

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| WebRTC complejo para proyecto escolar | Empezar con signaling mínimo; usar librería probada en frontend |
| Modelo IA sin datos suficientes | Usar detector existente; no bloquear sprints de app |
| Equipo sin planificación formal | Este backlog + planning cada 2 semanas |
| Secretos en appsettings | Sprint 1: User Secrets obligatorio |
