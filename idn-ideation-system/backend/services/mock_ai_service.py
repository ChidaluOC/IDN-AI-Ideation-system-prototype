"""
Mock AI service — returns realistic, pre-written responses for demo/development mode.
Used automatically when ANTHROPIC_API_KEY is not set.
"""
import asyncio
import uuid
from typing import AsyncIterator

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


_BRANCH_POOL = [
    BranchSuggestion(
        id=str(uuid.uuid4()),
        title="An unexpected witness speaks up",
        body="A character who has been observing from the sidelines decides to break their silence. Their account contradicts the dominant narrative and opens a new line of inquiry.",
        reasoning="Introducing a witness who challenges the established account adds moral complexity and gives the reader a reason to question what they have been told — a core strength of IDN.",
        suggested_edge_label="A witness comes forward",
    ),
    BranchSuggestion(
        id=str(uuid.uuid4()),
        title="The decision with no good options",
        body="The protagonist faces a dilemma where every available path has a significant cost. The reader must choose, knowing the consequences will ripple through the rest of the story.",
        reasoning="Dilemmas without clean answers reflect real-world complexity and make the interactor feel genuine moral weight — which is particularly powerful in socially-engaged IDN.",
        suggested_edge_label="A difficult choice must be made",
    ),
    BranchSuggestion(
        id=str(uuid.uuid4()),
        title="Time passes — things have changed",
        body="A jump forward reveals how earlier choices have shaped the world. Some wounds have healed; others have deepened. This moment invites reflection on causality.",
        reasoning="Temporal jumps help authors show consequence rather than just action, which supports the IDN goal of representing systemic change over time.",
        suggested_edge_label="Time passes",
    ),
    BranchSuggestion(
        id=str(uuid.uuid4()),
        title="A perspective the reader hasn't considered",
        body="The narrative briefly shifts to show the same events from the point of view of a character who has been marginalised in the story so far.",
        reasoning="Perspective shifts are a hallmark of IDN's expressive power. They make the reader aware of the limits of any single viewpoint.",
        suggested_edge_label="Shift perspective",
    ),
    BranchSuggestion(
        id=str(uuid.uuid4()),
        title="The system pushes back",
        body="Institutional or social forces — bureaucracy, public opinion, structural inequality — intervene to constrain what the protagonist can do next.",
        reasoning="Showing how systemic forces constrain individual choice is especially relevant for journalists and educators using IDN to represent social issues.",
        suggested_edge_label="External forces intervene",
    ),
]

_MOCK_CHAT_RESPONSES = [
    "Great question! In IDN authoring, a **branching narrative** uses a graph of nodes where each node is a story moment and each edge represents a possible path. The reader's choices determine which path is taken.\n\nTo add a new story node: click the **+ Scene** or **+ Choice** button in the toolbar. Then drag from the edge handle of one node to another to create a connection.",
    "**Themes in IDN** work differently than in linear narratives. Instead of a single arc, you're designing a *space of possible meanings* — different readers will experience different combinations of events.\n\nA good approach is to identify your **core tension** first (e.g., 'individual agency vs. systemic constraint') and then design nodes that explore different facets of that tension.",
    "The **coherence** of a branching story depends on each path feeling intentional rather than arbitrary. Ask yourself: does every node have a reason to exist? Does every choice feel meaningful?\n\nA useful technique is to read through each possible path from start to finish and check that it tells a satisfying, coherent sub-story on its own.",
    "**IDN for journalism** (also called interactive documentary or database documentary) lets you present multiple true accounts of an event, letting readers navigate between them. The author's job is not to hide complexity but to design a structure that makes complexity legible.",
    "To use the AI assistant: you can ask me anything about IDN authoring, or select a specific node on the canvas and click **'Ask AI for branch ideas'** to get suggestions for what could happen next in the story.",
]

_chat_counter = 0


class MockAIService:
    mode = "mock"

    async def chat_stream(self, messages: list, graph_context: dict) -> AsyncIterator[dict]:
        global _chat_counter
        await asyncio.sleep(0.5)
        response = _MOCK_CHAT_RESPONSES[_chat_counter % len(_MOCK_CHAT_RESPONSES)]
        _chat_counter += 1
        # Stream word by word to simulate token streaming
        words = response.split(" ")
        for i, word in enumerate(words):
            yield {"text": word + (" " if i < len(words) - 1 else "")}
            await asyncio.sleep(0.03)

    async def suggest_branches(self, selected_node, graph_context) -> BranchResponse:
        await asyncio.sleep(0.6)
        node_count = graph_context.get("node_count", 0)
        # Pick 3 suggestions, rotating based on node count for variety
        offset = node_count % len(_BRANCH_POOL)
        picks = [
            _BRANCH_POOL[(offset + i) % len(_BRANCH_POOL)]
            for i in range(3)
        ]
        # Give each a fresh UUID so they don't collide on the frontend
        return BranchResponse(
            suggestions=[s.model_copy(update={"id": str(uuid.uuid4())}) for s in picks],
            mode="mock",
        )

    async def analyze_theme(self, premise: str, graph_context: dict) -> ThemeResponse:
        await asyncio.sleep(0.7)
        return ThemeResponse(
            analysis=ThemeAnalysis(
                dominant_angle="Individual agency within systemic constraint",
                framing_biases=[
                    "The story currently centres a protagonist with relatively high social capital — consider whether this shapes which choices feel 'natural'.",
                    "The framing implies change is possible through individual action; you may want to also show structural barriers.",
                ],
                underrepresented_perspectives=[
                    "Community members affected by the events who are not given voice in the current node structure.",
                    "Institutional actors (policymakers, employers) whose decisions shape the story's context.",
                ],
                reasoning="These observations are based on common framing patterns in socially-engaged narratives. They are starting points for reflection, not prescriptions.",
            ),
            mode="mock",
        )

    async def check_coherence(self, node_details: list, graph_context: dict) -> CoherenceResponse:
        await asyncio.sleep(0.5)
        node_count = graph_context.get("node_count", 0)

        issues = []
        if node_count == 0:
            issues.append(CoherenceIssue(
                issue_type="structural",
                description="The story has no nodes yet.",
                suggestion="Start by adding a Scene node that describes the opening situation your reader will encounter.",
            ))
        elif node_count < 3:
            issues.append(CoherenceIssue(
                issue_type="structural",
                description="The story is very short — it may not yet offer meaningful branching.",
                suggestion="Consider adding at least one Choice node that presents the reader with a genuine decision.",
            ))

        assessment = (
            "The story structure looks healthy so far. Keep developing nodes and ensure every path leads to an Ending."
            if not issues
            else "A few structural areas need attention before the story will feel complete."
        )
        return CoherenceResponse(issues=issues, overall_assessment=assessment, mode="mock")

    async def generate_narrative(self, premise: str) -> GenerateNarrativeResponse:
        await asyncio.sleep(1.2)
        nodes = [
            GeneratedNode(id="n1", title="The Problem: Urban Mobility Today", body="Cities face a growing tension between car dependency and sustainable transport. Traffic congestion, air pollution, and inequality of access have pushed the question of rail infrastructure back onto policy agendas worldwide.", nodeType="scene", tags=["opening", "problem"], x=700, y=80),
            GeneratedNode(id="n2", title="Who should shape this decision?", body="A proposed rail system would affect everyone differently. Choose a perspective to explore the debate.", nodeType="choice", tags=[], x=700, y=260),
            GeneratedNode(id="n3", title="The Transport Expert Reviews the Data", body="A mobility researcher pulls up the comparative data: cities that invested in rail saw a 15–30% reduction in private car use within a decade. The upfront cost is high, but the long-term economic return is well-documented.", nodeType="scene", tags=["expert"], x=200, y=460),
            GeneratedNode(id="n4", title="The numbers point one way", body="The modelling is clear: without a structural shift, congestion costs will rise 40% by 2035. Rail is the only intervention at the right scale.", nodeType="scene", tags=["expert"], x=200, y=660),
            GeneratedNode(id="n5", title="Expert conclusion", body="Evidence consistently favours rail investment — but political will and public trust are the real bottlenecks. The data alone cannot make this happen.", nodeType="ending", tags=["expert"], x=200, y=860),
            GeneratedNode(id="n6", title="The Local Activist Takes the Bus", body="Every morning, Maria waits 40 minutes for a bus that is supposed to come every 15. She has organised her neighbourhood to demand better. For her, rail is not an abstract policy — it is the difference between opportunity and exclusion.", nodeType="scene", tags=["activist"], x=700, y=460),
            GeneratedNode(id="n7", title="The community has been ignored before", body="Three previous transport plans were announced and shelved. Trust is low. The activist knows that any new proposal must be co-designed with residents, not handed down from above.", nodeType="scene", tags=["activist"], x=700, y=660),
            GeneratedNode(id="n8", title="Activist conclusion", body="Rail could transform daily life — but only if communities are at the table from the start, not consulted at the end.", nodeType="ending", tags=["activist"], x=700, y=860),
            GeneratedNode(id="n9", title="The Fiscal Opponent Reads the Budget", body="A city councillor opens the infrastructure report: projected cost, €2.4 billion over 15 years. With hospitals underfunded and schools in disrepair, he questions whether this is the right priority right now.", nodeType="scene", tags=["opponent"], x=1200, y=460),
            GeneratedNode(id="n10", title="The heritage objection", body="The proposed central corridor runs through a protected historic district. Tunnelling costs would double the budget. Above-ground routing would permanently alter a landscape that defines the city's identity.", nodeType="scene", tags=["opponent"], x=1200, y=660),
            GeneratedNode(id="n11", title="Opponent conclusion", body="The case against is not that rail is wrong in principle — it is that this plan, at this cost, risks crowding out every other social investment for a generation.", nodeType="ending", tags=["opponent"], x=1200, y=860),
            GeneratedNode(id="n12", title="Now it is your turn to decide", body="You have heard the expert's evidence, the activist's lived experience, and the opponent's fiscal caution. If you were advising the government, what would you recommend?", nodeType="question", tags=["convergence"], x=700, y=1060),
        ]
        edges = [
            GeneratedEdge(id="e1", source="n1", target="n2", label="What are the options?"),
            GeneratedEdge(id="e2", source="n2", target="n3", label="From the expert's view"),
            GeneratedEdge(id="e3", source="n2", target="n6", label="From the activist's view"),
            GeneratedEdge(id="e4", source="n2", target="n9", label="From the opponent's view"),
            GeneratedEdge(id="e5", source="n3", target="n4", label="What does the modelling show?"),
            GeneratedEdge(id="e6", source="n4", target="n5", label="What is the conclusion?"),
            GeneratedEdge(id="e7", source="n6", target="n7", label="Has this happened before?"),
            GeneratedEdge(id="e8", source="n7", target="n8", label="What would change things?"),
            GeneratedEdge(id="e9", source="n9", target="n10", label="What else is at stake?"),
            GeneratedEdge(id="e10", source="n10", target="n11", label="What is the conclusion?"),
            GeneratedEdge(id="e11", source="n5", target="n12", label="Reflect on all views"),
            GeneratedEdge(id="e12", source="n8", target="n12", label="Reflect on all views"),
            GeneratedEdge(id="e13", source="n11", target="n12", label="Reflect on all views"),
        ]
        return GenerateNarrativeResponse(nodes=nodes, edges=edges, mode="mock")

    async def narrative_overview(self, node_details: list, graph_context: dict) -> NarrativeOverviewResponse:
        await asyncio.sleep(0.8)
        node_count = graph_context.get("node_count", 0)
        if node_count == 0:
            return NarrativeOverviewResponse(
                overview="The canvas is currently empty. Start by adding a Scene node to begin your protostory.",
                mode="mock",
            )
        overview = (
            "**Protostory Overview**\n\n"
            "**Theme:** Urban mobility and the politics of public infrastructure\n\n"
            "**Narrative format:** Branching / multi-perspective\n\n"
            "**Summary:** The protostory opens with a structural problem — rising urban congestion and the case for rail investment. The reader explores this issue from three distinct vantage points: a transport expert presenting data-driven arguments, a local activist whose community experiences the consequences daily, and a fiscal opponent concerned with budget priorities and heritage. Each path deepens the reader's understanding before converging at a final reflection question.\n\n"
            "**Perspectives represented:**\n"
            "- Transport expert (evidence-based, technocratic)\n"
            "- Local activist (lived experience, community-centred)\n"
            "- Fiscal opponent (budget-conscious, heritage-aware)\n\n"
            "**Narrative arc:** Problem framing → perspective selection → path exploration → convergence and reflection. Each path has a clear beginning, middle, and conclusion.\n\n"
            "**What's working well:** The multi-perspective structure is coherent. Each path has a distinct voice and the convergence node creates a meaningful moment of synthesis.\n\n"
            "**Consider adding:** An affected resident with no institutional voice, or a historical perspective showing how similar debates played out in the past."
        )
        return NarrativeOverviewResponse(overview=overview, mode="mock")

    async def suggest_perspective(self, selected_node, graph_context: dict) -> PerspectiveResponse:
        await asyncio.sleep(0.6)
        return PerspectiveResponse(
            suggestion=PerspectiveSuggestion(
                perspective_label="A community member affected by the events",
                rationale="Your current path follows a decision-maker's viewpoint. Adding a branch that shows how someone with less power experiences the same events reveals the human cost of those decisions — a powerful technique in socially-engaged IDN.",
                suggested_nodes=[
                    BranchSuggestion(
                        id=str(uuid.uuid4()),
                        title="Seen from the outside",
                        body="The same moment, experienced by someone who had no say in the decision. Their perspective reveals what was invisible from the centre of power.",
                        reasoning="Parallel-path perspective shifts are a distinctive strength of IDN that linear narratives cannot replicate.",
                        suggested_edge_label="Another perspective",
                    )
                ],
            ),
            mode="mock",
        )
