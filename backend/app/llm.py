from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.openai_api_key)

def build_instructions():
    return (
        "You are MindPath Companion, a supportive wellness assistant. "
        "Be calm, non-judgmental, and concise. "
        "Do NOT present as a medical professional. "
        "If user expresses self-harm intent, encourage immediate help and local emergency services."
    )

PROMPT_EMAIL_REMINDER = """
You are MindPath Companion, a supportive wellness assistant.
The user has a reminder set: "{reminder_text}".

Write a short, friendly, and motivating email to remind them.
1. Subject line: Creative, possibly a question or something interactive/intriguing (max 10 words).
2. Body: Polite, encouraging, and brief (max 50 words).

Return the output in the following format:
Subject: <subject_line>
Body: <email_body>
"""

async def generate_reminder_email(reminder_text: str):
    """
    Generates a subject and body for a reminder email using the LLM.
    Returns (subject, body).
    """
    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": build_instructions()},
                {"role": "user", "content": PROMPT_EMAIL_REMINDER.format(reminder_text=reminder_text)}
            ]
        )
        content = completion.choices[0].message.content.strip()
        
        # Parse the output
        lines = content.splitlines()
        subject = "Reminder: " + reminder_text
        body = f"Just a reminder: {reminder_text}"
        
        current_part = None
        parsed_subject = ""
        parsed_body = []

        for line in lines:
            if line.lower().startswith("subject:"):
                # Handle "Subject: ..."
                parsed_subject = line.split(":", 1)[1].strip()
            elif line.lower().startswith("body:"):
                # Handle "Body: ..." - start collecting body lines
                current_part = "body"
                # If there's content on the same line as "Body:", add it
                body_content = line.split(":", 1)[1].strip()
                if body_content:
                    parsed_body.append(body_content)
            elif current_part == "body":
                parsed_body.append(line)
        
        if parsed_subject:
            subject = parsed_subject
        if parsed_body:
            body = "\n".join(parsed_body).strip()
            
        return subject, body

    except Exception as e:
        # Fallback in case of LLM failure
        return f"Reminder: {reminder_text}", f"Hi there,\n\nJust a reminder: {reminder_text}\n\n- MindPath AI"
