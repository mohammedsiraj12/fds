#!/usr/bin/env python3
"""Test Neo4j AuraDB connection"""

from neo4j import GraphDatabase
from config.settings import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

def test_connection():
    """Test connection to Neo4j AuraDB"""
    print("Testing Neo4j AuraDB Connection...")
    print(f"URI: {NEO4J_URI}")
    print(f"User: {NEO4J_USER}")
    print(f"Password: {'*' * len(NEO4J_PASSWORD)}")
    print("-" * 50)
    
    try:
        # Create driver
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        # Test connection
        with driver.session() as session:
            result = session.run("RETURN 'Hello Neo4j!' as message")
            record = result.single()
            
            if record:
                print("✅ CONNECTION SUCCESSFUL!")
                print(f"Message from Neo4j: {record['message']}")
                
                # Check existing data
                count_result = session.run("MATCH (n) RETURN count(n) as total")
                count_record = count_result.single()
                print(f"Total nodes in database: {count_record['total']}")
                
                # Check for User nodes
                user_result = session.run("MATCH (u:User) RETURN count(u) as users")
                user_record = user_result.single()
                print(f"Total User nodes: {user_record['users']}")
                
            else:
                print("❌ No response from database")
                
        driver.close()
        return True
        
    except Exception as e:
        print("❌ CONNECTION FAILED!")
        print(f"Error: {str(e)}")
        
        if "authentication" in str(e).lower():
            print("\n🔍 LIKELY ISSUE: Wrong username or password")
            print("Double-check your credentials in AuraDB console")
        elif "service unavailable" in str(e).lower():
            print("\n🔍 LIKELY ISSUE: Database not running or wrong URI")
            print("Check if your AuraDB instance is running")
        else:
            print(f"\n🔍 ISSUE: {str(e)}")
            
        return False

if __name__ == "__main__":
    test_connection()
