# MindPath – AI Depression Support Platform 🧠💙

MindPath is a **holistic mental wellness platform** designed to provide accessible, AI-powered support for individuals navigating mental health challenges. It combines **journaling, mood tracking, habit formation, and an empathetic AI companion** to create a safe space for emotional regulation and personal growth.

> **⚠️ Disclaimer:** MindPath is a supportive tool and **NOT** a replacement for professional medical advice, diagnosis, or treatment. In case of emergency, please contact local authorities or a suicide prevention hotline.

---

## 🌟 Key Features

### 🤖 **Sela - Virtual AI Assistant**
- **Real-time Voice Chat:** Speak naturally to **Sela**, your virtual companion. She replies with a human-like voice using **OpenAI Text-to-Speech**.
- **Emotion Recognition:** Sela can *see* you! Using **MediaPipe Face Landmarker**, she detects your facial expressions (happy, sad, etc.) and adjusts her empathy level accordingly.
- **Expressive Avatar:** Sela visualizes her responses with a realistic, animated avatar that lip-syncs to her voice.
- **Context-Aware Memory:** She remembers past conversations and journal entries (RAG) to provide deeply personalized support.

### 🛡️ **Safety Guardrails**
- **Crisis Detection:** Real-time analysis of user input using **Regex patterns** to detect self-harm or suicidal ideation.
- **Immediate Intervention:** Automatically blocks AI generation and provides immediate crisis resources and helplines if danger is detected.

### 📝 **Smart Journaling**
- **AI Analysis:** Automatically tags emotions and summarizes entries.
- **Actionable Insights:** The AI suggests small, concrete steps based on your journal content to help you move forward.
- **Transformation:** Rewrites negative thoughts into self-compassionate language using LLMs.

### 📊 **Mood & Habit Tracking**
- **Visual Analytics:** Interactive charts to track mood trends over time.
- **Habit Builder:** Set and track daily wellness habits (e.g., "Drink water," "Meditate").
- **Gamification:** Earn streaks and visualize progress to stay motivated.

### 🔔 **Smart Reminders**
- **AI-Generated Emails:** Receive friendly, motivating email reminders for tasks, generated uniquely each time by the AI to avoid notification fatigue.

---

## � Application Modules

### **1. Dashboard (Home)**
- **Overview:** Your daily wellness command center.
- **Features:** Quick access to mood logging, recent journal entries, daily quotes, and safety streaks.

### **2. Virtual Assistant (Sela)**
- **Interactive Avatar:** A lifelike avatar that speaks and listens with realistic "talking" animations.
- **Voice Interaction:** Hands-free conversation for emotional support.
- **Emotional Resonance:** The interface adapts its glowing aura based on the conversation's emotional tone.

### **3. Insights (Analytics)**
- **Deep Dive:** Visualize your mental health data over 7, 14, or 30 days.
- **Charts:**
    - *Mood Flow:* Line graph showing emotional ups and downs.
    - *Sentiment Distribution:* Pie chart of positive vs. negative entries.
    - *Habit Correlations:* Bar charts linking sleep/exercise to mood scores.
- **Reports:**
    - **Export as PDF:** Generate a comprehensive mental health report with a single click.
    - **Email Integration:** Send the PDF report directly to your registered email address for your records or to share with a therapist.

### **4. Journal & Transformation**
- **Smart Entry:** Free-text journaling with AI auto-tagging.
- **Reframing:** One-click "Rewrite" to turn negative thoughts into positive affirmations.
- **Action Plans:** Precise, AI-generated steps to tackle specific problems mentioned in your journal.

### **5. Profile & Settings**
- **Personalization:** Customize Sela's voice, your theme preferences, and notification settings.
- **Data Management:** Manage your account details and subscription status.

---

## 🛠️ Technology Stack & Keywords

### **Frontend (Client-Side)**
- **Core Framework:** [React 19](https://react.dev/) (Latest)
- **Build Tool:** [Vite](https://vitejs.dev/) (High-performance bundler)
- **Language:** TypeScript (Strict type safety)
- **Styling:** [TailwindCSS v3](https://tailwindcss.com/) with PostCSS & Autoprefixer
- **State & Routing:** React Hooks, React Router DOM v6
- **Visualization:** [Recharts](https://recharts.org/) (Responsive charting library)
- **AI/Vision:** [@mediapipe/tasks-vision](https://developers.google.com/mediapipe/solutions/vision) (Google's Face Landmarker for emotion detection)
- **Authentication:** [@asgardeo/auth-react](https://github.com/asgardeo/asgardeo-auth-react-sdk) (OIDC/OAuth2 SDK)
- **Utilities:** `zod` (Schema validation), `clsx` (Class name merging), `lucide-react` (Icons)

### **Backend (Server-Side)**
- **API Framework:** [FastAPI](https://fastapi.tiangolo.com/) (High-performance Python web framework)
- **Server:** [Uvicorn](https://www.uvicorn.org/) (ASGI server)
- **Database:** PostgreSQL with `pgvector` extension
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async/Await support)
- **Migration:** Alembic (Database schema migrations)
- **Validation:** Pydantic v2 (Data modeling)
- **AI Integration:** `openai` (Official Python SDK), `requests`, `httpx` (Async HTTP client)
- **Security:** `python-jose` (JWT encoding/decoding), `python-multipart` (Form data parsing)
- **Async:** `asyncio`, `greenlet`

### **Key Technical Concepts**
- **RAG (Retrieval-Augmented Generation):** Enhancing LLM responses with retrieved memory chunks.
- **Vector Embeddings:** Semantic search using high-dimensional vectors.
- **WebSocket / Real-time:** Low-latency communication for voice chat.
- **OIDC (OpenID Connect):** Secure identity layer on top of OAuth 2.0.
- **Prompt Engineering:** Structuring inputs to guide Large Language Models.
- **Crisis Intervention:** Regex-based deterministic safety layers.
- **Multimodal AI:** Combining text, audio, and visual inputs for a holistic interaction.

---

## 🧠 Algorithms & Logic

### **1. Retrieval-Augmented Generation (RAG)**
MindPath uses RAG to give the AI long-term memory:
1.  **Embedding:** User messages and journal entries are converted into vector embeddings using OpenAI.
2.  **Storage:** These vectors are stored in PostgreSQL using the `pgvector` extension.
3.  **Retrieval:** When a user chats, the system performs a **Cosine Similarity Search** to find the most relevant past memories or medical knowledge chunks.
4.  **Generation:** These retrieved chunks are injected into the LLM's system prompt to generate a context-aware response.

### **2. Crisis Detection Algorithm**
A deterministic safety layer runs *before* any AI processing:
-   **Input Scanning:** Every user message is scanned against a predefined list of high-risk Regex patterns (e.g., related to self-harm, suicide).
-   **Trigger:** If a match is found, the standard AI pipeline is **bypassed**.
-   **Response:** A hard-coded, safe response with emergency contact numbers is returned immediately.

### **3. Sentiment & Insight Extraction**
-   **Transformation Pipeline:** Journal entries are processed through specialized prompts to:
    -   *Summarize* content.
    -   *Rewrite* negative self-talk.
    -   *Plan* actionable steps.

---

## 🎯 Target Audience

-   **Individuals** seeking a private, judgment-free space to express their thoughts.
-   **Therapy Clients** who want to track their moods and habits between sessions.
-   **Mental Health Advocates** looking for tools to support daily wellness.
-   **Anyone** interested in using AI for personal growth and emotional intelligence.

---

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Python (v3.10+)
-   PostgreSQL (with `pgvector` extension installed)

### Backend Setup
1.  Navigate to the backend folder:
    ```bash
    cd backend
    ```
2.  Create a virtual environment and activate it:
    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # Mac/Linux
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Set up environment variables in `.env`:
    ```env
    DATABASE_URL=postgresql+asyncpg://user:pass@localhost/mindpath
    OPENAI_API_KEY=sk-...
    ASGARDEO_CLIENT_ID=...
    ASGARDEO_CLIENT_SECRET=...
    ```
5.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```

### Frontend Setup
1.  Navigate to the frontend folder:
    ```bash
    cd mindpath-ui
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

---

## 📄 License
This project is licensed under the MIT License.
