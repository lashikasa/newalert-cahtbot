import requests

BASE_URL = "http://127.0.0.1:8000/query"

def ask_question():
    query = input("Enter your question: ")
    try:
        response = requests.get(BASE_URL, params={"q": query}, timeout=15)
        data = response.json()
    except requests.exceptions.RequestException as e:
        print("Request failed:", e)
        return
    except ValueError:
        print("Failed to decode JSON response")
        return

    print("\n--- RESULT ---")
    if "error" in data:
        print("Error:", data["error"])
    else:
        print("Query:", data.get("query"))
        print("Answer:", data.get("answer") or "No answer returned")
        sources = data.get("sources") or []
        if sources:
            print("\nSources:")
            for i, src in enumerate(sources, 1):
                print(f"{i}. {src}")
        else:
            print("No sources returned")

if __name__ == "__main__":
    ask_question()