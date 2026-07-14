"""
LangChain & LangGraph powered AI features for NeuroScan.
- Goal generation (personalized via LLM)
- Patient comparison insights
- Daily tracker feedback
- Multi-agent report generation (LangGraph)
"""

import os
import json
from typing import TypedDict, Annotated

# ── LangChain imports ─────────────────────────────────────────────────────

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_mistralai import ChatMistralAI

# ── LangGraph imports ─────────────────────────────────────────────────────

from langgraph.graph import StateGraph, START, END

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")


def get_llm(temperature=0.3):
    """Get Mistral LLM instance via LangChain."""
    if not MISTRAL_API_KEY:
        return None
    return ChatMistralAI(
        model="mistral-small-latest",
        api_key=MISTRAL_API_KEY,
        temperature=temperature,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 1. LANGCHAIN: Personalized Goal Generation
# ═══════════════════════════════════════════════════════════════════════════

GOAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a medical lifestyle coach specializing in brain tumor recovery.
Generate personalized daily lifestyle goals for a patient based on their diagnosis, age, gender, and medical history.

Return ONLY valid JSON array with 6-8 goals. Each goal object must have:
- "category": one of "hydration", "sleep", "exercise", "diet", "stress", "monitoring"
- "title": short goal name (max 50 chars)
- "description": one sentence explanation
- "target_value": numeric target (e.g., 8 for glasses of water)
- "unit": measurement unit (e.g., "glasses", "hours", "minutes", "score (1-5)", "session")
- "frequency": "daily"

Tailor goals specifically to the patient's condition. Be medically accurate."""),
    ("human", """Patient: {name}, Age: {age}, Gender: {gender}
Diagnosis: {diagnosis}
Medical History: {medical_history}
Risk Level: {risk_level}

Generate personalized recovery goals:"""),
])


def generate_goals_with_langchain(patient_info: dict) -> list:
    """Use LangChain to generate personalized goals. Falls back to None if unavailable."""
    llm = get_llm(temperature=0.4)
    if not llm:
        return None

    try:
        chain = GOAL_PROMPT | llm | JsonOutputParser()
        goals = chain.invoke({
            "name": patient_info.get("name", "Patient"),
            "age": patient_info.get("age", "unknown"),
            "gender": patient_info.get("gender", "unknown"),
            "diagnosis": patient_info.get("diagnosis", "No Tumor"),
            "medical_history": patient_info.get("medical_history", "None"),
            "risk_level": patient_info.get("risk_level", "Low"),
        })
        if isinstance(goals, list):
            return goals
        return None
    except Exception as e:
        print(f"[LangChain] Goal generation error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════
# 2. LANGCHAIN: Patient Comparison Insights
# ═══════════════════════════════════════════════════════════════════════════

COMPARE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a senior neuro-oncologist analyzing patient recovery data.
Compare two patients' treatment progress and provide data-driven clinical insights.

Focus on:
1. Which lifestyle approach is more effective for their tumor type
2. What exercises/habits correlate with better recovery (higher mood, adherence)
3. Actionable recommendations the doctor can apply to future patients
4. Which patient is recovering faster and why

Be specific, cite the numbers. Return JSON with:
- "insights": array of 5-7 insight strings
- "recommendation": one paragraph summary for the doctor
- "effective_practices": array of practices that are working well (from the better-performing patient)"""),
    ("human", """Patient 1: {name1}
- Diagnosis: {diagnosis1}
- Streak: {streak1} days, Adherence: {adherence1}%
- Avg Sleep: {sleep1}h, Water: {water1} glasses, Exercise: {exercise1} min/day
- Mood: {mood1}/5, Diet: {diet1}/5, Mood Trend: {trend1}
- Goals: {goals1}

Patient 2: {name2}
- Diagnosis: {diagnosis2}
- Streak: {streak2} days, Adherence: {adherence2}%
- Avg Sleep: {sleep2}h, Water: {water2} glasses, Exercise: {exercise2} min/day
- Mood: {mood2}/5, Diet: {diet2}/5, Mood Trend: {trend2}
- Goals: {goals2}

Provide clinical comparison and recommendations:"""),
])


def compare_patients_with_langchain(stats1: dict, stats2: dict) -> dict:
    """Use LangChain to generate comparison insights. Falls back to None."""
    llm = get_llm(temperature=0.3)
    if not llm:
        return None

    try:
        chain = COMPARE_PROMPT | llm | JsonOutputParser()
        result = chain.invoke({
            "name1": stats1["patient"]["name"],
            "diagnosis1": stats1["diagnosis"],
            "streak1": stats1["streak"],
            "adherence1": stats1["adherence"],
            "sleep1": stats1["avgSleep"],
            "water1": stats1["avgWater"],
            "exercise1": stats1["avgExercise"],
            "mood1": stats1["avgMood"],
            "diet1": stats1["avgDiet"],
            "trend1": stats1["moodTrend"],
            "goals1": ", ".join(g["title"] for g in stats1.get("goals", [])),
            "name2": stats2["patient"]["name"],
            "diagnosis2": stats2["diagnosis"],
            "streak2": stats2["streak"],
            "adherence2": stats2["adherence"],
            "sleep2": stats2["avgSleep"],
            "water2": stats2["avgWater"],
            "exercise2": stats2["avgExercise"],
            "mood2": stats2["avgMood"],
            "diet2": stats2["avgDiet"],
            "trend2": stats2["moodTrend"],
            "goals2": ", ".join(g["title"] for g in stats2.get("goals", [])),
        })
        return result
    except Exception as e:
        print(f"[LangChain] Comparison error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════
# 3. LANGCHAIN: Daily Tracker Feedback
# ═══════════════════════════════════════════════════════════════════════════

FEEDBACK_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a supportive AI health coach for a brain tumor patient.
Based on today's log and their goals, give brief encouraging feedback (2-3 sentences).
Be warm, specific about their numbers, and suggest one improvement.
If they're doing well, celebrate it. If struggling, be gentle and motivating."""),
    ("human", """Patient: {name}, Diagnosis: {diagnosis}
Today's Log: Water: {water} glasses, Sleep: {sleep}h, Exercise: {exercise}min, Mood: {mood}/5, Diet: {diet}/5
Goals: {goals}
Streak: {streak} days

Give feedback:"""),
])


def generate_tracker_feedback(log_data: dict, patient_info: dict) -> str:
    """Generate personalized feedback after daily log submission."""
    llm = get_llm(temperature=0.6)
    if not llm:
        return None

    try:
        chain = FEEDBACK_PROMPT | llm | StrOutputParser()
        feedback = chain.invoke({
            "name": patient_info.get("name", "Patient"),
            "diagnosis": patient_info.get("diagnosis", ""),
            "water": log_data.get("water_intake", "—"),
            "sleep": log_data.get("sleep_hours", "—"),
            "exercise": log_data.get("exercise_minutes", "—"),
            "mood": log_data.get("mood", "—"),
            "diet": log_data.get("diet_compliance", "—"),
            "goals": patient_info.get("goals_summary", ""),
            "streak": patient_info.get("streak", 0),
        })
        return feedback
    except Exception as e:
        print(f"[LangChain] Feedback error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════
# 4. LANGGRAPH: Multi-Agent Report Generation
# ═══════════════════════════════════════════════════════════════════════════

class ReportState(TypedDict):
    patient_name: str
    patient_age: str
    patient_gender: str
    diagnosis: str
    medical_history: str
    scan_data: str
    avg_confidence: float
    scan_analysis: str
    diet_plan: str
    lifestyle_plan: str
    final_report: dict


def build_report_graph():
    """Build a LangGraph StateGraph for multi-agent report generation."""
    llm = get_llm(temperature=0.3)
    if not llm:
        return None

    # Agent 1: Scan Analyzer
    scan_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a neuro-radiologist. Analyze the MRI scan results and provide a clinical interpretation. Be thorough but concise (3-4 sentences)."),
        ("human", "Patient: {patient_name}, Age: {patient_age}, Gender: {patient_gender}\nDiagnosis: {diagnosis}\nMedical History: {medical_history}\nScan Data: {scan_data}\nAvg Confidence: {avg_confidence}%\n\nProvide clinical interpretation:"),
    ])

    # Agent 2: Diet Specialist
    diet_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a clinical nutritionist specializing in neuro-oncology.
Create a personalized diet plan. Return JSON with keys:
- "overview": one paragraph
- "recommended": array of {{"category": str, "items": [str], "benefit": str}}
- "avoid": array of {{"category": str, "items": [str], "reason": str}}
- "hydration": one sentence
- "meal_timing": one sentence"""),
        ("human", "Patient: {patient_name}, Age: {patient_age}, Diagnosis: {diagnosis}\nMedical History: {medical_history}\n\nCreate personalized diet plan:"),
    ])

    # Agent 3: Lifestyle Coach
    lifestyle_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a rehabilitation specialist for brain tumor patients.
Create a personalized lifestyle modification plan. Return JSON with keys:
- "exercise": array of {{"activity": str, "frequency": str, "note": str}}
- "sleep": array of recommendation strings
- "stress_management": array of technique strings
- "avoid": array of things to avoid
- "self_monitoring": array of what to track"""),
        ("human", "Patient: {patient_name}, Age: {patient_age}, Gender: {patient_gender}, Diagnosis: {diagnosis}\nMedical History: {medical_history}\n\nCreate lifestyle plan:"),
    ])

    # Agent 4: Report Compiler
    compiler_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a senior neuro-oncologist compiling a final patient report.
Based on the scan analysis, diet plan, and lifestyle plan provided, write:
Return JSON with keys:
- "executive_summary": 3-4 sentence overview of findings and plan
- "clinical_interpretation": detailed scan interpretation (2-3 sentences)
- "prognosis": evidence-based prognosis statement (2-3 sentences)"""),
        ("human", """Patient: {patient_name}, Diagnosis: {diagnosis}
Scan Analysis: {scan_analysis}
Diet Plan: {diet_plan}
Lifestyle Plan: {lifestyle_plan}

Compile the final report:"""),
    ])

    def analyze_scans(state: ReportState) -> dict:
        chain = scan_prompt | llm | StrOutputParser()
        result = chain.invoke(state)
        return {"scan_analysis": result}

    def create_diet_plan(state: ReportState) -> dict:
        chain = diet_prompt | llm | StrOutputParser()
        result = chain.invoke(state)
        return {"diet_plan": result}

    def create_lifestyle_plan(state: ReportState) -> dict:
        chain = lifestyle_prompt | llm | StrOutputParser()
        result = chain.invoke(state)
        return {"lifestyle_plan": result}

    def compile_report(state: ReportState) -> dict:
        chain = compiler_prompt | llm | JsonOutputParser()
        result = chain.invoke(state)
        return {"final_report": result}

    # Build the graph
    graph = StateGraph(ReportState)

    graph.add_node("scan_analyzer", analyze_scans)
    graph.add_node("diet_specialist", create_diet_plan)
    graph.add_node("lifestyle_coach", create_lifestyle_plan)
    graph.add_node("report_compiler", compile_report)

    # Flow: START -> scan_analyzer -> diet_specialist -> lifestyle_coach -> report_compiler -> END
    graph.add_edge(START, "scan_analyzer")
    graph.add_edge("scan_analyzer", "diet_specialist")
    graph.add_edge("diet_specialist", "lifestyle_coach")
    graph.add_edge("lifestyle_coach", "report_compiler")
    graph.add_edge("report_compiler", END)

    return graph.compile()


def generate_report_with_langgraph(patient_info: dict, scan_data: list) -> dict:
    """Run the LangGraph multi-agent report pipeline."""
    graph = build_report_graph()
    if not graph:
        return None

    try:
        scan_summary = json.dumps([
            {"date": s.get("date"), "prediction": s.get("prediction"),
             "confidence": s.get("confidence"), "risk": s.get("risk")}
            for s in scan_data
        ])

        initial_state = {
            "patient_name": patient_info.get("name", "Patient"),
            "patient_age": str(patient_info.get("age", "unknown")),
            "patient_gender": patient_info.get("gender", "unknown"),
            "diagnosis": patient_info.get("diagnosis", "No Tumor"),
            "medical_history": patient_info.get("medical_history", "None"),
            "scan_data": scan_summary,
            "avg_confidence": patient_info.get("avg_confidence", 0),
            "scan_analysis": "",
            "diet_plan": "",
            "lifestyle_plan": "",
            "final_report": {},
        }

        result = graph.invoke(initial_state)

        # Parse diet and lifestyle back to dicts if they're JSON strings
        diet_chart = {}
        lifestyle_changes = {}
        try:
            diet_chart = json.loads(result.get("diet_plan", "{}"))
        except (json.JSONDecodeError, TypeError):
            diet_chart = {"overview": result.get("diet_plan", "")}
        try:
            lifestyle_changes = json.loads(result.get("lifestyle_plan", "{}"))
        except (json.JSONDecodeError, TypeError):
            lifestyle_changes = {"exercise": [], "sleep": [result.get("lifestyle_plan", "")]}

        final = result.get("final_report", {})
        final["diet_chart"] = diet_chart
        final["lifestyle_changes"] = lifestyle_changes
        final["consolidated_diagnosis"] = patient_info.get("diagnosis", "No Tumor")

        return final
    except Exception as e:
        print(f"[LangGraph] Report generation error: {e}")
        return None
