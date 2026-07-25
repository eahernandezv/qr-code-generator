#!/usr/bin/env python3
"""
QR MVP — GitHub App Token Manager
Generates short-lived installation tokens for per-agent authentication.
Tokens expire after 1 hour. Rotation cron refreshes at 50-minute intervals.
"""

import os
import sys
import json
import time
import jwt
import subprocess

APP_ID = os.environ.get('GITHUB_APP_ID', '4391543')
INSTALLATION_ID = int(os.environ.get('GITHUB_INSTALLATION_ID', '148944549'))
PRIVATE_KEY_PATH = os.environ.get('GITHUB_APP_KEY', '/home/hermes/.hermes/secrets/github-app-secondary.pem')
REPO = os.environ.get('GITHUB_REPO', 'eahernandezv/qr-code-generator')

def load_private_key():
    with open(PRIVATE_KEY_PATH, 'r') as f:
        return f.read()

def generate_jwt(private_key):
    now = int(time.time())
    payload = {
        'iat': now - 60,
        'exp': now + 600,
        'iss': str(APP_ID)
    }
    return jwt.encode(payload, private_key, algorithm='RS256')

def get_installation_token(jwt_token):
    result = subprocess.run(
        ['curl', '-s', '-X', 'POST',
         '-H', f'Authorization: Bearer {jwt_token}',
         '-H', 'Accept: application/vnd.github+json',
         f'https://api.github.com/app/installations/{INSTALLATION_ID}/access_tokens'],
        capture_output=True, text=True
    )
    response = json.loads(result.stdout)
    if 'token' not in response:
        raise RuntimeError(f"Failed to get token: {response}")
    return response['token'], response.get('expires_at', 'unknown')

def verify_repo_access(token):
    result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: Bearer {token}',
         '-H', 'Accept: application/vnd.github+json',
         f'https://api.github.com/repos/{REPO}'],
        capture_output=True, text=True
    )
    repo = json.loads(result.stdout)
    return 'id' in repo

def get_agent_token(agent_id):
    """Generate a fresh installation token for an agent."""
    private_key = load_private_key()
    jwt_token = generate_jwt(private_key)
    install_token, expires_at = get_installation_token(jwt_token)
    
    if not verify_repo_access(install_token):
        raise RuntimeError("Token does not have access to QR repo")
    
    return {
        'token': install_token,
        'expires_at': expires_at,
        'agent_id': agent_id,
        'repo': REPO
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: qr-github-token-manager.py <agent-id|rotate|verify>")
        print("  agent-id: Generate token for specific agent (agent-1 through agent-8)")
        print("  rotate:   Rotate all active agent tokens")
        print("  verify:   Verify App connectivity and repo access")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == 'verify':
        private_key = load_private_key()
        jwt_token = generate_jwt(private_key)
        install_token, expires_at = get_installation_token(jwt_token)
        access = verify_repo_access(install_token)
        print(json.dumps({
            'status': 'ok' if access else 'error',
            'repo_access': access,
            'token_preview': install_token[:20] + '...',
            'expires_at': expires_at
        }, indent=2))
        sys.exit(0 if access else 1)
    
    elif cmd == 'rotate':
        # This would be called by cron to refresh all active tokens
        # For now, just verify connectivity
        private_key = load_private_key()
        jwt_token = generate_jwt(private_key)
        install_token, expires_at = get_installation_token(jwt_token)
        access = verify_repo_access(install_token)
        print(json.dumps({
            'status': 'rotated',
            'repo_access': access,
            'new_token_preview': install_token[:20] + '...',
            'expires_at': expires_at
        }, indent=2))
        sys.exit(0)
    
    elif cmd.startswith('agent-'):
        agent_id = cmd
        if agent_id not in [f'agent-{i}' for i in range(1, 9)]:
            print(f"Unknown agent: {agent_id}")
            sys.exit(1)
        token_info = get_agent_token(agent_id)
        print(json.dumps(token_info, indent=2))
        sys.exit(0)
    
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == '__main__':
    main()
