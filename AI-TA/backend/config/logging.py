"""Restrict prototype console logs to metadata, never request or exception details."""
import logging


class MetadataOnlyFilter(logging.Filter):
    def filter(self, record):
        record.msg = "Details omitted by privacy policy"
        record.args = ()
        record.exc_info = None
        record.exc_text = None
        record.stack_info = None
        return True
