import psutil
import time
from datetime import datetime, timezone, timedelta
from app.database import get_database

class MonitoringService:
    @staticmethod
    async def get_system_metrics():
        """
        Fetches current system metrics: CPU, RAM, and DB Latency.
        """
        # CPU Usage (interval=0.1 to get a quick sample)
        cpu_usage = psutil.cpu_percent(interval=0.1)
        
        # Memory Usage
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        # Database Latency
        db_latency = await MonitoringService.get_db_latency()
        
        return {
            "serverLoad": cpu_usage,
            "memoryUsage": memory_usage,
            "dbStatus": "Online",
            "dbLatency": f"{db_latency}ms" if db_latency is not None else "Timeout",
            "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        }

    @staticmethod
    async def get_db_latency():
        """
        Measures MongoDB latency in milliseconds.
        """
        try:
            db = get_database()
            start_time = time.time()
            # Perform a simple ping command
            await db.command('ping')
            end_time = time.time()
            return round((end_time - start_time) * 1000, 1)
        except Exception as e:
            print(f"Error measuring DB latency: {e}")
            return None

    @staticmethod
    async def save_metric_snapshot():
        """
        Saves current metrics to the database for historical tracking.
        """
        db = get_database()
        metrics = await MonitoringService.get_system_metrics()
        
        snapshot = {
            "timestamp": datetime.now(timezone.utc),
            "serverLoad": metrics["serverLoad"],
            "memoryUsage": metrics["memoryUsage"],
            "dbLatency": float(metrics["dbLatency"].replace('ms', '')) if metrics["dbLatency"] != 'Timeout' else None
        }
        
        await db.metrics.insert_one(snapshot)
        # Keep only last 1440 points (24 hours if sampled every minute)
        await db.metrics.delete_many({
            "timestamp": {"$lt": datetime.now(timezone.utc) - timedelta(days=1)}
        })

    @staticmethod
    async def get_metrics_history(limit: int = 60):
        """
        Fetches historical metrics.
        """
        db = get_database()
        cursor = db.metrics.find().sort("timestamp", -1).limit(limit)
        history = await cursor.to_list(length=limit)
        
        # Format for frontend
        return [{
            "time": h["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "serverLoad": h["serverLoad"],
            "memoryUsage": h["memoryUsage"],
            "dbLatency": h.get("dbLatency", 0)
        } for h in reversed(history)]
