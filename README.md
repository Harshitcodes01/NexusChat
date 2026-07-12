# NexusChat 🚀

NexusChat is a real-time messaging, group collaboration, and voice/video calling platform. It features a premium, state-of-the-art dark glassmorphic design inspired by the layout flexibility of Discord and the message timeline simplicity of WhatsApp.

---

## Key Features

1. **Authentication Gateways**:
   - Register via **Email** (with email verification link).
   - Register via **Phone Number** (with a 6-digit OTP code verification flow and a 60-second resend countdown timer).
   - Simulates SMS and Email notification logs in development, and supports live **Twilio REST API** dispatching in production.

2. **Real-time Chat Engine (Socket.io)**:
   - Dynamic Direct Messages (DMs) and multi-user Group Chats.
   - Live double checkmarks (gray check = sent/delivered, teal double check = read by recipient).
   - Real-time typing indicators with debounced broadcasts.
   - Live user presence status tracking (online / offline / last seen timestamps).
   - Message editing and soft deletions.

3. **WebRTC Voice & Video Calls**:
   - Establish high-fidelity peer-to-peer audio or video calling connections.
   - Interactive full-screen calling deck with toggle controls (mute audio, disable camera, or hang up).
   - **Floatable PIP Mode**: Minimize call layouts to a small floating corner box, enabling users to text, browse channels, and search users during an active call.

4. **Media & File Attachments**:
   - Supports attachments for images, video clips, audio voice notes, and documents.
   - Connects to **Cloudinary** for cloud-hosted asset storage with an automatic local fallback to server directories.

5. **Aesthetics & Discoverability**:
   - Canvas-based connecting particle network animating interactively behind the login form.
   - Welcome dashboard displaying live metrics (chats count and available peers count).
   - Global Directory ("Discover People") showing available users you haven't direct messaged yet to initiate instant conversations.

---

## Technology Stack

### Frontend (client/)
*   **Vite + React + TypeScript** (Fast, modern build framework)
*   **Tailwind CSS** (Utility-first styling system)
*   **Framer Motion** (Premium animations and transitions)
*   **Lucide React** (Clean icon pack)
*   **React Hook Form** (Robust form validations)

### Backend (server/)
*   **Node.js + Express + TypeScript**
*   **MongoDB + Mongoose** (Database object modeling)
*   **Socket.io** (Bidirectional real-time event handlers)
*   **WebRTC Signaling** (Custom socket relays)
*   **Cloudinary SDK / Multer** (File uploads)

---

## File Directory

*   [README.md](file:///c:/Users/Harshit/Nexus%20of%20Nerds/NexusChat/README.md) - Master project summary.
*   [DOCUMENTATION.md](file:///c:/Users/Harshit/Nexus%20of%20Nerds/NexusChat/DOCUMENTATION.md) - Full API specs and database architecture.
*   [BUILD_WORKFLOW.md](file:///c:/Users/Harshit/Nexus%20of%20Nerds/NexusChat/BUILD_WORKFLOW.md) - Build guidelines and environment settings.
*   [HOW_IT_WORKS.md](file:///c:/Users/Harshit/Nexus%20of%20Nerds/NexusChat/HOW_IT_WORKS.md) - High-level mechanics (WebRTC, Sockets, and OTP).
