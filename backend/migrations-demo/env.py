from alembic import context
from flask import current_app

config = context.config
metadata = current_app.extensions["migrate"].db.metadata
engine = current_app.extensions["migrate"].db.engine
with engine.connect() as connection:
    context.configure(
        connection=connection, target_metadata=metadata, render_as_batch=True
    )
    with context.begin_transaction():
        context.run_migrations()
