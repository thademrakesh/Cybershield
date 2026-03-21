import xgboost as xgb
import shap
import numpy as np
import os
import joblib
import json
import logging

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../saved_models"))

class MLEngine:
    def __init__(self, 
                 model_path=os.path.join(MODEL_DIR, "model.json"), 
                 encoders_path=os.path.join(MODEL_DIR, "encoders.pkl"), 
                 metrics_path=os.path.join(MODEL_DIR, "metrics.json")):
        self.model = None
        self.model_path = model_path
        self.encoders_path = encoders_path
        self.metrics_path = metrics_path
        self.encoders = {}
        self.explainer = None
        self.metrics = {"accuracy": 0.0, "f1_score": 0.0} # Default
        self.alert_config = {
            "thresholds": {"low": 25, "medium": 50, "high": 80, "critical": 95},
            "notifications": {"email": False, "sms": False, "slack": False, "webhook": False, "push": False},
            "contacts": {"email": "", "phone": "", "slackUrl": "", "webhookUrl": ""}
        }
        
        # Exact feature order used in training
        self.feature_names = [
            'duration','protocol_type','service','flag',
            'src_bytes','dst_bytes','wrong_fragment','urgent',
            'num_failed_logins','logged_in','num_compromised',
            'count','srv_count','serror_rate','srv_serror_rate',
            'same_srv_rate','diff_srv_rate'
        ]
        
        self.load_model()

    def load_model(self):
        # Load Model
        if os.path.exists(self.model_path):
            try:
                self.model = xgb.Booster()
                self.model.load_model(self.model_path)
                logger.info("XGBoost model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
        else:
            logger.warning(f"Model file not found at {self.model_path}. Running in MOCK mode.")

        # Load Encoders
        if os.path.exists(self.encoders_path):
            try:
                self.encoders = joblib.load(self.encoders_path)
                logger.info("Encoders loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load encoders: {e}")
        else:
            logger.warning(f"Encoders file not found at {self.encoders_path}.")

        # Load Metrics
        if os.path.exists(self.metrics_path):
            try:
                with open(self.metrics_path, 'r') as f:
                    self.metrics = json.load(f)
                logger.info("Model metrics loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load metrics: {e}")
        else:
            logger.warning(f"Metrics file not found at {self.metrics_path}.")


    def preprocess_features(self, raw_features):
        """
        Convert raw feature dictionary to model-ready list.
        Handles label encoding for categorical variables.
        """
        processed_row = []
        for feature in self.feature_names:
            value = raw_features.get(feature, 0) # Default to 0 if missing
            
            # Apply encoding for categorical features
            if feature in ['protocol_type', 'service', 'flag'] and feature in self.encoders:
                encoder = self.encoders[feature]
                try:
                    # Check if value is known, else use a default (or 0 if not robust)
                    # For safety, if string not in encoder, map to first class or handle exception
                    if value in encoder.classes_:
                        value = encoder.transform([value])[0]
                    else:
                        # Fallback for unknown categories
                        value = 0 
                except Exception:
                    value = 0
            
            # Ensure numeric
            try:
                value = float(value)
            except:
                value = 0.0
                
            processed_row.append(value)
        
        return processed_row

    def predict(self, raw_features_dict):
        """
        Predict attack type from raw feature dictionary.
        """
        if not self.model:
            # Mock prediction if model not loaded
            return {
                "attack_type": "Normal",
                "severity": "Low",
                "confidence": 0.95
            }
        
        # Preprocess
        features_list = self.preprocess_features(raw_features_dict)
        
        # Create DMatrix
        dmatrix = xgb.DMatrix([features_list], feature_names=self.feature_names)
        
        # Predict (handle various output shapes robustly)
        try:
            probs = self.model.predict(dmatrix)
            probs = np.array(probs)
        except Exception as e:
            logger.error(f"Model predict error: {e}")
            return {
                "attack_type": "Normal",
                "severity": "Low",
                "confidence": 0.5
            }
        
        # Normalize shapes:
        # - Multi-class softprob: (1, K) -> take argmax
        # - Multi-class softmax: (1,) -> contains class index
        # - Binary: (1,) -> probability
        
        pred_idx = 0
        confidence = 1.0

        if probs.ndim == 2:
            row = probs[0]
            pred_idx = int(np.argmax(row))
            confidence = float(row[pred_idx])
        elif probs.ndim == 1:
            if len(probs) > 1:
                # 1D array of probabilities (softprob flattened?)
                pred_idx = int(np.argmax(probs))
                confidence = float(probs[pred_idx])
            else:
                # Scalar value (softmax class label or binary prob)
                val = float(probs[0])
                # Check if it looks like a class index (integer) or probability
                if val.is_integer() and len(self.encoders.get('target', {}).classes_) > 2:
                     pred_idx = int(val)
                     confidence = 1.0 # Confidence unknown for softmax
                else:
                     # Binary probability
                     pred_idx = 1 if val >= 0.5 else 0
                     confidence = val if val >= 0.5 else 1.0 - val
        else:
            # Scalar
            val = float(probs.item())
            if val.is_integer() and len(self.encoders.get('target', {}).classes_) > 2:
                 pred_idx = int(val)
                 confidence = 1.0
            else:
                 pred_idx = 1 if val >= 0.5 else 0
                 confidence = val
        
        # Decode class name
        if 'target' in self.encoders:
            classes = self.encoders['target'].classes_
            if 0 <= pred_idx < len(classes):
                attack_type = self.encoders['target'].inverse_transform([pred_idx])[0]
            else:
                attack_type = "Unknown"
        else:
            # Fallback mapping if encoder missing
            attack_types = ["Normal", "DoS", "Probe", "R2L", "U2R"]
            attack_type = attack_types[pred_idx] if pred_idx < len(attack_types) else "Unknown"
        
        severity = self.assess_severity(attack_type, confidence)
        
        return {
            "attack_type": attack_type,
            "severity": severity,
            "confidence": confidence
        }

    def explain(self, raw_features_dict):
        if not self.model:
             return {
                "important_features": [{"feature": "mock_feat", "value": 0.5}],
                "explanation_text": "Mock explanation: Model not loaded."
            }
        
        features_list = self.preprocess_features(raw_features_dict)
        
        # Initialize explainer if needed (lazy load)
        if not self.explainer:
             try:
                 self.explainer = shap.TreeExplainer(self.model)
             except Exception as e:
                 logger.error(f"Failed to init SHAP explainer: {e}")
                 return {
                    "important_features": [],
                    "explanation_text": "Explainability module unavailable."
                 }

        try:
            dmatrix = xgb.DMatrix([features_list], feature_names=self.feature_names)
            shap_values = self.explainer.shap_values(dmatrix)
            
            # shap_values shape:
            # - Binary: (1, F)
            # - Multiclass: list of (1, F) arrays, one per class
            
            # Determine which class was predicted
            pred_res = self.predict(raw_features_dict)
            attack_type = pred_res["attack_type"]
            
            # Find index of this attack type
            target_idx = 0
            if 'target' in self.encoders:
                classes = self.encoders['target'].classes_
                if attack_type in classes:
                    target_idx = list(classes).index(attack_type)
            
            # Get values for the predicted class
            if isinstance(shap_values, list):
                # Multiclass
                if target_idx < len(shap_values):
                    vals = shap_values[target_idx][0]
                else:
                    vals = shap_values[0][0] # Fallback
            elif shap_values.ndim == 3:
                 # (rows, features, classes)
                 if target_idx < shap_values.shape[2]:
                     vals = shap_values[0, :, target_idx]
                 else:
                     vals = shap_values[0, :, 0]
            elif shap_values.ndim == 2:
                 vals = shap_values[0]
            else:
                 vals = shap_values.flatten()

            # Get top contributing features (absolute value)
            abs_vals = np.abs(vals)
            total_abs_shap = np.sum(abs_vals) if np.sum(abs_vals) > 0 else 1.0
            
            # Let's take top 10 by absolute magnitude
            top_indices = np.argsort(abs_vals)[-10:][::-1]
            
            important_features = []
            for idx in top_indices:
                feat_name = self.feature_names[idx]
                shap_val = float(vals[idx])
                feat_val = float(features_list[idx])
                
                # Calculate percentage contribution
                percent_impact = float((abs_vals[idx] / total_abs_shap) * 100)
                
                important_features.append({
                    "feature": feat_name,
                    "value": shap_val, # Raw SHAP value
                    "percentage": percent_impact, # Normalized percentage
                    "actual_value": feat_val
                })
                
            # Construct text
            top_feat = important_features[0]['feature']
            explanation_text = f"The model classified this as '{attack_type}' mainly because of '{top_feat}' (impact: {important_features[0]['percentage']:.1f}%)."
            
            # Compatibility with older frontend versions
            shap_dict = {f['feature']: float(f['value']) for f in important_features}
            percent_dict = {f['feature']: float(f['percentage']) for f in important_features}

            return {
                "important_features": important_features,
                "explanation_text": explanation_text,
                "shap_values": shap_dict,
                "percentage_values": percent_dict
            }
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}")
            return {
                "important_features": [],
                "explanation_text": f"Could not generate explanation: {str(e)}"
            }

    def assess_severity(self, attack_type, confidence=1.0):
        # Base severity from type as per user request
        # "dont depend on predicted confidence score" for the label
        severity_map = {
            "Normal": "Low",
            "Probe": "Medium",
            "DoS": "High",
            "R2L": "Critical",
            "U2R": "Critical"
        }
        
        # Default to Medium if unknown, or use map
        return severity_map.get(attack_type, "Medium")

ml_engine = MLEngine()
