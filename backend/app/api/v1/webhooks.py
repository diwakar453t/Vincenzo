"""
Webhook Alert Handler — receives alerts from Alertmanager.

Processes incoming alerts and:
1. Logs alerts with structured context
2. Stores alert history in database (optional)
3. Forwards tenant-specific alerts to notification service
4. Provides alert query API for dashboard widgets
"""
import logging
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("preskool.alerts")

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# ── Alert Models ──────────────────────────────────────────────────────

class AlertLabel(BaseModel):
    alertname: str
    severity: str
    tenant_id: Optional[str] = None
    team: Optional[str] = None


class AlertAnnotation(BaseModel):
    summary: str
    description: Optional[str] = None
    runbook_url: Optional[str] = None
    dashboard_url: Optional[str] = None


class Alert(BaseModel):
    status: str  # firing | resolved
    labels: AlertLabel
    annotations: AlertAnnotation
    startsAt: str
    endsAt: Optional[str] = None
    fingerprint: str


class AlertmanagerPayload(BaseModel):
    version: str = "4"
    groupKey: str
    status: str  # firing | resolved
    receiver: str
    alerts: List[Alert]


# ── In-memory alert history (production: use DB) ─────────────────────
_alert_history: List[dict] = []
MAX_HISTORY = 500


@router.post("/alerts")
async def receive_alerts(payload: AlertmanagerPayload):
    """
    Receive alerts from Alertmanager webhook.
    Processes each alert and stores in history.
    """
    processed = 0

    for alert in payload.alerts:
        alert_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": alert.status,
            "alertname": alert.labels.alertname,
            "severity": alert.labels.severity,
            "tenant_id": alert.labels.tenant_id,
            "team": alert.labels.team,
            "summary": alert.annotations.summary,
            "description": alert.annotations.description,
            "runbook_url": alert.annotations.runbook_url,
            "starts_at": alert.startsAt,
            "ends_at": alert.endsAt,
            "fingerprint": alert.fingerprint,
            "receiver": payload.receiver,
        }

        # Log the alert
        if alert.status == "firing":
            if alert.labels.severity == "critical":
                logger.critical(
                    f"🚨 ALERT FIRING: {alert.labels.alertname} — {alert.annotations.summary}",
                    extra={"alertname": alert.labels.alertname, "severity": "critical"},
                )
            elif alert.labels.severity == "warning":
                logger.warning(
                    f"⚠️ ALERT FIRING: {alert.labels.alertname} — {alert.annotations.summary}",
                    extra={"alertname": alert.labels.alertname, "severity": "warning"},
                )
            else:
                logger.info(
                    f"ℹ️ ALERT: {alert.labels.alertname} — {alert.annotations.summary}",
                    extra={"alertname": alert.labels.alertname, "severity": "info"},
                )
        else:
            logger.info(
                f"✅ ALERT RESOLVED: {alert.labels.alertname}",
                extra={"alertname": alert.labels.alertname},
            )

        # Store in history (ring buffer)
        _alert_history.append(alert_record)
        if len(_alert_history) > MAX_HISTORY:
            _alert_history.pop(0)

        # Forward tenant-specific alerts to notification service
        if alert.labels.tenant_id and alert.status == "firing":
            await _notify_tenant(alert)

        processed += 1

    return JSONResponse(
        status_code=200,
        content={"status": "ok", "processed": processed},
    )


@router.get("/alerts/history")
async def get_alert_history(
    severity: Optional[str] = None,
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """Get recent alert history with optional filtering."""
    results = _alert_history.copy()

    if severity:
        results = [a for a in results if a["severity"] == severity]
    if tenant_id:
        results = [a for a in results if a.get("tenant_id") == tenant_id]
    if status:
        results = [a for a in results if a["status"] == status]

    # Return most recent first
    results.reverse()
    return {
        "total": len(results),
        "alerts": results[:limit],
    }


@router.get("/alerts/active")
async def get_active_alerts():
    """Get currently firing alerts (not yet resolved)."""
    # Track active alerts by fingerprint
    active = {}
    for alert in _alert_history:
        fp = alert["fingerprint"]
        if alert["status"] == "firing":
            active[fp] = alert
        elif fp in active:
            del active[fp]

    alerts = sorted(active.values(), key=lambda a: a["timestamp"], reverse=True)
    return {
        "total": len(alerts),
        "critical": sum(1 for a in alerts if a["severity"] == "critical"),
        "warning": sum(1 for a in alerts if a["severity"] == "warning"),
        "info": sum(1 for a in alerts if a["severity"] == "info"),
        "alerts": alerts,
    }


async def _notify_tenant(alert: Alert):
    """
    Forward tenant-specific alerts to the notification service.
    Creates an internal notification for the tenant admin.
    """
    try:
        # In production, this would create a Notification record
        # or send via the notification service
        logger.info(
            f"Tenant alert forwarded: {alert.labels.tenant_id} — {alert.labels.alertname}",
            extra={"tenant_id": alert.labels.tenant_id},
        )
    except Exception as e:
        logger.error(f"Failed to forward tenant alert: {e}")
