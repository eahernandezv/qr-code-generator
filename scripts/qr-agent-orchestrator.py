#!/usr/bin/env python3
"""
QR MVP Agent Orchestrator
Manages agent token lifecycle and monitors repository state.
"""

import subprocess
import json
import time
import os
import sys

TOKEN_MANAGER = '/home/hermes/qr-repo-scaffold/scripts/qr-github-token-manager.py'

class AgentOrchestrator:
    def __init__(self):
        self.agents = [f'agent-{i}' for i in range(1, 9)]
        self.state_file = '/home/hermes/.hermes/state/qr-agent-tokens.json'
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
    
    def get_token(self, agent_id):
        """Get a fresh token for an agent."""
        result = subprocess.run(
            [sys.executable, TOKEN_MANAGER, agent_id],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return None
        return json.loads(result.stdout)
    
    def rotate_all(self):
        """Rotate tokens for all active agents."""
        tokens = {}
        for agent in self.agents:
            token_info = self.get_token(agent)
            if token_info:
                tokens[agent] = {
                    'token_preview': token_info['token'][:20] + '...',
                    'expires_at': token_info['expires_at'],
                    'rotated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
                print(f"Rotated {agent}: {token_info['token'][:20]}...")
        
        with open(self.state_file, 'w') as f:
            json.dump(tokens, f, indent=2)
        
        return tokens
    
    def verify_connectivity(self):
        """Verify GitHub App connectivity."""
        result = subprocess.run(
            [sys.executable, TOKEN_MANAGER, 'verify'],
            capture_output=True, text=True
        )
        return json.loads(result.stdout) if result.returncode == 0 else None

def main():
    orch = AgentOrchestrator()
    
    if len(sys.argv) < 2:
        print("Usage: qr-agent-orchestrator.py <rotate|verify|token AGENT_ID>")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == 'rotate':
        tokens = orch.rotate_all()
        print(f"\nRotated {len(tokens)} agent tokens")
        print(f"State saved to: {orch.state_file}")
    elif cmd == 'verify':
        status = orch.verify_connectivity()
        print(json.dumps(status, indent=2))
    elif cmd == 'token' and len(sys.argv) == 3:
        agent_id = sys.argv[2]
        token_info = orch.get_token(agent_id)
        if token_info:
            print(token_info['token'])  # Print raw token for env var injection
        else:
            print("Failed to get token", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == '__main__':
    main()
