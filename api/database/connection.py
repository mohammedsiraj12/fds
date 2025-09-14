from neo4j import GraphDatabase
from config.settings import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def get_database():
    return driver

def run_query(query: str, parameters: dict = None):
    with driver.session() as session:
        result = session.run(query, parameters or {})
        return [record.data() for record in result]
