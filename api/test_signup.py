#!/usr/bin/env python3
"""Test signup endpoint directly"""

import requests
import json

def test_signup():
    """Test the signup endpoint"""
    
    url = "http://localhost:8001/auth/signup"
    
    test_data = {
        "email": "testuser@example.com",
        "password": "testpassword123",
        "role": "patient"
    }
    
    print("Testing Signup Endpoint...")
    print(f"URL: {url}")
    print(f"Data: {test_data}")
    print("-" * 50)
    
    try:
        response = requests.post(url, json=test_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("SUCCESS: Signup worked!")
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            return True
        else:
            print("FAILED: Signup failed!")
            print(f"Error Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to backend!")
        print("Make sure your backend is running on port 8001")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_signup()
    if success:
        print("\nSignup endpoint is working!")
    else:
        print("\nSignup endpoint has issues!")
