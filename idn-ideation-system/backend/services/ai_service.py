"""
Live AI service — uses the Anthropic Claude API.
Activated when ANTHROPIC_API_KEY is set in the environment.
"""
import json
import logging
import re
import uuid
from typing import AsyncIterator, Callable, Awaitable

import anthropic

logger = logging.getLogger(__name__)

from models.ai import (
    BranchResponse,
    BranchSuggestion,
    CoherenceIssue,
    CoherenceResponse,
    GeneratedEdge,
    GeneratedNode,
    GenerateNarrativeResponse,
    NarrativeOverviewResponse,
    PerspectiveResponse,
    PerspectiveSuggestion,
    ThemeAnalysis,
    ThemeResponse,
)

MODEL = "claude-sonnet-4-6"

_IDENTITY = """You are an IDN (Interactive Digital Narrative) authoring assistant embedded in a research prototype tool. Your users are professionals — journalists, educators, social researchers — who are new to IDN authoring. You are helping them during the *ideation phase only*.

Your role:
- Help authors think, explore, and reflect — not write final copy
- Be concise, encouraging, and transparent
- Always explain *why* you make a suggestion
- Never invent facts about the user's story — only extrapolate from what they have shared
- When the story touches on sensitive societal topics, be careful to surface multiple perspectives
- If asked about the tool itself, explain how to use it clearly and simply
- When you search the web to support an answer, briefly cite where you found the information"""

WEB_SEARCH_TOOL = {
    "name": "web_search",
    "description": (
        "Search the web for current information to support the ideation process. "
        "Use this to find statistics, news, case studies, policy context, societal trends, "
        "expert opinions, or real-world examples relevant to the story topic. "
        "Use specific, focused queries to get the most useful results."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query. Be specific and focused (e.g. 'housing eviction statistics Sweden 2024').",
            }
        },
        "required": ["query"],
    },
}


def _format_search_results(results: list[dict]) -> str:
    if not results:
        return "No results found."
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. {r['title']}\n   {r['snippet']}\n   Source: {r['url']}")
    return "\n\n".join(lines)


def _project_context(graph_context: dict, selected_node=None) -> str:
    lines = [
        f"- Narrative format: {graph_context.get('format', 'branching')}",
        f"- Story theme: {graph_context.get('theme', '(not set)')}",
        f"- Node count: {graph_context.get('node_count', 0)}",
    ]
    titles = graph_context.get("node_titles", [])
    if titles:
        lines.append(f"- Existing node titles: {', '.join(titles[:20])}")
    if selected_node:
        lines.append(f"- Selected node: \"{selected_node.title}\" — {selected_node.body or '(no description)'}")
    return "Current project context:\n" + "\n".join(lines)


SearchFn = Callable[[str], Awaitable[list[dict]]]


class AIService:
    mode = "live"

    def __init__(self, api_key: str, search_fn: SearchFn | None = None):
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._search_fn = search_fn

    async def chat_stream(self, messages: list, graph_context: dict) -> AsyncIterator[dict]:
        system = f"{_IDENTITY}\n\n{_project_context(graph_context)}"
        current_messages = [{"role": m.role, "content": m.content} for m in messages]

        # First pass: stream with web_search tool available (if search is configured)
        first_pass = True
        while True:
            stream_kwargs: dict = {}
            if first_pass and self._search_fn:
                stream_kwargs["tools"] = [WEB_SEARCH_TOOL]

            async with self._client.messages.stream(
                model=MODEL,
                max_tokens=1024,
                system=system,
                messages=current_messages,
                **stream_kwargs,
            ) as stream:
                async for text in stream.text_stream:
                    yield {"text": text}

                final = await stream.get_final_message()

            if first_pass and final.stop_reason == "tool_use" and self._search_fn:
                # Build the assistant turn with all content blocks
                assistant_content = []
                for block in final.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                    elif block.type == "tool_use":
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })

                current_messages.append({"role": "assistant", "content": assistant_content})

                # Execute each tool call
                tool_results = []
                for block in final.content:
                    if block.type != "tool_use":
                        continue
                    query = block.input.get("query", "")
                    yield {"type": "search_start", "query": query}
                    try:
                        sources = await self._search_fn(query)
                    except Exception:
                        sources = []
                    yield {"type": "search_done", "sources": sources}
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": _format_search_results(sources),
                    })

                current_messages.append({"role": "user", "content": tool_results})
                first_pass = False  # Next iteration streams the final answer, no tools
            else:
                break  # end_turn — we're done

    async def suggest_branches(self, selected_node, graph_context) -> BranchResponse:
        system = f"{_IDENTITY}\n\n{_project_context(graph_context.__dict__ if hasattr(graph_context, '__dict__') else graph_context, selected_node)}"
        task = (
            "Suggest exactly 3 story branches that could follow from the selected node. "
            "Respond with a JSON object matching this schema exactly:\n"
            '{"suggestions": [{"title": "<8 words max>", "body": "<2 sentences>", "reasoning": "<1 sentence explaining why>", "suggested_edge_label": "<short label for the connecting edge>"}]}\n'
            "Output only the JSON object, no other text."
        )
        response = await self._client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": task}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        suggestions = [
            BranchSuggestion(id=str(uuid.uuid4()), **s)
            for s in data["suggestions"]
        ]
        return BranchResponse(suggestions=suggestions, mode="live")

    async def analyze_theme(self, premise: str, graph_context: dict) -> ThemeResponse:
        system = f"{_IDENTITY}\n\n{_project_context(graph_context)}"
        task = (
            f"The author has shared this story premise: \"{premise}\"\n\n"
            "Analyze the premise and respond with a JSON object matching this schema exactly:\n"
            '{"dominant_angle": "<string>", "framing_biases": ["<string>", ...], '
            '"underrepresented_perspectives": ["<string>", ...], "reasoning": "<1-2 sentences>"}\n'
            "framing_biases and underrepresented_perspectives should each have 2-3 items. Output only JSON."
        )
        response = await self._client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": task}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return ThemeResponse(analysis=ThemeAnalysis(**data), mode="live")

    async def check_coherence(self, node_details: list, graph_context: dict) -> CoherenceResponse:
        system = f"{_IDENTITY}\n\n{_project_context(graph_context)}"
        nodes_text = "\n".join(
            f"- [{n.node_type}] \"{n.title}\": {n.body or '(no description)'}"
            for n in node_details
        ) or "(no nodes yet)"
        task = (
            f"Review this IDN story graph for structural issues:\n{nodes_text}\n\n"
            "Identify: orphan nodes (no connections), dead-end paths (no ending), thematic drift, "
            "or other structural problems. Respond with JSON:\n"
            '{"issues": [{"node_id": null, "issue_type": "<orphan|dead_end|thematic_drift|structural>", '
            '"description": "<string>", "suggestion": "<string>"}], "overall_assessment": "<1-2 sentences>"}\n'
            "If there are no issues, return an empty issues array. Output only JSON."
        )
        response = await self._client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": task}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        issues = [CoherenceIssue(**i) for i in data.get("issues", [])]
        return CoherenceResponse(
            issues=issues,
            overall_assessment=data.get("overall_assessment", ""),
            mode="live",
        )

    async def generate_narrative(self, premise: str) -> GenerateNarrativeResponse:
        """
        Generate a complete multi-perspective IDN graph from a free-text premise.
        Optionally gathers web context first if search is configured.
        """
        # ── Phase 1: gather web research context (up to 3 searches) ──────────
        research_block = ""
        if self._search_fn:
            # Ask Claude which queries would best inform this narrative
            query_resp = await self._client.messages.create(
                model=MODEL,
                max_tokens=150,
                system=_IDENTITY,
                messages=[{
                    "role": "user",
                    "content": (
                        f"I am about to generate an IDN narrative on this topic:\n\"{premise}\"\n\n"
                        "Give me exactly 2 focused web search queries that would gather the most "
                        "useful facts, statistics, and perspectives for this narrative. "
                        "Reply with only the two queries, one per line, no numbering."
                    ),
                }],
            )
            query_text = "".join(b.text for b in query_resp.content if b.type == "text")
            queries = [q.strip() for q in query_text.strip().splitlines() if q.strip()][:2]

            snippets = []
            for q in queries:
                try:
                    results = await self._search_fn(q)
                    if results:
                        snippets.append(f"Search: {q}\n{_format_search_results(results[:3])}")
                except Exception:
                    pass

            if snippets:
                research_block = "\n\nWeb research context (use these facts in the narrative):\n" + "\n\n".join(snippets)

        # ── Phase 2: generate the full graph as structured JSON ───────────────
        schema = (
            '{\n'
            '  "nodes": [\n'
            '    {"id":"n1","title":"...","body":"...","node_type":"scene|choice|ending|question","tags":[],"x":400,"y":100}\n'
            '  ],\n'
            '  "edges": [\n'
            '    {"id":"e1","source":"n1","target":"n2","label":"..."}\n'
            '  ]\n'
            '}'
        )
        layout_guide = (
            "Layout guide (x,y positions on a ~1400×1400 canvas):\n"
            "- Opening scene: x=700, y=80\n"
            "- Main choice node (perspective selector): x=700, y=260\n"
            "- Perspective branches: spread across x (e.g. 3 branches: x=200,700,1200 or 4 branches: x=150,550,950,1350), y=460\n"
            "- Each branch continues vertically: y=660, y=860 for deeper nodes\n"
            "- Per-perspective ending: y=1060\n"
            "- Final convergence node (optional, where all paths lead): x=700, y=1260"
        )
        task = (
            f"Generate a complete, richly detailed multi-perspective IDN graph for this premise:\n\"{premise}\"\n"
            f"{research_block}\n\n"
            "Requirements:\n"
            "1. Opening scene (node_type=scene): establish the problem with specific real-world context and data.\n"
            "2. Main choice node (node_type=choice): invite the reader to choose a perspective.\n"
            "3. 3–4 distinct perspective paths (e.g. expert, activist, opponent, affected person), each with:\n"
            "   - Entry scene: introduce the perspective holder and their situation/viewpoint.\n"
            "   - 1–2 middle scenes: deepen the argument with concrete evidence or lived experience.\n"
            "   - A perspective ending (node_type=ending): conclude this viewpoint with an open reflection.\n"
            "4. A final convergence node (node_type=question): pose a decision/reflection question to the reader.\n"
            "5. All paths must eventually connect to the convergence node.\n"
            "6. Body text should be 2–4 sentences of substantive, specific content — not placeholders.\n"
            "7. Edge labels should be short action phrases (e.g. 'From the expert's view', 'What does the data say?').\n\n"
            f"{layout_guide}\n\n"
            f"Respond with ONLY a JSON object matching this schema exactly:\n{schema}\n"
            "Output only the JSON, no other text."
        )

        response = await self._client.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=_IDENTITY,
            messages=[{"role": "user", "content": task}],
        )
        raw = response.content[0].text.strip()
        logger.info("generate_narrative raw response (first 500 chars): %s", raw[:500])

        # Robust JSON extraction: find the outermost {...} block
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            logger.error("generate_narrative: no JSON object found in response: %s", raw[:1000])
            raise ValueError(f"Model did not return valid JSON. Response started with: {raw[:200]}")
        raw_json = match.group(0)

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as e:
            logger.error("generate_narrative: JSON parse error %s\nRaw: %s", e, raw_json[:1000])
            raise ValueError(f"JSON parse error: {e}") from e

        # Normalise: Claude sometimes returns camelCase despite instructions
        def normalise_node(n: dict) -> dict:
            if "nodeType" in n and "node_type" not in n:
                n["node_type"] = n.pop("nodeType")
            n.setdefault("node_type", "scene")
            n.setdefault("tags", [])
            n.setdefault("body", "")
            n.setdefault("x", 400.0)
            n.setdefault("y", 100.0)
            return n

        try:
            nodes = [GeneratedNode(**normalise_node(n)) for n in data["nodes"]]
            edges = [GeneratedEdge(**e) for e in data["edges"]]
        except Exception as e:
            logger.error("generate_narrative: model/edge construction error: %s\nData: %s", e, data)
            raise ValueError(f"Failed to parse narrative structure: {e}") from e

        return GenerateNarrativeResponse(nodes=nodes, edges=edges, mode="live")

    async def narrative_overview(self, node_details: list, graph_context: dict) -> NarrativeOverviewResponse:
        system = f"{_IDENTITY}\n\n{_project_context(graph_context)}"
        nodes_text = "\n".join(
            f"- [{n.node_type}] \"{n.title}\": {n.body or '(no description)'}"
            for n in node_details
        ) or "(no nodes yet)"
        task = (
            f"Review this IDN protostory and provide a comprehensive narrative overview:\n{nodes_text}\n\n"
            "Write a structured overview in markdown covering:\n"
            "1. **Theme** and central tension (1 sentence)\n"
            "2. **Summary** of the narrative (2–3 sentences)\n"
            "3. **Perspectives represented** (bullet list)\n"
            "4. **Narrative arc** — how the story flows from start to end\n"
            "5. **What's working well**\n"
            "6. **Consider adding** — what's missing or worth developing\n\n"
            "Be specific and grounded in the actual node content. Encouraging tone."
        )
        response = await self._client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": task}],
        )
        return NarrativeOverviewResponse(overview=response.content[0].text.strip(), mode="live")

    async def suggest_perspective(self, selected_node, graph_context: dict) -> PerspectiveResponse:
        gc = graph_context.__dict__ if hasattr(graph_context, '__dict__') else graph_context
        system = f"{_IDENTITY}\n\n{_project_context(gc, selected_node)}"
        task = (
            "Suggest an alternative narrative path that represents a different social perspective "
            "from the one currently dominant in the story. Respond with JSON:\n"
            '{"perspective_label": "<who this perspective belongs to>", "rationale": "<why this perspective matters>", '
            '"suggested_nodes": [{"title": "<8 words max>", "body": "<2 sentences>", "reasoning": "<1 sentence>", '
            '"suggested_edge_label": "<short label>"}]}\n'
            "Include 1-2 suggested_nodes. Output only JSON."
        )
        response = await self._client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": task}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        nodes = [BranchSuggestion(id=str(uuid.uuid4()), **n) for n in data.get("suggested_nodes", [])]
        return PerspectiveResponse(
            suggestion=PerspectiveSuggestion(
                perspective_label=data["perspective_label"],
                rationale=data["rationale"],
                suggested_nodes=nodes,
            ),
            mode="live",
        )
