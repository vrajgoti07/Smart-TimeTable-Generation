"""
Background task: Send timetable PDFs to students after generation.
Runs asynchronously so the Admin API responds immediately.
"""
import logging
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

from app.database import get_database

logger = logging.getLogger(__name__)


def _get_smtp_config():
    """Load SMTP configuration from environment."""
    load_dotenv(override=True)
    return {
        "host": (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip(),
        "port": int((os.getenv("SMTP_PORT") or "587").strip()),
        "user": (os.getenv("SMTP_USER") or "").strip(),
        "password": (os.getenv("SMTP_PASSWORD") or "").strip(),
        "from_email": (os.getenv("SMTP_FROM_EMAIL") or "").strip(),
        "from_name": (os.getenv("SMTP_FROM_NAME") or "Chronos Smart Schedule").strip(),
    }


def send_timetable_email(
    to_email: str,
    student_name: str,
    department: str,
    semester: int,
    pdf_bytes: bytes,
) -> bool:
    """Send timetable PDF to a single student."""
    cfg = _get_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        logger.warning(f"⚠️  SMTP not configured. Timetable email to {student_name} ({to_email}) skipped.")
        return False

    try:
        msg = MIMEMultipart()
        msg["Subject"] = f"Your {department} Semester {semester} Timetable - Chronos"
        msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
        msg["To"] = to_email

        # HTML body
        html_body = f"""
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">📅 Chronos Smart Schedule</h1>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 15px; color: #334155;">Hello <strong>{student_name}</strong>,</p>
                <p style="font-size: 15px; color: #334155; line-height: 1.7;">
                    Your timetable for <strong>{department} — Semester {semester}</strong> has been generated successfully.
                </p>
                <p style="font-size: 15px; color: #334155; line-height: 1.7;">
                    Please find the attached timetable PDF for your reference.
                </p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #059669;">
                        <strong>💡 Tip:</strong> You can also view your timetable anytime on the Chronos Student Portal.
                    </p>
                </div>
            </div>
            <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
                Chronos Smart Schedule System &copy; 2026
            </p>
        </div>
        """

        text_body = f"""Hello {student_name},

Your timetable for {department} Semester {semester} has been generated.

Please find the attached timetable PDF.

Regards,
Chronos Smart Schedule System"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Attach PDF
        pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
        pdf_attachment.add_header(
            "Content-Disposition",
            "attachment",
            filename=f"timetable_{department}_sem{semester}.pdf",
        )
        msg.attach(pdf_attachment)

        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.send_message(msg)

        logger.info(f"✅ Timetable email sent to {student_name} ({to_email})")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to send timetable email to {to_email}: {e}")
        return False


async def send_timetable_emails_task(department_id: str, semester: int):
    """
    Background task triggered after timetable generation.
    1. Generate PDF for the department+semester
    2. Fetch matching students
    3. Send email with PDF attachment to each student
    """
    from app.utils.pdf_generator import generate_timetable_pdf

    logger.info(f"📧 Starting email task for {department_id} Sem {semester}")

    try:
        db = get_database()

        # 1. Fetch timetable entries
        schedule_data = await db.timetable.find({
            "department_id": department_id,
            "semester": semester,
        }).to_list(length=500)

        if not schedule_data:
            logger.warning(f"No timetable data found for {department_id} Sem {semester}. Skipping emails.")
            return

        # 2. Fetch course details for PDF
        courses_doc = await db.courses.find({
            "department_id": department_id,
            "semester": semester,
        }).to_list(length=50)

        # 3. Generate PDF once (same for all students in this dept+sem)
        pdf_bytes = generate_timetable_pdf(
            schedule_data=schedule_data,
            courses_doc=courses_doc,
            department_id=department_id,
            semester=semester,
            label=f"Department Timetable",
        )

        # 4. Fetch all students matching this department + semester
        students = await db.users.find({
            "role": "Student",
            "$or": [
                {"department": department_id},
                {"department_id": department_id},
            ],
            "semester": semester,
        }).to_list(length=1000)

        if not students:
            logger.warning(f"No students found for {department_id} Sem {semester}. Skipping emails.")
            return

        logger.info(f"📬 Sending timetable to {len(students)} students in {department_id} Sem {semester}")

        # 5. Send emails
        sent = 0
        failed = 0
        for student in students:
            email = student.get("email")
            name = student.get("name", "Student")
            if email:
                success = send_timetable_email(email, name, department_id, semester, pdf_bytes)
                if success:
                    sent += 1
                else:
                    failed += 1

        logger.info(f"✅ Email task complete: {sent} sent, {failed} failed for {department_id} Sem {semester}")

    except Exception as e:
        logger.error(f"❌ Email task failed for {department_id} Sem {semester}: {e}")
