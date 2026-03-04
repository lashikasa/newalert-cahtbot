# cli.py
import requests

BASE_URL = "http://127.0.0.1:8000/query"  # Update if your FastAPI runs elsewhere

def ask_question():
    query = input("Enter your question: ")
    try:
        response = requests.get(BASE_URL, params={"q": query}, timeout=20)
        data = response.json()
    except requests.exceptions.RequestException as e:
        print("Request failed:", e)
        return
    except ValueError:
        print("Failed to decode JSON response")
        return

    print("\n--- RESULT ---")

    # Handle error
    if "error" in data:
        print("Error:", data["error"])
        return

    # Print query
    print("Query:", data.get("query"))

    # Print answer
    print("\nAnswer:\n")
    print(data.get("answer") or "No answer returned")

    # Print confidence score
    confidence = data.get("confidence")
    if confidence is not None:
        print(f"\nConfidence score: {confidence:.2f}")

    # Print sources
    sources = data.get("sources")
    if sources:
        print("\nSources:")
        for num, url in sources.items():
            print(f"[{num}] {url}")
    else:
        print("No sources returned")

if __name__ == "__main__":
    ask_question()