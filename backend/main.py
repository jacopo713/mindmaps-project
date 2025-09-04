import os
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
import json

app = FastAPI(title="Mindmaps API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure OpenAI client for DeepSeek
api_key = os.getenv("DEEPSEEK_API_KEY")
if not api_key:
    print("Warning: DEEPSEEK_API_KEY not set. Chat functionality will be limited.")
    client = None
else:
    client = openai.OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

class SuggestTitlesRequest(BaseModel):
    context: Dict[str, Any] | None = None
    # Optional: node details to guide suggestions
    hint: str | None = None

class SuggestTitlesResponse(BaseModel):
    suggestions: List[str]

class ExpandNodeRequest(BaseModel):
    node_id: str
    node_title: str
    context: Dict[str, Any] | None = None

class ExpandNodeResponse(BaseModel):
    children: List[Dict[str, str]]  # [{"title": "..."}, ...]

@app.get("/")
async def root():
    return {"message": "Mindmaps API is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant that responds in Italian."},
            *[{"role": msg.role, "content": msg.content} for msg in request.messages]
        ]

        stream = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=2048
        )

        def generate():
            try:
                for chunk in stream:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        data = f"data: {json.dumps({'content': content})}\n\n"
                        yield data
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                print(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get response")


@app.post("/api/suggest_node_titles", response_model=SuggestTitlesResponse)
async def suggest_node_titles(req: SuggestTitlesRequest):
    if not client:
        raise HTTPException(status_code=500, detail="API key not configured")

    system_prompt = (
        "Sei un assistente che suggerisce titoli per nodi di mappe concettuali. "
        "Rispondi SOLO con una lista JSON di 3 stringhe. Regole: "
        "1) Ogni titolo deve essere breve (3-6 parole), 2) evitare gergo, 3) essere specifico, "
        "4) niente punteggiatura superflua, 5) formati neutri e azionabili."
    )

    user_hint = req.hint or ""
    context_snippet = ""
    if req.context:
        try:
            context_snippet = json.dumps(req.context)[:4000]
        except Exception:
            context_snippet = ""

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    "Contesto (facoltativo) in JSON:\n" + context_snippet +
                    "\n\nSuggerisci 3 possibili titoli coerenti. Rispondi SOLO con un array JSON di 3 stringhe."
                )
            },
        ]

        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=0.7,
            max_tokens=256,
            stream=False,
        )

        content = completion.choices[0].message.content.strip()
        # Try to parse a JSON array
        try:
            suggestions = json.loads(content)
            if isinstance(suggestions, list):
                suggestions = [str(s).strip() for s in suggestions][:3]
            else:
                raise ValueError("Not a list")
        except Exception:
            # Fallback: split by newline and take up to 3
            lines = [l.strip(" -•\t") for l in content.splitlines() if l.strip()]
            suggestions = lines[:3] if lines else ["Idea 1", "Idea 2", "Idea 3"]

        # Final sanitization
        cleaned = []
        for s in suggestions:
            s = s.replace("\n", " ").strip()
            if s.endswith("."):
                s = s[:-1]
            cleaned.append(s)

        # Ensure 3 items
        while len(cleaned) < 3:
            cleaned.append(f"Idea {len(cleaned)+1}")

        return SuggestTitlesResponse(suggestions=cleaned[:3])
    except Exception as e:
        print(f"Suggest error: {e}")
        raise HTTPException(status_code=500, detail="Failed to suggest titles")


@app.post("/api/expand_node", response_model=ExpandNodeResponse)
async def expand_node(req: ExpandNodeRequest):
    # If API key is missing, return a deterministic fallback instead of 500
    if not client:
        base = (req.node_title or "Idea").strip()
        base = base.rstrip('.')
        children = [
            {"title": f"{base}: Definizione"},
            {"title": f"{base}: Esempi"},
            {"title": f"{base}: Azioni"},
        ]
        return ExpandNodeResponse(children=children)

    system_prompt = (
        "Sei un assistente per mappe concettuali. Fornisci 3-5 sotto-nodi pertinenti "
        "per il nodo dato. Rispondi SOLO con un array JSON di oggetti {title}. "
        "Regole: titoli brevi (2-6 parole), specifici, diversi tra loro, senza punteggiatura finale."
    )

    context_snippet = ""
    if req.context:
        try:
            context_snippet = json.dumps(req.context)[:4000]
        except Exception:
            context_snippet = ""

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Nodo: {req.node_title}\nContesto (JSON):\n" + context_snippet +
                    "\n\nSuggerisci 3-5 figli pertinenti in formato JSON: [{\"title\": \"...\"}]."
                )
            },
        ]

        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=0.7,
            max_tokens=256,
            stream=False,
        )

        content = completion.choices[0].message.content.strip()
        try:
            arr = json.loads(content)
            if isinstance(arr, list):
                children = []
                for item in arr[:5]:
                    if isinstance(item, dict) and "title" in item:
                        t = str(item["title"]).strip()
                        if t.endswith('.'):
                            t = t[:-1]
                        children.append({"title": t})
                    elif isinstance(item, str):
                        t = item.strip()
                        if t.endswith('.'):
                            t = t[:-1]
                        children.append({"title": t})
                if children:
                    return ExpandNodeResponse(children=children)
        except Exception:
            pass

        # Fallback
        lines = [l.strip(" -•\t") for l in content.splitlines() if l.strip()]
        children = [{"title": l.rstrip('.')} for l in lines[:5]]
        if not children:
            children = [{"title": "Sotto-nodo 1"}, {"title": "Sotto-nodo 2"}, {"title": "Sotto-nodo 3"}]
        return ExpandNodeResponse(children=children)
    except Exception as e:
        print(f"Expand error: {e}")
        raise HTTPException(status_code=500, detail="Failed to expand node")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)