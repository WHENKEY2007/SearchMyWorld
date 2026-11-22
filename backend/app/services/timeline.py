from typing import List, Dict, Any, Optional
from datetime import datetime
from app.database.repository import DatabaseRepository

class TimelineService:
    @staticmethod
    def get_chronological_events(limit: int = 100) -> Dict[str, Any]:
        """
        Groups indexed files and digital activity chronologically.
        Distinguishes between file modified date and indexing date.
        """
        raw_files = DatabaseRepository.get_timeline(limit=limit)
        events_by_month: Dict[str, List[Dict[str, Any]]] = {}

        for f in raw_files:
            date_str = f.get("modified_at") or f.get("created_at") or f.get("indexed_at")
            month_key = "Unknown Date"
            formatted_date = ""

            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str)
                    month_key = dt.strftime("%B %Y") # e.g. "January 2026"
                    formatted_date = dt.strftime("%Y-%m-%d %H:%M")
                except ValueError:
                    month_key = "Other"

            event = {
                "file_id": f["id"],
                "filename": f["filename"],
                "path": f["path"],
                "extension": f["extension"],
                "file_type": f["file_type"],
                "file_size": f["file_size"],
                "event_date": formatted_date,
                "raw_date": date_str,
                "indexing_status": f.get("indexing_status", "indexed")
            }

            events_by_month.setdefault(month_key, []).append(event)

        return {
            "timeline": [
                {"period": period, "items": items}
                for period, items in events_by_month.items()
            ],
            "total_items": len(raw_files)
        }

timeline_service = TimelineService()
