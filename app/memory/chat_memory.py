chat_history = []

def add_message(role, text):

    chat_history.append({
        "role": role,
        "text": text
    })

    if len(chat_history) > 10:
        chat_history.pop(0)

def get_context():

    context = ""

    for msg in chat_history:
        context += f"{msg['role']}: {msg['text']}\n"

    return context