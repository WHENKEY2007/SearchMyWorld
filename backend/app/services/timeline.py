import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.database.repository import DatabaseRepository

def _parse_filename_date(filename: str) -> Optional[Dict[str, Any]]:
    """Smart date extractor from filenames (WhatsApp images, Scanned docs, Camera files)."""
    # 1. Match YYYY-MM-DD or YYYY_MM_DD
    m1 = re.search(r"(20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])", filename)
    if m1:
        try:
            dt = datetime(int(m1.group(1)), int(m1.group(2)), int(m1.group(3)))
            return {
                "inferred_date": dt.strftime("%b %d, %Y"),
                "inferred_month": dt.strftime("%B %Y"),
                "source": "filename"
            }
        except ValueError:
            pass

    # 2. Match YYYYMMDD (e.g. Scan documents20260704_102948)
    m2 = re.search(r"(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])", filename)
    if m2:
        try:
            dt = datetime(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))
            return {
                "inferred_date": dt.strftime("%b %d, %Y"),
                "inferred_month": dt.strftime("%B %Y"),
                "source": "filename"
            }
        except ValueError:
            pass

    return None

def _format_pretty_date(date_str: Optional[str]) -> str:
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str)
        return dt.strftime("%b %d, %Y • %I:%M %p")
    except Exception:
        return str(date_str)[:16]

class TimelineService:
    @staticmethod
    def get_chronological_events(limit: int = 100, date_type: str = "modified") -> Dict[str, Any]:
        """
        Groups indexed files and digital activity chronologically.
        Supports filtering by:
          - modified: Last modified date on disk
          - created: File creation date on disk
          - indexed: Date SearchMyWorld indexed the file
        Also extracts smart inferred dates from file naming patterns.
        """
        raw_files = DatabaseRepository.get_timeline(limit=limit, date_type=date_type)
        events_by_month: Dict[str, List[Dict[str, Any]]] = {}

        for f in raw_files:
            # Pick primary date based on requested date_type
            if date_type == "created":
                date_str = f.get("created_at") or f.get("modified_at") or f.get("indexed_at")
            elif date_type == "indexed":
                date_str = f.get("indexed_at") or f.get("modified_at") or f.get("created_at")
            else: # modified (default)
                date_str = f.get("modified_at") or f.get("created_at") or f.get("indexed_at")

            month_key = "Unknown Period"
            formatted_date = ""

            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str)
                    month_key = dt.strftime("%B %Y")
                    formatted_date = dt.strftime("%b %d, %Y • %I:%M %p")
                except ValueError:
                    month_key = "Other Dates"

            # Check for smart inferred date in filename
            smart_date = _parse_filename_date(f.get("filename", ""))

            event = {
                "file_id": f["id"],
                "filename": f["filename"],
                "path": f["path"],
                "extension": f["extension"],
                "file_type": f["file_type"],
                "file_size": f["file_size"],
                "event_date": formatted_date,
                "modified_date": _format_pretty_date(f.get("modified_at")),
                "created_date": _format_pretty_date(f.get("created_at")),
                "indexed_date": _format_pretty_date(f.get("indexed_at")),
                "inferred_date": smart_date.get("inferred_date") if smart_date else None,
                "raw_date": date_str,
                "indexing_status": f.get("indexing_status", "indexed")
            }

            events_by_month.setdefault(month_key, []).append(event)

        return {
            "date_type": date_type,
            "timeline": [
                {"period": period, "items": items}
                for period, items in events_by_month.items()
            ],
            "total_items": len(raw_files)
        }

timeline_service = TimelineService()
