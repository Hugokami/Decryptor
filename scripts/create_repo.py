import requests
import json
import sys

# User-provided tokens
tokens = [
    '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',
    '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'
]

repo_name = "Decryptor"
username = "Hugokami"

def create_repo(token):
    url = "https://api.github.com/user/repos"
    payload = {
        "name": repo_name,
        "private": True,
        "description": "Professional SVG Studio & Technical IDE (DECRYPTOR)",
        "has_issues": True,
        "has_projects": True,
        "has_wiki": True
    }
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    print(f"Attempting to create repository '{repo_name}' for user '{username}'...")
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code == 201:
        print(f"Success! Repository created at: {response.json()['clone_url']}")
        return True
    elif response.status_code == 422: # Already exists?
        print(f"Repository '{repo_name}' might already exist or name is unavailable (422).")
        return True
    else:
        print(f"Failed to create repo. Status code: {response.status_code}")
        print(response.json())
        return False

# Try first token
if not create_repo(tokens[0]):
    print("Trying second token...")
    create_repo(tokens[1])
