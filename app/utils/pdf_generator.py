"""
Reusable PDF timetable generator.
Extracts the PDF generation logic so it can be used by:
  - Student download endpoint
  - Email timetable background task
"""
from io import BytesIO
import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_timetable_pdf(
    schedule_data: list,
    courses_doc: list,
    department_id: str,
    semester: int,
    label: str = "",
    academic_year: str = "2025-26",
) -> bytes:
    """
    Generate a professional PDF timetable and return the bytes.
    
    Args:
        schedule_data: List of timetable entry dicts
        courses_doc: List of course dicts for subject mapping
        department_id: Department identifier (e.g. "AI&ML")
        semester: Semester number
        label: Optional label line (e.g. student name)
        academic_year: Academic year string
    
    Returns:
        PDF file content as bytes
    """
    course_map = {
        c["name"]: {"code": c.get("code", c["name"][:4].upper()), "full_name": c["name"]}
        for c in courses_doc
    }

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.3*inch, bottomMargin=0.3*inch)
    elements = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.black, alignment=1, spaceAfter=5)
    info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, textColor=colors.black, alignment=1, spaceAfter=2)

    # Palette
    C_GRID_HEADER = colors.HexColor("#f1f5f9")
    C_BREAK_BG = colors.HexColor("#f8fafc")
    C_FREE_TEXT = colors.HexColor("#94a3b8")

    # ── HEADER ──
    elements.append(Paragraph("CHRONOS SMART SCHEDULE", title_style))
    elements.append(Paragraph(f"Department: {department_id}  |  Academic Year: {academic_year}", info_style))
    info_line = f"Semester: {semester}"
    if label:
        info_line += f"  |  {label}"
    elements.append(Paragraph(info_line, info_style))
    elements.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%d-%m-%Y %H:%M')}", info_style))
    elements.append(Spacer(1, 0.2*inch))

    # ── TIMETABLE GRID ──
    days_full = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    days_short = ["MON", "TUE", "WED", "THU", "FRI"]
    slots = [
        ("09:10", "10:10"),
        ("10:10", "11:10"),
        ("11:10", "12:10"),  # BREAK
        ("12:10", "13:10"),
        ("13:10", "14:10"),
        ("14:10", "14:20"),  # SHORT BREAK
        ("14:20", "15:20"),
        ("15:20", "16:20"),
    ]

    header = ["HRS"] + days_short
    table_data = [header]
    bg_colors_extra = []
    spans = []

    free_style = ParagraphStyle('FreeStyle', parent=styles['Normal'], fontSize=8, textColor=C_FREE_TEXT, alignment=1)
    cell_style = ParagraphStyle('CellStyle', parent=styles['Normal'], fontSize=8, alignment=1, leading=10)

    subjects_in_use = set()

    for r_idx, (start, end) in enumerate(slots, 1):
        row = [f"{start}\n-\n{end}"]

        if start == "11:10":
            row += ["BREAK"] * 5
            bg_colors_extra.append(('BACKGROUND', (1, r_idx), (5, r_idx), C_BREAK_BG))
            spans.append(('SPAN', (1, r_idx), (5, r_idx)))
        elif start == "14:10":
            row += ["SHORT BREAK"] * 5
            bg_colors_extra.append(('BACKGROUND', (1, r_idx), (5, r_idx), C_BREAK_BG))
            spans.append(('SPAN', (1, r_idx), (5, r_idx)))
        else:
            for c_idx, day in enumerate(days_full, 1):
                matching = [
                    e for e in schedule_data
                    if (e.get("day_of_week") or "").lower() == day.lower()
                    and (e.get("start_time") or "").lstrip('0') == start.lstrip('0')
                ]
                if matching:
                    entry = matching[0]
                    subj_name = entry.get('course_name', '')
                    subjects_in_use.add(subj_name)
                    code = course_map.get(subj_name, {}).get("code", subj_name[:4].upper())
                    faculty = entry.get('faculty_name') or 'N/A'
                    room = entry.get('room_name') or 'N/A'
                    content = f"<b>{code}</b><br/>{faculty}<br/>{room}"
                    row.append(Paragraph(content, cell_style))
                else:
                    row.append(Paragraph("FREE", free_style))
        table_data.append(row)

    col_widths = [0.9*inch] + [1.6*inch] * 5
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t_style = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), C_GRID_HEADER),
        ('BACKGROUND', (0, 0), (0, -1), C_GRID_HEADER),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]
    t_style.extend(bg_colors_extra)
    t_style.extend(spans)
    t.setStyle(TableStyle(t_style))
    elements.append(t)

    # ── SUBJECT MAPPING (Page 2) ──
    elements.append(PageBreak())
    if subjects_in_use:
        elements.append(Paragraph("<b>Subjects &amp; Faculties</b>", ParagraphStyle('Sub', parent=styles['Normal'], fontSize=14, alignment=0, spaceAfter=10)))
        elements.append(Spacer(1, 0.1*inch))
        mapping_data = [["Code", "Subject Full Name", "Faculty Name"]]
        for subj in sorted(list(subjects_in_use)):
            code = course_map.get(subj, {}).get("code", subj[:4].upper())
            faculty_match = [e.get('faculty_name') for e in schedule_data if (e.get('course_name') or e.get('subject')) == subj]
            faculty = faculty_match[0] if faculty_match else "N/A"
            mapping_data.append([code, subj, faculty])
        m_table = Table(mapping_data, colWidths=[1.5*inch, 4.5*inch, 2.5*inch], repeatRows=1)
        m_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), C_GRID_HEADER),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(m_table)

    # ── SIGNATURES ──
    elements.append(Spacer(1, 0.8*inch))
    sig_data = [
        ["________________________", "________________________"],
        ["HOD Signature", "Principal Signature"],
    ]
    sig_table = Table(sig_data, colWidths=[4.25*inch, 4.25*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 1), 11),
        ('TOPPADDING', (0, 1), (-1, 1), 5),
    ]))
    elements.append(sig_table)

    elements.append(Spacer(1, 0.3*inch))
    footer_text = f"<i>Generated by Chronos Smart Schedule System on {datetime.datetime.now().strftime('%d-%m-%Y %H:%M:%S')}</i>"
    elements.append(Paragraph(footer_text, ParagraphStyle('F', fontSize=8, alignment=1, textColor=colors.grey)))

    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content
