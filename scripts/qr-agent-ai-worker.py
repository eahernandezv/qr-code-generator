#!/usr/bin/env python3
"""
QR MVP — Autonomous Agent Work Loop
Makes direct model API calls, writes code, commits, and pushes to GitHub.
Runs as a bounded, observable work loop with state recovery.
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

# Load handoff
HANDOFF = HANDOFF_FILE.read_text() if HANDOFF_FILE.exists() else "No handoff found"


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
    """Generate installation token via token manager script."""
    result = subprocess.run(
        [sys.executable, str(WORKSPACE / 'scripts' / 'qr-github-token-manager.py'), 'verify'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        data = json.loads(result.stdout)
        token = data.get('token_preview', '').replace('...', '')
        # Actually get the full token
        result2 = subprocess.run(
            [sys.executable, str(WORKSPACE / 'scripts' / 'qr-github-token-manager.py'), 'verify'],
            capture_output=True, text=True
        )
        data2 = json.loads(result2.stdout)
        # Need to get actual token, not preview
        # Use the raw token manager method
        return _get_raw_token()
    return None


def _get_raw_token():
    """Get raw installation token."""
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
        log(f"GitHub token: {token[:20]}...")
    return token


def make_model_call(prompt, max_tokens=4000):
    """Call OpenRouter API for code generation."""
    if not OPENROUTER_KEY:
        log("ERROR: OPENROUTER_API_KEY not set")
        return None
    
    headers = {
        'Authorization': f'Bearer {OPENROUTER_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/eahernandezv/qr-code-generator',
        'X-Title': 'QR-MVP-Agent'
    }
    
    body = json.dumps({
        'model': 'openrouter/auto',  # Use auto-routing for best model
        'messages': [
            {'role': 'system', 'content': f'You are an autonomous software engineer working on the QR MVP project.\n\nYour handoff packet:\n{HANDOFF}\n\nRules:\n1. Write clean, tested Python code\n2. Follow the project structure\n3. Do NOT modify files outside your owned directories\n4. Always include tests\n5. Use docstrings and type hints\n\nRespond ONLY with code and brief explanations. Output code blocks with filenames.'},
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
            log(f"Model API error: {result.stdout[:200]}")
            return None
    except json.JSONDecodeError:
        log(f"Model API parse error: {result.stdout[:200]}")
        return None


def extract_code_from_response(response):
    """Extract code blocks from model response."""
    files = {}
    current_file = None
    current_content = []
    
    for line in response.split('\n'):
        if line.startswith('```') and 'python' in line.lower():
            # Try to find filename before code block
            if current_file and current_content:
                files[current_file] = '\n'.join(current_content)
            current_content = []
            # Check if filename is in the same line
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
    
    # Also check for explicit file markers like "# File: path" or "--- FILE: path"
    return files


def write_code_files(files):
    """Write extracted code to workspace."""
    written = []
    for filepath, content in files.items():
        # Sanitize path to stay within workspace
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
    
    # Set remote with token
    subprocess.run(
        ['git', 'remote', 'set-url', 'origin',
         f'https://x-access-token:{token}@github.com/{REPO}.git'],
        capture_output=True, cwd=WORKSPACE
    )
    
    # Create branch
    branch_name = f"agent-auto/{int(time.time())}"
    subprocess.run(['git', 'checkout', '-b', branch_name], capture_output=True, cwd=WORKSPACE)
    
    # Add, commit, push
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
        
        # Clean up remote URL
        subprocess.run(
            ['git', 'remote', 'set-url', 'origin', f'https://github.com/{REPO}.git'],
            capture_output=True, cwd=WORKSPACE
        )
        
        if push.returncode == 0:
            log(f"✅ Pushed to {branch_name}")
            return branch_name
        else:
            log(f"Push failed: {push.stderr[:200]}")
    else:
        log(f"Nothing to commit or commit failed")
    
    return None


def main():
    log("=" * 60)
    log("Agent Work Loop Starting")
    log(f"Handoff: {HANDOFF_FILE.exists()}")
    log(f"OpenRouter key: {'set' if OPENROUTER_KEY else 'MISSING'}")
    
    state = load_loop_state()
    log(f"Loop status: {state['status']}")
    log(f"Current stage: {state['current_stage']}")
    
    if state['status'] == 'COMPLETE':
        log("Loop complete — exiting")
        return 0
    
    # Stage 1: Generate code
    if state['current_stage'] in ['INIT', 'GENERATE']:
        log("Stage: GENERATE — calling model")
        state['current_stage'] = 'GENERATE'
        state['active_worker'] = 'model-generation'
        save_loop_state(state)
        
        prompt = f"""Based on your handoff, implement the next task for your stage.

Current workspace state:
- Files present: {list(WORKSPACE.rglob('*.py'))[:10]}
- Stage: {state.get('current_stage', 'unknown')}

Your task: {state['objective']}

Generate the necessary Python modules with:
1. Implementation code
2. Unit tests
3. Clear docstrings

Output files in the format:
```python path/to/file.py
<code>
```
"""
        
        response = make_model_call(prompt)
        if response:
            log(f"Model response length: {len(response)} chars")
            files = extract_code_from_response(response)
            log(f"Extracted {len(files)} files")
            
            written = write_code_files(files)
            
            if written:
                state['last_action'] = f"wrote {len(written)} files"
                state['current_stage'] = 'COMMIT'
            else:
                state['last_action'] = 'no files extracted'
                state['stagnation_count'] += 1
            
            save_loop_state(state)
        else:
            log("Model call returned no response")
            state['stagnation_count'] += 1
            save_loop_state(state)
            return 1
    
    # Stage 2: Commit and push
    if state['current_stage'] == 'COMMIT':
        log("Stage: COMMIT — pushing changes")
        
        token = _get_raw_token()
        if not token:
            log("ERROR: Could not get GitHub token")
            return 1
        
        branch = commit_and_push(
            [str(f) for f in WORKSPACE.rglob('*') if f.is_file()],
            token,
            message=f"agent-{state['loop_id']}: auto-generate {state.get('last_action', 'update')}"
        )
        
        if branch:
            state['current_stage'] = 'WAIT_FOR_REVIEW'
            state['last_action'] = f"pushed to {branch}"
            # After push, pause until integrator merges
            log("Waiting for integrator review — pausing work loop")
        else:
            state['stagnation_count'] += 1
        
        save_loop_state(state)
    
    # Stage 3: Wait
    if state['current_stage'] == 'WAIT_FOR_REVIEW':
        log("Stage: WAIT_FOR_REVIEW — checking PR status")
        # In future: poll GitHub API for PR merge status
        # For now, manual advance by integrator
        log("Sleep until next cycle")
    
    log("Work loop iteration complete")
    return 0


if __name__ == '__main__':
    sys.exit(main())
