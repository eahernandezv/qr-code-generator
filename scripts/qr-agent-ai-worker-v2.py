#!/usr/bin/env python3
"""
QR MVP — Autonomous Agent Work Loop (Codex Primary + OpenRouter Fallback)
Makes model API calls using Codex OAuth or OpenRouter fallback,
writes code, commits, and pushes to GitHub.
"""

import os
import sys
import json
import time
import subprocess
import hashlib
from datetime import datetime, timezone
from pathlib import Path

# Configuration
WORKSPACE = Path('/home/hermes/qr-workspace/workspace')
STATE_DIR = WORKSPACE / '.work-loop'
LOOP_STATE_FILE = STATE_DIR / 'loop-state.json'
AGENT_LOG = STATE_DIR / 'agent.log'
HANDOFF_FILE = Path('/home/hermes/HANDOFF.md')

REPO = 'eahernandezv/qr-code-generator'
APP_ID = os.environ.get('GITHUB_APP_ID', '4391543')
INSTALLATION_ID = int(os.environ.get('GITHUB_INSTALLATION_ID', '148944549'))
OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY', '')


def log(msg):
    ts = datetime.now(timezone.utc).isoformat()
    line = f"[{ts}] {msg}\n"
    AGENT_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(AGENT_LOG, 'a') as f:
        f.write(line)
    print(line.strip())


def load_loop_state():
    if LOOP_STATE_FILE.exists():
        return json.loads(LOOP_STATE_FILE.read_text())
    return {
        "schema_version": 1,
        "loop_id": "qr-mvp-agent",
        "objective": "Implement and test assigned QR MVP component",
        "status": "OPEN",
        "cycle": 1,
        "current_stage": "INIT",
        "active_worker": None,
        "last_action": None,
        "attempts": {},
        "stagnation_count": 0,
    }


def save_loop_state(state):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = LOOP_STATE_FILE.with_suffix('.tmp')
    tmp.write_text(json.dumps(state, indent=2))
    tmp.replace(LOOP_STATE_FILE)


def get_github_token():
    """Generate installation token."""
    import jwt
    
    key_path = '/home/hermes/.hermes/secrets/github-app-secondary.pem'
    if not os.path.exists(key_path):
        log("ERROR: GitHub App key not found")
        return None
    
    with open(key_path) as f:
        key = f.read()
    
    now = int(time.time())
    payload = {'iat': now - 60, 'exp': now + 600, 'iss': APP_ID}
    jwt_token = jwt.encode(payload, key, algorithm='RS256')
    
    result = subprocess.run(
        ['curl', '-s', '-X', 'POST',
         '-H', f'Authorization: Bearer {jwt_token}',
         '-H', 'Accept: application/vnd.github+json',
         f'https://api.github.com/app/installations/{INSTALLATION_ID}/access_tokens'],
        capture_output=True, text=True
    )
    
    data = json.loads(result.stdout)
    token = data.get('token')
    if token:
        log(f"GitHub token acquired: {token[:20]}...")
    return token


def get_codex_credentials():
    """Load Codex OAuth credentials from auth.json."""
    auth_path = Path('/home/hermes/.hermes/auth.json')
    if not auth_path.exists():
        log("No auth.json found")
        return None
    
    try:
        with open(auth_path) as f:
            data = json.load(f)
        
        pool = data.get('credential_pool', {})
        codex_creds = pool.get('openai-codex', [])
        
        if not codex_creds:
            log("No Codex credentials in auth.json")
            return None
        
        # Use highest priority (lowest number) credential
        primary = sorted(codex_creds, key=lambda c: c.get('priority', 0))[0]
        
        return {
            'access_token': primary.get('access_token'),
            'refresh_token': primary.get('refresh_token'),
            'base_url': primary.get('base_url', 'https://chatgpt.com/backend-api/codex'),
            'label': primary.get('label', 'unknown')
        }
    except Exception as e:
        log(f"Error loading auth.json: {e}")
        return None


def call_codex(prompt, max_tokens=4000):
    """Call Codex API with OAuth token."""
    creds = get_codex_credentials()
    if not creds or not creds.get('access_token'):
        log("No Codex credentials available")
        return None
    
    access_token = creds['access_token']
    base_url = creds['base_url']
    
    # Try Codex backend API
    # Codex uses a chat completions-style API
    body = json.dumps({
        'model': 'codex',
        'messages': [
            {'role': 'system', 'content': f'You are an autonomous software engineer working on the QR MVP project. Write clean, tested Python code following the project structure. Output code blocks with filenames.'},
            {'role': 'user', 'content': prompt}
        ],
        'max_tokens': max_tokens,
        'temperature': 0.7
    })
    
    result = subprocess.run(
        ['curl', '-s', '-o', '/tmp/codex-response.json', '-w', '%{http_code}',
         '-H', f'Authorization: Bearer {access_token}',
         '-H', 'Content-Type: application/json',
         '-d', body,
         f'{base_url}/chat/completions'],
        capture_output=True, text=True
    )
    
    http_code = result.stdout.strip()
    
    if http_code == '200':
        try:
            with open('/tmp/codex-response.json') as f:
                data = json.load(f)
            if 'choices' in data and data['choices']:
                return data['choices'][0]['message']['content']
        except Exception as e:
            log(f"Codex parse error: {e}")
    else:
        log(f"Codex API returned HTTP {http_code}")
        # Print first 200 chars of error
        try:
            with open('/tmp/codex-response.json') as f:
                err = f.read(200)
            log(f"Codex error: {err}")
        except:
            pass
    
    return None


def call_openrouter(prompt, max_tokens=4000):
    """Call OpenRouter API as fallback."""
    if not OPENROUTER_KEY:
        log("No OpenRouter key available")
        return None
    
    body = json.dumps({
        'model': 'anthropic/claude-sonnet-4',
        'messages': [
            {'role': 'system', 'content': f'You are an autonomous software engineer working on the QR MVP project. Write clean, tested Python code. Output code blocks with filenames.'},
            {'role': 'user', 'content': prompt}
        ],
        'max_tokens': max_tokens,
        'temperature': 0.7
    })
    
    result = subprocess.run(
        ['curl', '-s', 'https://openrouter.ai/api/v1/chat/completions',
         '-H', f'Authorization: Bearer {OPENROUTER_KEY}',
         '-H', 'Content-Type: application/json',
         '-d', body],
        capture_output=True, text=True
    )
    
    try:
        data = json.loads(result.stdout)
        if 'choices' in data and data['choices']:
            return data['choices'][0]['message']['content']
        else:
            log(f"OpenRouter error: {result.stdout[:200]}")
            return None
    except json.JSONDecodeError:
        log(f"OpenRouter parse error: {result.stdout[:200]}")
        return None


def make_model_call(prompt, max_tokens=4000):
    """Try Codex first, fall back to OpenRouter."""
    log("Attempting Codex API...")
    response = call_codex(prompt, max_tokens)
    if response:
        log("Codex API succeeded")
        return response
    
    log("Codex failed, falling back to OpenRouter...")
    response = call_openrouter(prompt, max_tokens)
    if response:
        log("OpenRouter fallback succeeded")
        return response
    
    log("Both Codex and OpenRouter failed")
    return None


def extract_code_from_response(response):
    """Extract code blocks from model response."""
    files = {}
    current_file = None
    current_content = []
    
    for line in response.split('\n'):
        if line.startswith('```') and 'python' in line.lower():
            if current_file and current_content:
                files[current_file] = '\n'.join(current_content)
            current_content = []
            parts = line.replace('```python', '').replace('```', '').strip()
            if parts and '.' in parts:
                current_file = parts
            else:
                current_file = None
        elif line.startswith('```') and current_file is not None:
            files[current_file] = '\n'.join(current_content)
            current_file = None
            current_content = []
        elif current_file is not None:
            current_content.append(line)
    
    return files


def write_code_files(files):
    """Write extracted code to workspace."""
    written = []
    for filepath, content in files.items():
        clean_path = filepath.lstrip('/')
        if '..' in clean_path:
            log(f"WARNING: Skipping path with ..: {clean_path}")
            continue
        
        full_path = WORKSPACE / clean_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content)
        written.append(str(full_path))
        log(f"Wrote: {full_path}")
    
    return written


def commit_and_push(files, token, message=None):
    """Commit changes and push to feature branch."""
    if not files:
        log("No files to commit")
        return False
    
    if not message:
        message = f"agent: update {len(files)} files"
    
    subprocess.run(
        ['git', 'remote', 'set-url', 'origin',
         f'https://x-access-token:{token}@github.com/{REPO}.git'],
        capture_output=True, cwd=WORKSPACE
    )
    
    branch_name = f"agent-auto/{int(time.time())}"
    subprocess.run(['git', 'checkout', '-b', branch_name], capture_output=True, cwd=WORKSPACE)
    
    subprocess.run(['git', 'add', '-A'], capture_output=True, cwd=WORKSPACE)
    result = subprocess.run(
        ['git', 'commit', '-m', message],
        capture_output=True, text=True, cwd=WORKSPACE
    )
    
    if result.returncode == 0:
        push = subprocess.run(
            ['git', 'push', 'origin', branch_name],
            capture_output=True, text=True, cwd=WORKSPACE
        )
        
        subprocess.run(
            ['git', 'remote', 'set-url', 'origin', f'https://github.com/{REPO}.git'],
            capture_output=True, cwd=WORKSPACE
        )
        
        if push.returncode == 0:
            log(f"Pushed to {branch_name}")
            return branch_name
        else:
            log(f"Push failed: {push.stderr[:200]}")
    else:
        log(f"Nothing to commit")
    
    return None


def main():
    log("=" * 60)
    log("Agent Work Loop Starting")
    
    state = load_loop_state()
    log(f"Status: {state['status']} | Stage: {state['current_stage']}")
    
    if state['status'] == 'COMPLETE':
        log("Loop complete — exiting")
        return 0
    
    # Stage 1: Generate code
    if state['current_stage'] in ['INIT', 'GENERATE']:
        log("Stage: GENERATE")
        state['current_stage'] = 'GENERATE'
        state['active_worker'] = 'model-generation'
        save_loop_state(state)
        
        prompt = "Generate a simple Python QR code encoder module using the qrcode library. Include tests."
        
        response = make_model_call(prompt)
        if response:
            log(f"Response: {len(response)} chars")
            files = extract_code_from_response(response)
            log(f"Extracted {len(files)} files")
            
            written = write_code_files(files)
            
            if written:
                state['last_action'] = f"wrote {len(written)} files"
                state['current_stage'] = 'COMMIT'
            else:
                state['last_action'] = 'no files extracted'
                state['stagnation_count'] += 1
        else:
            log("Model call failed")
            state['stagnation_count'] += 1
        
        save_loop_state(state)
    
    # Stage 2: Commit and push
    if state['current_stage'] == 'COMMIT':
        log("Stage: COMMIT")
        
        token = get_github_token()
        if not token:
            log("ERROR: No GitHub token")
            return 1
        
        branch = commit_and_push(
            [str(f) for f in WORKSPACE.rglob('*') if f.is_file()],
            token,
            message=f"agent: auto-generate {state.get('last_action', 'update')}"
        )
        
        if branch:
            state['current_stage'] = 'WAIT_FOR_REVIEW'
            state['last_action'] = f"pushed to {branch}"
            log("Waiting for integrator review")
        else:
            state['stagnation_count'] += 1
        
        save_loop_state(state)
    
    log("Iteration complete")
    return 0


if __name__ == '__main__':
    sys.exit(main())
