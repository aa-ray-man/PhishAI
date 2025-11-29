from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import os
from fastapi.middleware.cors import CORSMiddleware  # move import up here

# Initialize FastAPI app
app = FastAPI(title="Phishing & Umpire Detection API")

# Add CORS middleware here, immediately after app creation
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request and response models
class PredictionRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    prediction: int
    confidence: float
    model_type: str

# Global variables to store loaded models and tokenizers
models = {}
tokenizers = {}
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_models():
    """Load all three models at startup"""
    global models, tokenizers
    
    base_path = os.path.dirname(os.path.abspath(__file__))
    
    # Model configurations: (tokenizer_path, model_path)
    model_configs = {
        "umpire": ("umpire_model", "results_Umpire_Model/checkpoint-100"),
        "email": ("email_phishing_model", "results_Email_Phishing_Model/checkpoint-800"),
        "url": ("url_phishing_model", "results_URL_Phishing_Model/checkpoint-1200")
    }
    
    try:
        for model_name, (tokenizer_dir, model_dir) in model_configs.items():
            tokenizer_path = os.path.join(base_path, tokenizer_dir)
            model_path = os.path.join(base_path, model_dir)
            
            print(f"Loading {model_name} model...")
            print(f"  Tokenizer from: {tokenizer_path}")
            print(f"  Model from: {model_path}")
            
            # Load tokenizer and model
            tokenizers[model_name] = AutoTokenizer.from_pretrained(tokenizer_path)
            models[model_name] = AutoModelForSequenceClassification.from_pretrained(model_path).to(device)
            models[model_name].eval()
            
            print(f"✓ {model_name} model loaded successfully\n")
    except Exception as e:
        print(f"✗ Error loading models: {str(e)}")
        raise

def predict(text: str, model_name: str) -> dict:
    """Make prediction using specified model"""
    try:
        if model_name not in models:
            raise ValueError(f"Model '{model_name}' not found")
        
        tokenizer = tokenizers[model_name]
        model = models[model_name]
        
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)
            prediction = torch.argmax(logits, dim=-1).item()
            confidence = probabilities[0][prediction].item()
        
        return {
            "prediction": prediction,
            "confidence": confidence,
            "model_type": model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/umpire", response_model=PredictionResponse)
async def umpire_predict(request: PredictionRequest):
    """Umpire model prediction endpoint"""
    result = predict(request.text, "umpire")
    return PredictionResponse(**result)

@app.post("/email", response_model=PredictionResponse)
async def email_predict(request: PredictionRequest):
    """Email phishing detection endpoint"""
    result = predict(request.text, "email")
    return PredictionResponse(**result)

@app.post("/url", response_model=PredictionResponse)
async def url_predict(request: PredictionRequest):
    """URL phishing detection endpoint"""
    result = predict(request.text, "url")
    return PredictionResponse(**result)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": list(models.keys())
    }

if __name__ == "__main__":
    import uvicorn
    load_models()
    uvicorn.run(app, host="0.0.0.0", port=8000)
