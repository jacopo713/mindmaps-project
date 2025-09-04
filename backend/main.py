import os
from typing import List, Dict, Any, Literal, Optional
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

# ==== Agent Plan/Apply models ====

OperationType = Literal[
    "rename_node",
    "create_node",
    "delete_node",
    "move_node",
    "connect_nodes",
    "disconnect_nodes",
    "recolor_node",
]

class Operation(BaseModel):
    op: OperationType
    # Common fields optional; validated per op at apply time
    nodeId: Optional[str] = None
    title: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    dx: Optional[float] = None
    dy: Optional[float] = None
    sourceId: Optional[str] = None
    targetId: Optional[str] = None
    relation: Optional[str] = None
    color: Optional[str] = None
    borderColor: Optional[str] = None

class MindMapNodeModel(BaseModel):
    id: str
    title: str
    x: float
    y: float
    color: Optional[str] = None
    borderColor: Optional[str] = None

class ConnectionModel(BaseModel):
    id: str
    sourceId: str
    targetId: str
    type: Literal['straight', 'curved'] = 'curved'
    curvature: Optional[float] = None
    adaptiveCurvature: Optional[bool] = None
    curvatureDirection: Optional[str] = None
    color: Optional[str] = None
    width: Optional[float] = None
    showArrow: Optional[bool] = None
    arrowPosition: Optional[str] = None
    relation: Optional[str] = None

class MindMapModel(BaseModel):
    id: str
    title: str
    nodes: List[MindMapNodeModel]
    connections: List[ConnectionModel]
    createdAt: int
    updatedAt: int

class AgentPlanRequest(BaseModel):
    instruction: str
    map: MindMapModel
    selectedNodeId: Optional[str] = None

class AgentPlanResponse(BaseModel):
    summary: str
    baseVersion: int
    operations: List[Operation]

class ApplyRequest(BaseModel):
    map: MindMapModel
    baseVersion: int
    operations: List[Operation]

class ApplyResponse(BaseModel):
    map: MindMapModel

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

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

# ================= Agent Plan/Apply endpoints =================

@app.post("/api/agent/plan", response_model=AgentPlanResponse)
async def agent_plan(req: AgentPlanRequest):
    base_version = req.map.updatedAt

    # If no LLM client, return a deterministic minimal plan suggestion
    if not client:
        ops: List[Operation] = []
        if req.selectedNodeId:
            # Suggest a simple rename based on instruction keywords
            suggestion = (req.instruction.strip() or "Idea Migliore").split("\n")[0][:40]
            ops.append(Operation(op="rename_node", nodeId=req.selectedNodeId, title=suggestion))
        else:
            ops.append(Operation(op="create_node", title=(req.instruction.strip() or "Nuovo Nodo")[:40], x=0, y=0))
        return AgentPlanResponse(summary="Piano deterministico (fallback)", baseVersion=base_version, operations=ops)

    system_prompt = (
        "Sei un assistente che propone modifiche a una mappa concettuale. "
        "RISPONDI SOLO con JSON valido nel seguente schema: {summary: string, baseVersion: number, operations: Operation[]}. "
        "Operation.op ∈ {rename_node, create_node, delete_node, move_node, connect_nodes, disconnect_nodes, recolor_node}. "
        "Regole: massimo 10 operazioni; non cancellare più di 3 nodi; titoli brevi (≤ 40 caratteri)."
    )

    user_payload = {
        "instruction": req.instruction,
        "map": req.map.dict(),
        "selectedNodeId": req.selectedNodeId,
    }

    try:
        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
            temperature=0.2,
            max_tokens=800,
            stream=False,
        )
        content = completion.choices[0].message.content.strip()
        data = json.loads(content)
        # Basic validation/coercion
        ops = [Operation(**op) for op in data.get("operations", [])][:10]
        summary = str(data.get("summary", "Piano proposto"))[:200]
        return AgentPlanResponse(summary=summary, baseVersion=req.map.updatedAt, operations=ops)
    except Exception as e:
        print(f"Agent plan error: {e}")
        # Fallback minimal plan
        fallback = AgentPlanResponse(summary="Fallback: nessun piano generato", baseVersion=req.map.updatedAt, operations=[])
        return fallback


@app.post("/api/mindmaps/apply", response_model=ApplyResponse)
async def apply_operations(req: ApplyRequest):
    # Version check
    if req.baseVersion != req.map.updatedAt:
        raise HTTPException(status_code=409, detail="Versione mappa non aggiornata. Rigenera il piano.")

    # Work on a copy
    mm = req.map.dict()
    nodes: List[Dict[str, Any]] = [n for n in mm["nodes"]]
    conns: List[Dict[str, Any]] = [c for c in mm["connections"]]

    def node_index(nid: str) -> int:
        return next((i for i, n in enumerate(nodes) if n["id"] == nid), -1)

    def conn_index(cid: str) -> int:
        return next((i for i, c in enumerate(conns) if c.get("id") == cid), -1)

    # Apply operations sequentially with basic validation
    for op in req.operations[:20]:
        try:
            if op.op == "rename_node" and op.nodeId and op.title is not None:
                i = node_index(op.nodeId)
                if i >= 0:
                    nodes[i]["title"] = op.title[:100]

            elif op.op == "create_node" and op.title:
                nid = str(int(mm["updatedAt"])) + "-" + str(len(nodes) + 1)
                x = op.x if op.x is not None else 0
                y = op.y if op.y is not None else 0
                nodes.append({"id": nid, "title": op.title[:100], "x": float(x), "y": float(y)})

            elif op.op == "delete_node" and op.nodeId:
                i = node_index(op.nodeId)
                if i >= 0:
                    nid = nodes[i]["id"]
                    nodes.pop(i)
                    conns[:] = [c for c in conns if c.get("sourceId") != nid and c.get("targetId") != nid]

            elif op.op == "move_node" and op.nodeId:
                i = node_index(op.nodeId)
                if i >= 0:
                    if op.x is not None:
                        nodes[i]["x"] = float(op.x)
                    if op.y is not None:
                        nodes[i]["y"] = float(op.y)
                    if op.dx is not None:
                        nodes[i]["x"] = float(nodes[i]["x"]) + float(op.dx)
                    if op.dy is not None:
                        nodes[i]["y"] = float(nodes[i]["y"]) + float(op.dy)

            elif op.op == "connect_nodes" and op.sourceId and op.targetId:
                # Avoid duplicates
                exists = any(c for c in conns if c.get("sourceId") == op.sourceId and c.get("targetId") == op.targetId)
                if not exists and node_index(op.sourceId) >= 0 and node_index(op.targetId) >= 0:
                    cid = f"conn-{op.sourceId}-{op.targetId}-{len(conns)+1}"
                    conns.append({
                        "id": cid,
                        "sourceId": op.sourceId,
                        "targetId": op.targetId,
                        "type": "curved",
                        "showArrow": True,
                        "relation": op.relation or "generico",
                        "width": 2,
                    })

            elif op.op == "disconnect_nodes" and op.sourceId and op.targetId:
                conns[:] = [c for c in conns if not (c.get("sourceId") == op.sourceId and c.get("targetId") == op.targetId)]

            elif op.op == "recolor_node" and op.nodeId:
                i = node_index(op.nodeId)
                if i >= 0:
                    if op.color is not None:
                        nodes[i]["color"] = op.color
                    if op.borderColor is not None:
                        nodes[i]["borderColor"] = op.borderColor
        except Exception as e:
            print(f"Apply op error ({op.op}): {e}")
            continue

    # Return updated map (client will persist on Firestore)
    mm["nodes"] = nodes
    mm["connections"] = conns
    from time import time
    mm["updatedAt"] = int(time() * 1000)

    return ApplyResponse(map=MindMapModel(**mm))
