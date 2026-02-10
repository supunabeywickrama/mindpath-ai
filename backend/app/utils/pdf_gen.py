import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.routers.insights import InsightsResponse  # Import the schema

def generate_insights_pdf(data: InsightsResponse) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = styles["Title"]
    story.append(Paragraph("MindPath AI - Insights Report", title_style))
    story.append(Spacer(1, 12))

    # Period
    normal_style = styles["Normal"]
    story.append(Paragraph(f"Report for the last {data.days} days", normal_style))
    story.append(Spacer(1, 12))

    # KPI Table
    kpi_data = [
        ["Metric", "Value"],
        ["Average Mood", f"{data.mood_avg:.1f}/10" if data.mood_avg is not None else "N/A"],
        ["Mood Range", f"{data.mood_min} - {data.mood_max}" if data.mood_min is not None else "N/A"],
        ["Total Logged Moods", str(data.mood_count)],
        ["Journal Entries", str(data.journal_count)],
    ]
    t = Table(kpi_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(t)
    story.append(Spacer(1, 24))

    # Top Emotions
    story.append(Paragraph("Top Emotions", styles["Heading2"]))
    if data.top_emotions:
        text = ", ".join(data.top_emotions)
        story.append(Paragraph(text, normal_style))
    else:
        story.append(Paragraph("No emotions recorded.", normal_style))
    story.append(Spacer(1, 12))

    # Top Tags
    story.append(Paragraph("Top Tags", styles["Heading2"]))
    if data.top_tags:
        text = ", ".join(data.top_tags)
        story.append(Paragraph(text, normal_style))
    else:
        story.append(Paragraph("No tags recorded.", normal_style))
    story.append(Spacer(1, 12))

    # AI Summary
    if data.ai_summary:
        story.append(Paragraph("AI Summary", styles["Heading2"]))
        story.append(Paragraph(data.ai_summary, normal_style))
        story.append(Spacer(1, 12))

    # Suggestions
    if data.suggestions:
        story.append(Paragraph("Suggestions", styles["Heading2"]))
        for suggestion in data.suggestions:
            story.append(Paragraph(f"• {suggestion}", normal_style))
            story.append(Spacer(1, 6))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
