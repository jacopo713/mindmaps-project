import os
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
import json
from typing import Optional

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

# (Agent plan/apply models removed; backend simplified to chat + suggest/expand only)

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
        "Sei un assistente che suggerisce alternative di titolo per nodi di mappe concettuali, in italiano. "
        "Rispondi SOLO con un array JSON di 3 stringhe. Regole: "
        "1) Ogni titolo 2-6 parole, 2) niente numerazione o virgolette, 3) niente punteggiatura finale, "
        "4) coerenti con titolo originale e contesto, 5) vari tra loro, 6) chiari e specifici."
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
                    f"Titolo originale: {user_hint}\n" +
                    "Contesto (facoltativo) in JSON:\n" + context_snippet +
                    "\n\nGenera 3 alternative brevi e diverse. Rispondi SOLO con un array JSON di 3 stringhe."
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

# =============== MAP DIFF PROPOSAL (JSON Patch) ===============

class ProposeMapDiffRequest(BaseModel):
    """
    Request for proposing map changes as a JSON Patch (RFC 6902).

    - user_request: Natural language request from the user (in Italian is fine).
    - current_map: The current map state JSON object. Expected shape with at least:
        { nodes: [{ id, title, x?, y?, ... }], connections: [{ id?, sourceId, targetId, ... }] }
      Extra fields are preserved; patch should only touch nodes/connections unless explicitly requested.
    - selection: Optional hint about current selection (e.g., selected node id) for better grounding.
    - format: Currently only 'json-patch' is supported.
    """
    user_request: str
    current_map: Dict[str, Any]
    selection: Optional[Dict[str, Any]] = None
    format: str = "json-patch"


class ProposeMapDiffResponse(BaseModel):
    """
    Response with the proposed JSON Patch array and a short summary.
    """
    patch: List[Dict[str, Any]]
    summary: Optional[str] = None


def _build_map_diff_system_prompt() -> str:
    """Rules for generating a JSON Patch diff for the mind map state."""
    return (
        "Sei un assistente che propone MODIFICHE alla mappa in forma di JSON Patch (RFC 6902). "
        "Dato lo stato corrente della mappa (JSON) e la richiesta dell'utente, rispondi SOLO con un oggetto JSON "
        "contenente le chiavi: patch (array di operazioni) e summary (stringa breve). "
        "Regole importanti: "
        "1) Usa esclusivamente operazioni RFC 6902: add, remove, replace, move, copy, test. "
        "2) Opera rispetto alla radice del JSON fornito: ad es. '/nodes', '/connections'. "
        "3) NON modificare campi o sezioni non richiesti; mantieni i dati esistenti. "
        "4) Per rinominare un nodo: replace su '/nodes/<idx>/title'. "
        "5) Per creare un nuovo nodo: add su '/nodes/-' con oggetto minimo {id, title}. "
        "   Se posizione (x,y) non è specificata o sconosciuta, ometti x,y. "
        "   L'id deve essere unico e temporaneo con prefisso 'tmp-'. "
        "6) Per collegare nodi esistenti: add su '/connections/-' con {id?, sourceId, targetId}. "
        "   Usa un id temporaneo opzionale con prefisso 'tmp-conn-'. "
        "7) Non inventare id di nodi inesistenti: usa gli id presenti o crea nuovi con 'tmp-'. "
        "8) Se la richiesta è ambigua, preferisci modifiche minime e sicure. "
        "9) Output valido: un JSON con due chiavi: 'patch': [...], 'summary': '...'. Nessun testo extra."
    )


@app.post("/api/propose_map_diff", response_model=ProposeMapDiffResponse)
async def propose_map_diff(req: ProposeMapDiffRequest):
    """
    Propose a set of changes to the provided map as a JSON Patch (RFC 6902),
    based on the user's natural language request. Returns the patch and a short summary.

    This endpoint does NOT apply the patch; the caller can review/approve and apply client-side.
    """
    if not client:
        raise HTTPException(status_code=500, detail="API key not configured")

    if req.format != "json-patch":
        raise HTTPException(status_code=400, detail="Unsupported diff format; use 'json-patch'")

    # Build context payload to keep within token limits
    try:
        current_map_str = json.dumps(req.current_map)[:6000]
    except Exception:
        current_map_str = "{}"

    selection_str = ""
    if req.selection:
        try:
            selection_str = json.dumps(req.selection)[:1000]
        except Exception:
            selection_str = ""

    system_prompt = _build_map_diff_system_prompt()

    user_prompt = (
        "Richiesta utente (italiano):\n" + req.user_request.strip() + "\n\n" +
        "Stato corrente mappa (JSON):\n" + current_map_str + "\n\n" +
        ("Selezione corrente (facoltativa) in JSON:\n" + selection_str + "\n\n" if selection_str else "") +
        "Produci SOLO un JSON con le chiavi 'patch' e 'summary'."
    )

    try:
        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1200,
            stream=False,
        )

        content = (completion.choices[0].message.content or "").strip()

        # Try to parse as an object with keys patch + summary
        patch: List[Dict[str, Any]] = []
        summary: Optional[str] = None
        try:
            obj = json.loads(content)
            if isinstance(obj, dict):
                candidate_patch = obj.get("patch")
                if isinstance(candidate_patch, list):
                    # Basic validation of operations
                    normalized_patch: List[Dict[str, Any]] = []
                    for op in candidate_patch:
                        if isinstance(op, dict) and isinstance(op.get("op"), str) and isinstance(op.get("path"), str):
                            normalized_patch.append(op)
                    patch = normalized_patch
                if isinstance(obj.get("summary"), str):
                    summary = obj["summary"].strip()
        except Exception:
            # Try to extract a JSON object substring if the model wrapped it in text
            try:
                start = content.index("{")
                end = content.rindex("}") + 1
                obj = json.loads(content[start:end])
                candidate_patch = obj.get("patch", []) if isinstance(obj, dict) else []
                if isinstance(candidate_patch, list):
                    patch = [op for op in candidate_patch if isinstance(op, dict) and "op" in op and "path" in op]
                if isinstance(obj, dict) and isinstance(obj.get("summary"), str):
                    summary = obj["summary"].strip()
            except Exception:
                patch = []
                summary = None

        # Ensure we always return a list (possibly empty) for patch
        return ProposeMapDiffResponse(patch=patch, summary=summary)
    except Exception as e:
        print(f"Propose map diff error: {e}")
        raise HTTPException(status_code=500, detail="Failed to propose map diff")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
