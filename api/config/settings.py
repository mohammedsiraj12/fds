import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration settings
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "change_this_password")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your_super_secure_jwt_secret_here_minimum_32_characters")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# CORS settings
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
