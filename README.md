# Chatbot Gobierno MVP

Asistente conversacional para facilitar el acceso a información sobre trámites públicos.

## 🚀 Cómo desplegar en [Render](https://render.com)

1. Crear cuenta en https://render.com
2. Hacer un nuevo servicio: **New Web Service**
3. Conectá tu repo de GitHub (este proyecto)
4. Configurar:

| Campo            | Valor                      |
|------------------|----------------------------|
| Build Command    | `npm install`              |
| Start Command    | `npm start`                |
| Root Directory   | `.`                        |

5. Agregá en Environment:
- `OPENAI_API_KEY=tu clave privada de OpenAI`

6. Render hará el deploy y te dará una URL pública.

## 🧪 Probar localmente

```bash
npm install
npm start
```

Abrí en navegador: http://localhost:3001
