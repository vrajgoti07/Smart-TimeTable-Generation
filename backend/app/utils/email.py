"""
Email utility for sending invite emails
Supports both Gmail SMTP and SendGrid
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

def _get_smtp_config():
    """
    Load and sanitize SMTP configuration from environment
    """
    load_dotenv(override=True)
    return {
        "host": (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip(),
        "port": int((os.getenv("SMTP_PORT") or "587").strip()),
        "user": (os.getenv("SMTP_USER") or "").strip(),
        "password": (os.getenv("SMTP_PASSWORD") or "").strip(),
        "from_email": (os.getenv("SMTP_FROM_EMAIL") or "").strip(),
        "from_name": (os.getenv("SMTP_FROM_NAME") or "Smart Timetable").strip(),
        "frontend_url": (os.getenv("FRONTEND_URL") or "http://localhost:5173").strip()
    }

def _load_template(template_name: str) -> str:
    """
    Load a template from the templates directory
    """
    template_path = BASE_DIR / "templates" / template_name
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"❌ Error loading template {template_name}: {e}")
        return ""

def _render_email(title: str, content_template: str, context: dict, preview_text: str = "") -> str:
    """
    Render the full email using base template and content template
    """
    base_template = _load_template("base_email.html")
    content_html = _load_template(content_template)
    
    # Simple string format replacement
    # Note: In a real app with Jinja2, we would use template.render(**context)
    # Here we manually replace {key} with value from context
    
    for key, value in context.items():
        # Replace {key} in content
        content_html = content_html.replace(f"{{{key}}}", str(value))
        # Also replace in preview text if needed (not implemented here for simplicity)
        
    # Inject content into base template
    full_email = base_template.replace("{content}", content_html)
    full_email = full_email.replace("{preview_text}", preview_text)
    full_email = full_email.replace("{title}", title)
    
    return full_email

def send_invite_email(to_email: str, user_name: str, invite_token: str) -> bool:
    """
    Send an invite email with password setup link
    """
    config = _get_smtp_config()
    invite_link = f"{config['frontend_url']}/set-password?token={invite_token}"
    
    # Check if SMTP is configured
    if not config['user'] or not config['password']:
        print("⚠️  SMTP not configured. Email not sent.")
        print(f"📧 To: {to_email}")
        print(f"🔗 Invite Link: {invite_link}")
        return False

    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Welcome to Smart Timetable - Set Your Password"
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email
        msg.add_header('Reply-To', config['from_email'])
        
        # Prepare Context
        context = {
            "user_name": user_name,
            "invite_link": invite_link
        }
        
        # Generate HTML
        html_body = _render_email(
            title="Welcome to Smart Timetable",
            content_template="invite_email_content.html",
            context=context,
            preview_text=f"Welcome {user_name}! Please set your password to get started."
        )
        
        # Plain text version
        text_body = f"""
        Welcome to Smart Timetable!
        
        Hi {user_name},
        
        You've been invited to join Smart Timetable. To get started, please set your password by visiting:
        
        {invite_link}
        
        This link is unique to you and will expire once you set your password.
        
        If you didn't expect this email, please ignore it.
        
        ---
        Smart Timetable - Intelligent Scheduling System
        """
        
        # Attach both versions
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email
        with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        print(f"📧 To: {to_email}")
        return False

def send_reset_email(to_email: str, user_name: str, reset_token: str) -> bool:
    """
    Send a password reset email
    """
    config = _get_smtp_config()
    
    if not config['user'] or not config['password']:
        return False
    
    try:
        reset_link = f"{config['frontend_url']}/reset-password?token={reset_token}"
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Reset Your Password - Smart Timetable"
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email
        msg.add_header('Reply-To', config['from_email'])
        
        # Prepare Context
        context = {
            "user_name": user_name,
            "reset_link": reset_link
        }
        
        # Generate HTML
        html_body = _render_email(
            title="Reset Your Password",
            content_template="reset_email_content.html",
            context=context,
            preview_text="Reset your Smart Timetable password. Value provided expires in 1 hour."
        )
        
        text_body = f"""
        Smart Timetable - Password Recovery
        
        Hi {user_name},
        
        We received a request to reset your password. Click the link below to choose a new one:
        
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you did not request this, please ignore this email.
        """
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"❌ Failed to send reset email: {str(e)}")
        return False

def send_course_assignment_email(to_email: str, user_name: str, course_name: str, course_code: str, lecture_type: str) -> bool:
    """
    Send an email notification when a faculty is assigned to a course
    """
    config = _get_smtp_config()
    
    if not config['user'] or not config['password']:
        print(f"⚠️  SMTP not configured. Course assignment email to {user_name} ({to_email}) simulated.")
        print(f"📚 Course: {course_name} ({course_code}) - {lecture_type}")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"New Course Assignment: {course_name} ({course_code})"
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email
        
        # Prepare Context
        context = {
            "user_name": user_name,
            "course_name": course_name,
            "course_code": course_code,
            "lecture_type": lecture_type,
            "dashboard_link": config['frontend_url']
        }
        
        # Generate HTML
        html_body = _render_email(
            title="Course Assigned",
            content_template="assignment_email_content.html",
            context=context,
            preview_text=f"You have been assigned to {course_name} ({course_code})."
        )
        
        text_body = f"""
        Hello Professor {user_name},
        
        You have been assigned to:
        Course: {course_name} ({course_code})
        Type: {lecture_type}
        
        Please check your portal for more details.
        """
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"❌ Failed to send assignment email: {str(e)}")
        return False

def send_password_change_email(to_email: str, user_name: str, timestamp: str) -> bool:
    """
    Send an email notification when a user changes their password
    """
    config = _get_smtp_config()
    
    if not config['user'] or not config['password']:
        print(f"⚠️  SMTP not configured. Password change email to {user_name} ({to_email}) simulated.")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Password Changed - Chronos Smart Schedule"
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email
        
        # Dynamic HTML content that fits into base_email.html's {content}
        content_html = f"""
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">Password Changed</h2>
        <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.7;">
            Hi <strong style="color: #0f172a;">{{user_name}}</strong>,
        </p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7;">
            This is a confirmation that the password for your <strong style="color: #0f172a;">Smart Timetable</strong>
            account was successfully changed on {{timestamp}}.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
            <tr>
                <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px;">
                    <p style="margin: 0; font-size: 13px; color: #059669; line-height: 1.6;">
                        <strong>&#128274; Security Note:</strong> If you did not make this change, please contact support immediately.
                    </p>
                </td>
            </tr>
        </table>
        """
        
        base_template = _load_template("base_email.html")
        html_body = base_template.replace("{content}", content_html)
        html_body = html_body.replace("{preview_text}", "Your password was recently changed.")
        html_body = html_body.replace("{title}", "Password Changed")
        
        text_body = f"Hello {{user_name}},\n\nYour password was successfully changed on {{timestamp}}.\nIf you did not make this change, please contact support immediately."
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"❌ Failed to send password change email: {str(e)}")
        return False

def send_delete_account_email(to_email: str, user_name: str, timestamp: str) -> bool:
    """
    Send an email notification when a user deletes their account
    """
    config = _get_smtp_config()
    
    if not config['user'] or not config['password']:
        print(f"⚠️  SMTP not configured. Delete account email to {user_name} ({to_email}) simulated.")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Account Deleted - Chronos Smart Schedule"
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email
        
        # Dynamic HTML content that fits into base_email.html's {content}
        content_html = f"""
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">Account Deleted</h2>
        <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.7;">
            Hi <strong style="color: #0f172a;">{{user_name}}</strong>,
        </p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7;">
            We're sorry to see you go! Your <strong style="color: #0f172a;">Smart Timetable</strong>
            account and all associated data were successfully deleted on {{timestamp}}.
        </p>
        """
        
        base_template = _load_template("base_email.html")
        html_body = base_template.replace("{content}", content_html)
        html_body = html_body.replace("{preview_text}", "Your account has been deleted.")
        html_body = html_body.replace("{title}", "Account Deleted")
        
        text_body = f"Hello {{user_name}},\n\nYour account and all associated data were successfully deleted on {{timestamp}}.\nWe're sorry to see you go!"
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"❌ Failed to send delete account email: {str(e)}")
        return False
