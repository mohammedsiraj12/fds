#!/usr/bin/env python3
"""Simple Neo4j AuraDB connection test"""

from neo4j import GraphDatabase

# Your AuraDB credentials
NEO4J_URI = "neo4j+s://4f95c4ea.databases.neo4j.io"
NEO4J_USER = "4f95c4ea"
NEO4J_PASSWORD = "D-imczhWCfIAkbOYWR-F8dK6woDv_382krdJTZsKhJc"

def test_connection():
    print("Testing Neo4j AuraDB Connection...")
    print(f"URI: {NEO4J_URI}")
    print(f"User: {NEO4J_USER}")
    print("Password: [HIDDEN]")
    print("-" * 50)
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            result = session.run("RETURN 'Hello Neo4j!' as message")
            record = result.single()
            
            if record:
                print("SUCCESS: Connected to Neo4j!")
                print(f"Message: {record['message']}")
                
                # Count nodes
                count_result = session.run("MATCH (n) RETURN count(n) as total")
                count_record = count_result.single()
                print(f"Total nodes: {count_record['total']}")
                
        driver.close()
        print("Connection test PASSED!")
        return True
        
    except Exception as e:
        print("FAILED: Could not connect!")
        print(f"Error: {str(e)}")
        
        if "authentication" in str(e).lower() or "unauthorized" in str(e).lower():
            print("\nPROBLEM: Wrong username or password!")
            print("Check your AuraDB credentials")
        elif "service unavailable" in str(e).lower():
            print("\nPROBLEM: Database not available!")
            print("Check if AuraDB instance is running")
        
        return False

if __name__ == "__main__":
    success = test_connection()
    if success:
        print("\nYour credentials are CORRECT!")
    else:
        print("\nYour credentials need to be checked!")
