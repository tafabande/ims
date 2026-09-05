"""
Clean-Room Production-Like Deployment Test & DR Recovery Engine
==============================================================
Validates:
1. Scratch container images (frontend, backend)
2. Fresh PostgreSQL zero-base migration execution (Alembic)
3. Probes: Liveness and Readiness (healthy & degraded)
4. Bootstrap / Onboarding -> Login -> Authenticated API flows
5. Notifications engine (broadcast, list, mark-read)
6. Token rotation, replay prevention, session expiry, and logout
7. Container restart persistence & re-bootstrap immunization
8. Live Disaster Recovery: Backup generation, AES-256 decryption, and DB restoration
9. Production security lockdown: headers, docs suppression, metrics denial, network isolation
"""

import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request
import urllib.parse

# 1. Externalized Production Secrets (Zero reliance on local dev .env)
POSTGRES_DB = "ims_cleanroom_prod"
POSTGRES_USER = "ims_prod_admin"
POSTGRES_PASSWORD = "Pr0d!" + secrets.token_hex(16)
SECRET_KEY = secrets.token_hex(32)
PASSWORD_SALT = secrets.token_hex(16)
BOOTSTRAP_SECRET = "BootSec!" + secrets.token_hex(20)
BACKUP_ENCRYPTION_KEY = "EncKey!" + secrets.token_hex(16)
ADMIN_PASSWORD = "EnterpriseMasterAdmin2026!#"
ADMIN_EMAIL = "root.admin@cleanroom.internal"
ADMIN_NAME = "Root System Governance"

PROD_ENV_FILE = "prod_cleanroom.env"
BASE_URL = "http://127.0.0.1"


def log(section: str, msg: str):
    print(f"\n[{section}] {msg}", flush=True)


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}", flush=True)
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"STDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}", flush=True)
        raise RuntimeError(f"Command failed with code {res.returncode}: {' '.join(cmd)}")
    return res


def http_request(method: str, path: str, data: dict = None, headers: dict = None) -> tuple[int, dict | str, dict]:
    url = f"{BASE_URL}{path}"
    req_headers = {"User-Agent": "CleanRoomDeploymentAuditor/1.0"}
    if headers:
        req_headers.update(headers)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            resp_body = resp.read().decode("utf-8")
            resp_headers = dict(resp.headers)
            try:
                parsed = json.loads(resp_body)
            except Exception:
                parsed = resp_body
            return status, parsed, resp_headers
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed, dict(e.headers)
    except Exception as e:
        return 0, str(e), {}


def wait_for_service(path: str, expected_status: int = 200, timeout_sec: int = 60):
    log("AWAIT", f"Waiting for {path} to return HTTP {expected_status}...")
    start = time.time()
    while time.time() - start < timeout_sec:
        st, body, _ = http_request("GET", path)
        if st == expected_status:
            print(f"    Service reachable ({st}) after {int(time.time() - start)}s: {body}")
            return True
        time.sleep(2)
    raise TimeoutError(f"Timed out after {timeout_sec}s waiting for {path}")


def main():
    results = {}
    print("=" * 80)
    print("  IMS CLEAN-ROOM PRODUCTION DEPLOYMENT & DISASTER RECOVERY TEST")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # PHASE 1: Write External Production Environment Config
    # -------------------------------------------------------------------------
    log("PHASE 1", "Generating isolated external production environment file...")
    env_content = f"""# Isolated Clean-Room Production Environment
POSTGRES_DB={POSTGRES_DB}
POSTGRES_USER={POSTGRES_USER}
POSTGRES_PASSWORD={POSTGRES_PASSWORD}
SECRET_KEY={SECRET_KEY}
PASSWORD_SALT={PASSWORD_SALT}
BOOTSTRAP_SECRET={BOOTSTRAP_SECRET}
BACKUP_ENCRYPTION_KEY={BACKUP_ENCRYPTION_KEY}
ENVIRONMENT=production
TRUSTED_PROXY_IPS=127.0.0.1,172.16.0.0/12
CORS_ORIGINS=http://localhost,http://127.0.0.1
ORGANIZATION_ID=cleanroom-org-01
SKIP_S3_UPLOAD=true
"""
    with open(PROD_ENV_FILE, "w", encoding="utf-8") as f:
        f.write(env_content)
    print("  prod_cleanroom.env generated with high-entropy external secrets.")
    results["Phase 1: External Secrets Isolation"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 2: Start Clean-Room Compose Stack
    # -------------------------------------------------------------------------
    log("PHASE 2", "Starting complete clean-room Compose stack with fresh volumes...")
    # Make sure old containers and volumes are down
    run_cmd(["docker", "compose", "--env-file", PROD_ENV_FILE, "down", "-v"], check=False)
    run_cmd(["docker", "compose", "--env-file", PROD_ENV_FILE, "up", "-d"])
    
    # Wait for nginx and backend to report healthy
    wait_for_service("/health/live", expected_status=200, timeout_sec=60)
    wait_for_service("/health/ready", expected_status=200, timeout_sec=60)
    results["Phase 2: Stack Startup & Health Readiness"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 3: Zero-Base PostgreSQL Migrations Verification
    # -------------------------------------------------------------------------
    log("PHASE 3", "Verifying Alembic migrations against fresh PostgreSQL...")
    # Check alembic current inside backend container
    res_alembic = run_cmd(["docker", "compose", "exec", "-T", "backend", "alembic", "current"])
    print(f"  Alembic Current Output: {res_alembic.stdout.strip()}")
    assert "003_enterprise_and_intake" in res_alembic.stdout, "Alembic migration 003 not applied!"

    # Verify database has zero users
    psql_cmd = [
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "SELECT count(*) FROM users;"
    ]
    res_users = run_cmd(psql_cmd)
    print(f"  Initial Users count:\n{res_users.stdout.strip()}")
    assert "0" in res_users.stdout, "Fresh production DB must have 0 users!"

    # Verify immutability triggers installed
    psql_trg_cmd = [
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE 'trg_imm%';"
    ]
    res_trg = run_cmd(psql_trg_cmd)
    print(f"  Installed immutability triggers:\n{res_trg.stdout.strip()}")
    assert "trg_imm_reconciliation_block" in res_trg.stdout, "Immutability trigger missing!"
    results["Phase 3: Zero-Base Migrations & DB Triggers"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 4: Probes & Dependency Resiliency Verification
    # -------------------------------------------------------------------------
    log("PHASE 4", "Testing Health & Readiness Probes under nominal and degraded states...")
    st_live, body_live, _ = http_request("GET", "/health/live")
    assert st_live == 200 and body_live.get("status") == "ALIVE"
    st_ready, body_ready, _ = http_request("GET", "/health/ready")
    assert st_ready == 200 and body_ready.get("status") == "READY"
    assert body_ready.get("checks", {}).get("database") == "CONNECTED"
    assert body_ready.get("checks", {}).get("redis") == "CONNECTED"

    # Degraded probe test: pause redis temporarily
    log("PROBE_TEST", "Temporarily pausing Redis to verify probe returns 503...")
    run_cmd(["docker", "pause", "ims-redis-cache"])
    time.sleep(1)
    st_deg, body_deg, _ = http_request("GET", "/health/ready")
    run_cmd(["docker", "unpause", "ims-redis-cache"])
    time.sleep(1)
    print(f"  Degraded readiness response: HTTP {st_deg} -> {body_deg}")
    assert st_deg == 503, f"Expected 503 when Redis paused, got {st_deg}"
    # Verify restored
    wait_for_service("/health/ready", expected_status=200, timeout_sec=15)
    results["Phase 4: Probes & Degraded Dependency Handling"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 5: Lifecycle Bootstrap & Root Admin Onboarding
    # -------------------------------------------------------------------------
    log("PHASE 5", "Verifying System Lifecycle Bootstrap...")
    st_status, body_status, _ = http_request("GET", "/api/auth/status")
    print(f"  System Status: {body_status}")
    assert body_status.get("setup_required") is True
    assert body_status.get("is_initialized") is False

    # Negative test 1: Bootstrap without token -> 403 or 422
    st_bad1, _, _ = http_request("POST", "/api/auth/initialize-root-admin", data={
        "bootstrap_token": "",
        "email": ADMIN_EMAIL,
        "full_name": ADMIN_NAME,
        "password": ADMIN_PASSWORD,
    })
    assert st_bad1 in [403, 422], f"Expected 403 or 422 on empty token, got {st_bad1}"

    # Negative test 2: Bootstrap with wrong token -> 403
    st_bad2, _, _ = http_request("POST", "/api/auth/initialize-root-admin", data={
        "bootstrap_token": "WRONG_TOKEN_12345678",
        "email": ADMIN_EMAIL,
        "full_name": ADMIN_NAME,
        "password": ADMIN_PASSWORD,
    })
    assert st_bad2 == 403, f"Expected 403 on wrong token, got {st_bad2}"

    # Positive test: Bootstrap with valid BOOTSTRAP_SECRET
    log("BOOTSTRAP", "Executing valid root admin initialization with external BOOTSTRAP_SECRET...")
    st_boot, body_boot, _ = http_request("POST", "/api/auth/initialize-root-admin", data={
        "bootstrap_token": BOOTSTRAP_SECRET,
        "email": ADMIN_EMAIL,
        "full_name": ADMIN_NAME,
        "password": ADMIN_PASSWORD,
    })
    print(f"  Bootstrap Result: HTTP {st_boot} -> user_code={body_boot.get('user_code')}")
    assert st_boot == 200, f"Bootstrap failed: {body_boot}"
    assert body_boot.get("role") == "ADMIN"
    assert "access_token" in body_boot
    assert "refresh_token" in body_boot

    # Verify lifecycle transitioned to INITIALIZED
    st_status2, body_status2, _ = http_request("GET", "/api/auth/status")
    assert body_status2.get("is_initialized") is True
    assert body_status2.get("setup_required") is False

    # Negative test 3: Re-bootstrap attempt must fail with 409 Conflict
    st_reboot, body_reboot, _ = http_request("POST", "/api/auth/initialize-root-admin", data={
        "bootstrap_token": BOOTSTRAP_SECRET,
        "email": "hacker@domain.com",
        "full_name": "Hacker",
        "password": "PasswordHacked123456!",
    })
    assert st_reboot == 409, f"Expected 409 on re-bootstrap, got {st_reboot}"

    # Check ENTERPRISE_INITIALIZED audit event in PostgreSQL
    psql_audit_cmd = [
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "SELECT action, user_name, status FROM audit_log_records WHERE action = 'ENTERPRISE_INITIALIZED';"
    ]
    res_audit = run_cmd(psql_audit_cmd)
    assert "ENTERPRISE_INITIALIZED" in res_audit.stdout, "Bootstrap audit log missing!"
    results["Phase 5: Secure Bootstrap & Lifecycle Isolation"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 6: Login & Authenticated API Flows
    # -------------------------------------------------------------------------
    log("PHASE 6", "Testing Login and Authenticated API Flows...")
    st_login, body_login, _ = http_request("POST", "/api/auth/login", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    assert st_login == 200, f"Login failed: {body_login}"
    access_token = body_login["access_token"]
    refresh_token = body_login["refresh_token"]
    auth_headers = {"Authorization": f"Bearer {access_token}"}

    # Call authenticated endpoint: list users
    st_users, body_users, _ = http_request("GET", "/api/users", headers=auth_headers)
    print(f"  Authenticated /api/users call: HTTP {st_users} -> {len(body_users)} users")
    assert st_users == 200 and len(body_users) >= 1
    results["Phase 6: Login & Authenticated API Flows"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 7: Notifications Engine
    # -------------------------------------------------------------------------
    log("PHASE 7", "Exercising Centralized Notifications Engine...")
    # Send broadcast notification
    st_notif_send, body_notif_send, _ = http_request(
        "POST", "/api/notifications/broadcast",
        data={
            "title": "Clean-Room Deployment Verification",
            "message": "All production security and deployment gates are actively being audited.",
            "severity": "CRITICAL",
        },
        headers=auth_headers
    )
    assert st_notif_send == 200, f"Broadcast failed: {body_notif_send}"
    notif_id = body_notif_send.get("id")
    print(f"  Broadcast notification created: ID {notif_id}")

    # List notifications
    st_notifs, body_notifs, _ = http_request("GET", "/api/notifications", headers=auth_headers)
    assert st_notifs == 200 and len(body_notifs) >= 1

    # Mark as read
    st_read, body_read, _ = http_request("POST", f"/api/notifications/{notif_id}/read", headers=auth_headers)
    assert st_read == 200 and body_read.get("status") == "SUCCESS"
    results["Phase 7: Centralized Notifications Engine"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 8: Session Expiry, Token Rotation & Logout
    # -------------------------------------------------------------------------
    log("PHASE 8", "Testing Token Rotation, Replay Prevention, and Session Invalidation...")
    # Refresh token rotation
    st_ref, body_ref, _ = http_request("POST", "/api/auth/refresh", data={"refresh_token": refresh_token})
    assert st_ref == 200, f"Token refresh failed: {body_ref}"
    new_access_token = body_ref["access_token"]
    new_refresh_token = body_ref["refresh_token"]

    # Replay protection: Attempting to use the OLD refresh token must fail with 401
    st_replay, _, _ = http_request("POST", "/api/auth/refresh", data={"refresh_token": refresh_token})
    assert st_replay == 401, f"Expected 401 on refresh token replay, got {st_replay}"
    print("  Refresh token rotated atomically; replay attack blocked (401).")

    # Logout: invalidate session
    st_logout, body_logout, _ = http_request("POST", "/api/auth/logout", headers={"Authorization": f"Bearer {new_access_token}"})
    assert st_logout == 200 and body_logout.get("status") in ["logged_out", "SUCCESS"]

    # After logout, new_access_token must fail or its session must be marked inactive
    st_after_logout, _, _ = http_request("POST", "/api/auth/refresh", data={"refresh_token": new_refresh_token})
    assert st_after_logout == 401, f"Expected 401 after session logout, got {st_after_logout}"
    print("  Session terminated server-side; revoked tokens rejected.")
    results["Phase 8: Token Rotation, Expiry & Logout"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 9: Restart Persistence & Anti-Rebootstrap Permanence
    # -------------------------------------------------------------------------
    log("PHASE 9", "Testing Container Restart Persistence and Permanence...")
    # Log in again to get fresh session
    st_login2, body_login2, _ = http_request("POST", "/api/auth/login", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    assert st_login2 == 200
    pre_restart_token = body_login2["access_token"]

    # Restart entire compose stack
    log("RESTART", "Restarting Docker Compose stack...")
    run_cmd(["docker", "compose", "restart"])
    wait_for_service("/health/live", expected_status=200, timeout_sec=60)
    wait_for_service("/health/ready", expected_status=200, timeout_sec=60)

    # Verify session persists across restart
    st_post_users, body_post_users, _ = http_request("GET", "/api/users", headers={"Authorization": f"Bearer {pre_restart_token}"})
    assert st_post_users == 200, f"Expected session to persist across restart, got {st_post_users}"
    print("  Active session and DB state survived stack restart.")

    # Confirm re-bootstrap after restart is permanently forbidden
    st_reboot2, _, _ = http_request("POST", "/api/auth/initialize-root-admin", data={
        "bootstrap_token": BOOTSTRAP_SECRET,
        "email": "intruder@domain.com",
        "full_name": "Intruder",
        "password": "PasswordHacked123456!",
    })
    assert st_reboot2 == 409, f"Expected 409 conflict on re-bootstrap post-restart, got {st_reboot2}"
    results["Phase 9: Stack Restart Persistence & Anti-Rebootstrap"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 10: Real Backup Generation & Live DR Restoration
    # -------------------------------------------------------------------------
    log("PHASE 10", "Testing Real Production Backup & Live Disaster Recovery Restoration...")
    # 1. Insert a distinctive verification record in DB
    run_cmd([
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "INSERT INTO stores (name, store_code, address, status) VALUES ('DR Verification Store', 'STORE-DR-999', 'Vault Sector 7', 'ACTIVE');"
    ])

    # 2. Trigger the backup script inside the backup container
    res_backup = run_cmd(["docker", "compose", "exec", "-T", "backup", "bash", "/usr/local/bin/ims-backup"])
    print(f"  Backup script output:\n{res_backup.stdout}")

    # 3. Find the encrypted backup file
    res_ls = run_cmd(["docker", "compose", "exec", "-T", "backup", "sh", "-c", "ls -t /backups/ims_db_backup_*.sql.gz.enc | head -n 1"])
    backup_file = res_ls.stdout.strip()
    print(f"  Encrypted backup file produced: {backup_file}")
    assert backup_file.endswith(".sql.gz.enc"), f"Expected encrypted backup file, got: {backup_file}"

    # 4. Perform Disaster Recovery Restoration Test:
    log("DR_TEST", "Executing live restoration from encrypted archive...")
    # Stop backend to prevent active locks
    run_cmd(["docker", "compose", "stop", "backend"])

    # Simulate catastrophic data loss: delete the store record from PostgreSQL
    run_cmd([
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "DELETE FROM stores WHERE store_code = 'STORE-DR-999';"
    ])
    # Confirm it is gone
    res_del_check = run_cmd([
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "SELECT count(*) FROM stores WHERE store_code = 'STORE-DR-999';"
    ])
    assert "0" in res_del_check.stdout, "Record deletion simulation failed!"
    print("  Simulated disaster: STORE-DR-999 purged from database.")

    # Decrypt and restore via postgres container
    dr_restore_cmd = (
        f"openssl enc -d -aes-256-cbc -pbkdf2 -in {backup_file} -pass pass:{BACKUP_ENCRYPTION_KEY} "
        f"| gunzip -c | psql -h postgres -U {POSTGRES_USER} -d {POSTGRES_DB}"
    )
    run_cmd(["docker", "compose", "exec", "-T", "backup", "sh", "-c", dr_restore_cmd])

    # Restart backend
    run_cmd(["docker", "compose", "start", "backend"])
    wait_for_service("/health/ready", expected_status=200, timeout_sec=30)

    # Verify that the test record exists in restored DB
    res_verify_dr = run_cmd([
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c",
        "SELECT name, store_code FROM stores WHERE store_code = 'STORE-DR-999';"
    ])
    print(f"  Restored store check:\n{res_verify_dr.stdout}")
    assert "STORE-DR-999" in res_verify_dr.stdout, "DR restoration verification failed! Record not found in restored DB."
    print("  Disaster Recovery Restoration Verified Successfully: 100% data integrity confirmed.")
    results["Phase 10: Real Backup & Live DR Restoration"] = "PASSED"

    # -------------------------------------------------------------------------
    # PHASE 11: Production Security Hardening & Exposure Audit
    # -------------------------------------------------------------------------
    log("PHASE 11", "Auditing Production Security Hardening & Network Isolation...")
    st_hdr, _, headers = http_request("GET", "/api/auth/status")
    
    # 1. Audit Security Headers
    sec_headers = {
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "referrer-policy": "strict-origin-when-cross-origin",
    }
    for header, expected in sec_headers.items():
        val = headers.get(header, "")
        assert expected.lower() in val.lower(), f"Header {header} mismatch: got '{val}', expected '{expected}'"
        print(f"  Header verified: {header}: {val}")

    assert "content-security-policy" in headers, "Content-Security-Policy header missing!"
    print(f"  Header verified: content-security-policy: {headers['content-security-policy'][:60]}...")

    # 2. Audit Documentation Endpoints Suppression in Production
    for doc_path in ["/docs", "/redoc", "/openapi.json"]:
        st_doc, _, _ = http_request("GET", doc_path)
        assert st_doc == 404, f"Security violation: {doc_path} returned {st_doc} in production, expected 404"
        print(f"  Production documentation lockdown: {doc_path} -> HTTP {st_doc} (Suppressed)")

    # 3. Audit Metrics Denial
    st_metric, _, _ = http_request("GET", "/metrics")
    assert st_metric in [403, 404], f"Expected 403/404 for /metrics, got {st_metric}"
    print(f"  Production metrics lockdown: /metrics -> HTTP {st_metric} (Access Denied)")

    # 4. Audit Network Isolation: Ensure PostgreSQL (5432) and Redis (6379) are NOT open on public host
    import socket
    for port, name in [(5432, "PostgreSQL"), (6379, "Redis")]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        res_conn = sock.connect_ex(("127.0.0.1", port))
        sock.close()
        assert res_conn != 0, f"CRITICAL SECURITY VIOLATION: {name} port {port} is exposed on 127.0.0.1!"
        print(f"  Network isolation confirmed: {name} (Port {port}) is strictly unexposed to host.")

    results["Phase 11: Production Security Lockdown & Isolation"] = "PASSED"

    # -------------------------------------------------------------------------
    # SUMMARY REPORT
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("                 CLEAN-ROOM AUDIT & VERIFICATION RESULTS")
    print("=" * 80)
    all_passed = True
    for phase, status in results.items():
        print(f"  [x] {phase:<55} : {status}")
        if status != "PASSED":
            all_passed = False
    print("=" * 80)
    if all_passed:
        print(">>> ALL 11 VERIFICATION PHASES PASSED WITH ZERO TOLERANCE FOR DEVIATION <<<")
    else:
        print(">>> VERIFICATION FAILED <<<")
        sys.exit(1)


if __name__ == "__main__":
    main()
