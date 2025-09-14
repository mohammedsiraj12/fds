#!/usr/bin/env python3
"""
Test script for password reset functionality
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:8002"
PASSWORD_RESET_ENDPOINT = f"{BASE_URL}/password-reset"

def test_password_reset_flow():
    """Test the complete password reset flow"""
    
    print("🧪 Testing Password Reset Functionality")
    print("=" * 50)
    
    # Test email for password reset
    test_email = "test@example.com"
    
    # Step 1: Request password reset
    print("\n1️⃣ Testing password reset request...")
    try:
        reset_request = {
            "email": test_email
        }
        
        response = requests.post(
            f"{PASSWORD_RESET_ENDPOINT}/request",
            json=reset_request,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Password reset request successful!")
                reset_token = data.get("reset_token")
                
                if reset_token:
                    print(f"📧 Reset token: {reset_token}")
                    
                    # Step 2: Test password reset confirmation
                    print("\n2️⃣ Testing password reset confirmation...")
                    
                    confirm_request = {
                        "token": reset_token,
                        "new_password": "newpassword123"
                    }
                    
                    confirm_response = requests.post(
                        f"{PASSWORD_RESET_ENDPOINT}/confirm",
                        json=confirm_request,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    print(f"Status Code: {confirm_response.status_code}")
                    print(f"Response: {json.dumps(confirm_response.json(), indent=2)}")
                    
                    if confirm_response.status_code == 200:
                        print("✅ Password reset confirmation successful!")
                    else:
                        print("❌ Password reset confirmation failed!")
                else:
                    print("⚠️ No reset token returned (this is expected if email doesn't exist)")
            else:
                print("❌ Password reset request failed!")
        else:
            print("❌ Password reset request failed!")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the server is running on http://localhost:8002")
        print("💡 Start the server with: python main.py")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_invalid_token():
    """Test with invalid token"""
    print("\n3️⃣ Testing with invalid token...")
    try:
        invalid_request = {
            "token": "invalid_token_123",
            "new_password": "newpassword123"
        }
        
        response = requests.post(
            f"{PASSWORD_RESET_ENDPOINT}/confirm",
            json=invalid_request,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 400:
            print("✅ Invalid token correctly rejected!")
        else:
            print("❌ Invalid token should be rejected!")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_cleanup_endpoint():
    """Test cleanup endpoint"""
    print("\n4️⃣ Testing cleanup endpoint...")
    try:
        response = requests.delete(f"{PASSWORD_RESET_ENDPOINT}/cleanup-expired")
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Cleanup endpoint working!")
        else:
            print("❌ Cleanup endpoint failed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_password_reset_flow()
    test_invalid_token()
    test_cleanup_endpoint()
    
    print("\n" + "=" * 50)
    print("🎯 Password Reset Testing Complete!")
    print("\n📋 Available Endpoints:")
    print(f"  POST {PASSWORD_RESET_ENDPOINT}/request")
    print(f"  POST {PASSWORD_RESET_ENDPOINT}/confirm")
    print(f"  POST {PASSWORD_RESET_ENDPOINT}/change")
    print(f"  DELETE {PASSWORD_RESET_ENDPOINT}/cleanup-expired")
