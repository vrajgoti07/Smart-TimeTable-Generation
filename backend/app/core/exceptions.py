from fastapi import HTTPException, status

class SchedulingError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(self.detail)
