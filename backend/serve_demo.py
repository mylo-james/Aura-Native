"""Single-process production server and stop-aware cleanup lifecycle."""

import argparse
import signal
import threading

from waitress import create_server
from aura_demo import create_app
from aura_demo.db import atomic
from aura_demo.domain import cleanup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", choices=["127.0.0.1"], default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3111)
    parser.add_argument("--init-state", action="store_true")
    args = parser.parse_args()
    app = create_app(initialize=args.init_state)
    if args.init_state:
        print("Aura demo state initialized and migrations applied.")
        return
    stop = threading.Event()

    def cleanup_loop():
        while not stop.wait(60):
            try:
                with app.app_context(), atomic() as transaction:
                    cleanup(transaction)
            except Exception:
                app.logger.error(
                    "Scheduled demo cleanup failed; it will retry in 60 seconds."
                )

    worker = threading.Thread(
        target=cleanup_loop, name="aura-demo-cleanup", daemon=True
    )
    server = create_server(
        app,
        host=args.host,
        port=args.port,
        threads=4,
        clear_untrusted_proxy_headers=True,
    )

    def shutdown(_signal, _frame):
        stop.set()
        server.close()

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    worker.start()
    print(
        f"Aura production demo listening on http://{args.host}:{args.port}", flush=True
    )
    try:
        server.run()
    finally:
        stop.set()
        worker.join(timeout=5)
        server.close()


if __name__ == "__main__":
    main()
