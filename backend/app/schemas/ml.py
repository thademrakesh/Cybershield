from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class PredictionRequest(BaseModel):
    features: Dict[str, Any]
    
class PredictionResponse(BaseModel):
    attack_type: str
    severity: str
    confidence: float
    timestamp: str

class ExplanationRequest(BaseModel):
    features: Dict[str, Any]

class ExplanationResponse(BaseModel):
    important_features: List[Dict[str, Any]]  # [{"feature": "name", "value": 0.5}, ...]
    explanation_text: str
