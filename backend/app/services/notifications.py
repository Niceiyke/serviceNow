import os
from app.models.models import User, Incident, Comment, IncidentStatus
from typing import List

class NotificationService:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str):
        # MOCK: In production, integrate with SendGrid, Resend, or SMTP
        print(f"--- EMAIL SENT ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print(f"------------------")

    @classmethod
    def send_welcome_email(cls, user: User):
        subject = "Welcome to ServiceNow Incident Management"
        body = f"""Hello {user.full_name or user.email},

Your account has been successfully created. You can now log in and report incidents."""
        cls.send_email(user.email, subject, body)

    @classmethod
    def send_incident_creation_notification(cls, incident: Incident, reporter: User):
        # Notify Reporter
        subject = f"Incident Created: {incident.incident_key}"
        body = f"""Hello {reporter.full_name or reporter.email},

Your incident '{incident.title}' has been created with key {incident.incident_key}. We will update you as it progresses."""
        cls.send_email(reporter.email, subject, body)

    @classmethod
    def send_status_change_notification(cls, incident: Incident, old_status: IncidentStatus, new_status: IncidentStatus):
        # Notify Reporter
        subject = f"Incident Status Updated: {incident.incident_key}"
        body = f"""Hello {incident.reporter.full_name or incident.reporter.email},

The status of your incident '{incident.title}' ({incident.incident_key}) has changed from {old_status} to {new_status}."""
        NotificationService.send_email(incident.reporter.email, subject, body)

    @classmethod
    def send_assignment_notification(cls, incident: Incident, assignee: User):
        # Notify Assignee
        subject = f"New Incident Assigned: {incident.incident_key}"
        body = f"""Hello {assignee.full_name or assignee.email},

You have been assigned to incident '{incident.title}' ({incident.incident_key}). Please review it at your earliest convenience."""
        cls.send_email(assignee.email, subject, body)

    @classmethod
    def send_new_comment_notification(cls, incident: Incident, comment: Comment, author: User):
        # Notify relevant parties (if internal, only staff/assignee, if public, reporter)
        if comment.is_internal:
            # Notify Assignee if it's not the author
            if incident.assignee and incident.assignee_id != author.id:
                subject = f"New Internal Note on {incident.incident_key}"
                body = f"A new internal note has been added to {incident.incident_key} by {author.full_name or author.email}."
                cls.send_email(incident.assignee.email, subject, body)
        else:
            # Public comment - Notify Reporter if it's not the author
            if incident.reporter_id != author.id:
                subject = f"New Comment on {incident.incident_key}"
                body = f"""Hello {incident.reporter.full_name or incident.reporter.email},

A new comment has been added to your incident '{incident.title}' ({incident.incident_key}) by {author.full_name or author.email}."""
                cls.send_email(incident.reporter.email, subject, body)
            
            # Also notify Assignee if it's not the author
            if incident.assignee and incident.assignee_id != author.id:
                subject = f"New Public Comment on {incident.incident_key}"
                body = f"A new comment has been added to {incident.incident_key} by {author.full_name or author.email}."
                cls.send_email(incident.assignee.email, subject, body)
