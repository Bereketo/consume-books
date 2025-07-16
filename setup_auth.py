#!/usr/bin/env python3
"""
Setup script for ReadShift authentication system.
This script helps initialize the database and create the necessary tables.
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

def setup_environment():
    """Check and setup environment variables."""
    print("Setting up environment...")
    
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        if env_example.exists():
            print("Creating .env file from .env.example...")
            with open(env_example, 'r') as f:
                content = f.read()
            with open(env_file, 'w') as f:
                f.write(content)
            print("✅ .env file created! Please update it with your actual values.")
        else:
            print("❌ .env.example not found!")
            return False
    else:
        print("✅ .env file already exists.")
    
    return True

def setup_database():
    """Initialize the database."""
    print("\nSetting up database...")
    
    try:
        from readshift.database import create_tables
        from readshift.config import settings
        
        print(f"Database URL: {settings.database_url}")
        
        # Create tables
        create_tables()
        print("✅ Database tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

def main():
    """Main setup function."""
    print("ReadShift Authentication Setup")
    print("=" * 40)
    
    # Setup environment
    if not setup_environment():
        print("❌ Environment setup failed!")
        return
    
    # Setup database
    if not setup_database():
        print("❌ Database setup failed!")
        return
    
    print("\n" + "=" * 40)
    print("✅ Setup completed successfully!")
    print("\nNext steps:")
    print("1. Update your .env file with actual values")
    print("2. Start the server: uvicorn src.readshift.main:app --reload")
    print("3. Visit http://localhost:8000/docs to see the API documentation")
    print("4. Run python test_api.py to test the authentication endpoints")

if __name__ == "__main__":
    main()
