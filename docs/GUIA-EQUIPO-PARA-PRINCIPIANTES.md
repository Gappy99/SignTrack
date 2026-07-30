# Guía de SignTrack para todo el equipo (sin necesitar saber programar)

Esta guía es para cualquier compañero del equipo que quiera entender qué estamos construyendo, qué funciona ya, qué falta, y cómo probarlo — **sin necesidad de saber nada de programación**. Está escrita como si te lo estuviera explicando en persona.

> **Importante sobre esta guía:** aquí solo se explica la parte del proyecto en la que trabajó Josué (backend y la página web / frontend). No cubre las partes de otros compañeros ni la app de celular, porque esas van por caminos separados.

---

## 1. ¿Qué es SignTrack, en una frase?

SignTrack es como una versión de **Microsoft Teams** (la app de videollamadas y chat que usan en oficinas y universidades), pero pensada especialmente para **personas sordas**. La diferencia clave: tiene una **inteligencia artificial (IA)** — es decir, un programa que "aprende" a reconocer patrones — que **ve el lenguaje de señas a través de la cámara y lo convierte en texto**, para que la otra persona en la videollamada pueda leer lo que se está "diciendo" con las manos.

En resumen, la app permite:
- Chatear por texto con otras personas.
- Hacer videollamadas.
- Que la cámara reconozca señas y las traduzca a texto en tiempo real.

---

## 2. Glosario rápido (términos que vas a ver varias veces)

Antes de seguir, aquí van algunas palabras técnicas que aparecen abajo, explicadas en simple:

- **Servidor**: una computadora que está "siempre encendida" atendiendo pedidos de otras personas (como un mesero que atiende mesas). En este proyecto, por ahora, el "servidor" es literalmente la computadora Mac de Josué.
- **Backend**: la parte del sistema que no se ve, que trabaja "detrás de cámaras" — guarda datos, revisa contraseñas, conecta llamadas, etc. Es como la cocina de un restaurante: el cliente no la ve, pero sin ella no hay comida.
- **Frontend**: la parte que sí se ve — la página web que abres en el navegador. Es como el mesero y el menú: lo que tú tocas directamente.
- **Puerto**: un número que usa una computadora para saber "a cuál programa específico" le está hablando, cuando varios programas corren en la misma máquina. Es como el número de una oficina dentro de un edificio: el edificio es la computadora, y el número de oficina es el puerto.
- **API / Servicio**: un programa pequeño encargado de una tarea específica (ej: uno solo se encarga de logins, otro solo de mensajes).
- **Base de datos**: el lugar donde se guarda la información permanente (usuarios, mensajes, contraseñas, etc.), como un archivero gigante y ordenado.
- **Túnel (Cloudflare Tunnel)**: un programa que crea un "camino secreto" desde la Mac de Josué hacia internet, para que cualquier persona en el mundo pueda entrar a la app sin que Josué tenga que configurar su router de internet.
- **Link temporal**: una dirección web (URL) que funciona solo por un tiempo y que cambia cuando se reinicia el túnel.

---

## 3. ¿Cómo está armado el proyecto? (la analogía de la oficina)

Imagina una oficina pequeña donde cada empleado tiene un trabajo específico y muy claro. Nadie hace el trabajo de todos — cada quien se especializa. Así está armado el backend de SignTrack:

| "Empleado" (servicio) | Su trabajo | Número de oficina (puerto) |
|---|---|---|
| **Identity** | El de seguridad en la puerta: revisa quién eres, tu contraseña, y te deja entrar (login y registro) | 5104 |
| **Gateway** | El recepcionista: todo el mundo le habla primero a él, y él decide a qué otro empleado pasarte | 5050 |
| **Calls** | El organizador de videollamadas: crea las salas y controla quién entra a cada una | 5200 |
| **Messaging** | El del chat: guarda y entrega los mensajes de texto | 5300 |
| **Recognition** | El traductor de señas: ve la cámara con inteligencia artificial y convierte las señas en texto | 3000 |
| **Postgres** | El archivero: la base de datos donde se guarda todo (usuarios, mensajes, salas) | — |
| **Redis** | Una libreta de notas rápida y temporal que usan los demás empleados para trabajar más rápido | — |
| **LiveKit** | El encargado de videollamadas **grupales** (3 o más personas). Ahora mismo no está disponible — ver la sección 5 | — |
| **Caddy** | El de recepción del edificio: recibe todas las visitas por internet y las manda a la oficina correcta según lo que pidan | — |

Y aparte de todo esto está el **Frontend**: la página web que tú abres en tu navegador (hecha con una herramienta llamada **React**), que es con lo que realmente interactúas como usuario.

**Dato importante:** ahorita, todo este "edificio de oficinas" está corriendo dentro de la computadora Mac de Josué. Todavía no está en "la nube" (es decir, en un servidor rentado de una empresa como Amazon o Google) — está en su casa, funcionando como si fuera un servidor casero.

---

## 4. ¿Cómo llega la app hasta tu celular o computadora, si todo corre en la casa de Josué?

Aquí viene la parte un poco más técnica pero importante de entender.

Normalmente, para que un servidor casero sea visible desde internet, hay que "abrir puertos" en el router de la casa (como abrir una puertita específica para que la gente de afuera pueda tocarla). El problema es que **el router de la casa de Josué es de la compañía de internet y viene bloqueado** — no permite abrir esas puertitas, y no hay forma fácil de cambiar eso.

La solución que se usó fue un programa llamado **Cloudflare Tunnel**. En vez de abrir una puerta en el router, este programa **crea un túnel** que sale desde la Mac de Josué directo hacia internet, sin tocar el router para nada. Al final, este túnel genera un **link público**, algo como:

```
https://palabras-random.trycloudflare.com
```

Cualquier persona, desde cualquier lugar del mundo, puede abrir ese link en su celular o computadora y usar la app.

### ⚠️ Punto MUY importante que todos deben saber

**Ese link es temporal y CAMBIA cada vez que se reinicia el túnel** (por ejemplo, si Josué apaga su Mac o el túnel se cae). No es un link fijo todavía, como sería por ejemplo "signtrack.com".

**Esto significa que, cada vez que quieras probar la app, tienes que pedirle a Josué el link actualizado de ese momento.** Si usas un link viejo, probablemente ya no funcione.

---

## 5. ¿Qué SÍ funciona ahorita mismo? (probado y confirmado)

- ✅ **Registro e inicio de sesión** de usuarios.
- ✅ **Chat de texto** entre usuarios.
- ✅ **Videollamadas de 1 a 1** (dos personas), con cámara y audio — incluso funciona entre redes de internet distintas (por ejemplo, una persona en la casa de Josué y otra en otra ciudad o país). Esto es posible gracias a un servicio gratuito llamado **TURN** (el que se usó se llama OpenRelay), que funciona como un "intermediario" que ayuda a que dos personas se puedan conectar aunque sus redes de internet sean restrictivas.
- ✅ **Reconocimiento de lenguaje de señas**: la cámara sí detecta señas y las traduce a texto, usando un modelo de IA que corre localmente (llamado MediaPipe). No es perfecto, pero funciona.
- ✅ **Contactos de prueba ya creados**: hay 4 cuentas de prueba ya conectadas entre sí como amigos, para que cualquiera pueda probar sin tener que registrarse ni mandar solicitudes de amistad primero (ver tabla en la sección 7).
- ✅ **Calendario, tareas y solicitudes**: probado con un script automático de pruebas del propio equipo, y pasó **11 de 11** revisiones.

---

## 6. ¿Qué NO funciona todavía o qué falta?

Esto es totalmente normal en un proyecto en desarrollo — no hay nada de qué alarmarse, pero es bueno que todos lo sepan:

1. **Las videollamadas grupales (3 o más personas) NO funcionan** en este montaje casero.
   - **¿Por qué?** El sistema que maneja las llamadas grupales (LiveKit) sí necesita que el router deje pasar cierto tipo de conexiones de audio/video en tiempo real — y como el router de Josué está bloqueado, no se puede arreglar sin (a) tener acceso real para configurar ese router, o (b) pagar/crear una cuenta en un servicio en la nube llamado "LiveKit Cloud" que se encargue de esa parte desde fuera de la casa de Josué.
   - Por esta razón, **se quitó directamente la opción de "crear reunión grupal" de la app** — así nadie se topa con un error al intentarlo. Simplemente no aparece esa opción por ahora.

2. **El link público no es permanente** — cambia cada vez que se reinicia el túnel (explicado en la sección 4).

3. **La app de celular (móvil) no se tocó en esta sesión de trabajo** — sigue pendiente por separado, en otra parte del proyecto.

4. **El reconocimiento de señas todavía no es muy preciso** — está usando el modelo de IA gratuito que corre localmente en la computadora, no la versión más avanzada (que usaría la inteligencia artificial de Google, llamada Gemini). Esa versión más precisa necesitaría configurar una llave de acceso (API key) de pago que todavía no se ha configurado. El equipo ya documentó que esto no bloquea el avance del proyecto — se puede mejorar más adelante.

5. **Las notificaciones push no están 100% activas** — faltan unas llaves de configuración técnicas (llamadas VAPID) que todavía no se generaron.

6. **Todo depende de que la Mac de Josué esté prendida y con el túnel corriendo.** Si Josué apaga su computadora, la app "desaparece" de internet hasta que la vuelva a encender y levantar todo de nuevo.

---

## 7. ¿Cómo puedo probar la app yo mismo? (paso a paso, sin tecnicismos)

Sigue estos pasos en orden:

1. **Pídele a Josué el link actual** del túnel (recuerda: cambia cada vez que reinicia su Mac, así que siempre pide el más reciente antes de probar).
2. **Abre ese link** en el navegador de tu celular o computadora (funciona como abrir cualquier página web normal).
3. **Inicia sesión** con una de las 4 cuentas de prueba de la tabla de abajo.
4. Ve a la sección **"Llamadas"** dentro de la app.
5. Escribe un título para tu reunión y dale clic a **"Crear reunión"**.
6. Dale clic al botón **"Copiar enlace"** de esa reunión, y comparte ese link con la otra persona (por WhatsApp, por ejemplo) para que también entre.
7. Cuando el navegador te pida permiso para usar **cámara y micrófono**, dale **"Permitir"** — si no permites esto, no vas a poder ver ni ser visto en la llamada.

### Cuentas de prueba disponibles

Ya existen 4 cuentas creadas y conectadas como amigos entre sí, así que puedes usar cualquiera de estas para probar sin tener que registrarte:

| Correo | Contraseña |
|---|---|
| maria.demo@signtrack.test | Test1234! |
| carlos.demo@signtrack.test | Test1234! |
| ana.demo@signtrack.test | Test1234! |
| luis.demo@signtrack.test | Test1234! |

**Tip:** para probar una videollamada de verdad (con dos personas hablando entre sí), lo ideal es que dos personas del equipo usen dos cuentas distintas de esta lista, cada quien desde su propio celular o computadora.

---

## 8. ¿Qué se arregló específicamente en esta sesión de trabajo?

Para que el equipo sepa qué se avanzó en esta parte del proyecto:

- Se completaron varias configuraciones que estaban a medio hacer (había contraseñas de ejemplo tipo "CHANGE_ME" que nunca se habían reemplazado por valores reales — ya se completaron).
- Se armó toda la estrategia para exponer el proyecto a internet sin necesitar tocar el router de la casa (el túnel de Cloudflare + el servicio gratuito TURN para las videollamadas).
- Se encontró y arregló un error real: si escribías el título de una reunión vacío y le dabas "Crear", no pasaba nada y no te avisaba de ningún error. Ahora sí te avisa que falta el título.
- Se encontró y arregló otro error: si tu computadora o celular no tenía cámara conectada, la app mostraba un mensaje de error confuso ("Invalid constraint") en vez de simplemente dejarte entrar sin video. Ahora la app detecta que no hay cámara y te deja entrar automáticamente solo con audio, avisándote con un mensaje claro de lo que está pasando.
- Se corrigió un archivo de configuración de la página web que apuntaba a una dirección de internet que no existía (había quedado mal configurado desde antes).
- Se crearon y conectaron entre sí las 4 cuentas de prueba mencionadas en la sección 7, para que cualquiera del equipo pueda probar la app de inmediato.

---

## 9. Resumen en 3 líneas

SignTrack ya permite registrarse, chatear, hacer videollamadas 1 a 1 (con reconocimiento de señas incluido) desde cualquier parte del mundo gracias a un túnel temporal hacia la Mac de Josué. Lo único que todavía no funciona son las videollamadas grupales de 3+ personas (se quitó esa opción de la app hasta resolverlo) y el link para probar cambia cada vez que se reinicia el túnel, así que siempre hay que pedir el más reciente. Todo lo demás — login, chat, calendario, tareas — ya fue probado y funciona.
