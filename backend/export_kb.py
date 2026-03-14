import sqlite3

# Connect to your local database
conn = sqlite3.connect("deltabox.db")
cursor = conn.cursor()

# Fetch all articles
cursor.execute("SELECT title, description, content_body, creator FROM articles")
articles = cursor.fetchall()

# Open a text file to write the data
with open("knowledge_export.txt", "w", encoding="utf-8") as f:
    f.write("DELTA BOX KNOWLEDGE BASE DOCUMENTATION\n")
    f.write("======================================\n\n")
    
    for article in articles:
        title, desc, body, creator = article
        
        # Format clearly for the AI
        f.write(f"TITLE: {title}\n")
        f.write(f"AUTHOR: {creator}\n")
        f.write(f"SUMMARY: {desc}\n")
        f.write(f"CONTENT:\n{body}\n")
        f.write("\n--------------------------------------\n\n")

print(f"Successfully exported {len(articles)} articles to 'knowledge_export.txt'.")
print("Now upload this file to Chatling > Data Sources.")

conn.close()