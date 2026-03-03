"""
Lambda handler for file explanation generation.
Implements FR-2.1, FR-2.2, FR-2.3, FR-2.4 from requirements.
"""
import json
import os
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from urllib.parse import unquote
import boto3
from botocore.exceptions import ClientError

# Import custom libraries
import sys
sys.path.append('/opt/python')  # Lambda layer path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lib'))

from bedrock_client import BedrockClient
from vector_store import DynamoDBVectorStore
from code_processor import RepositoryProcessor


# Initialize shared resources
bedrock_client = BedrockClient()
vector_store = DynamoDBVectorStore()
dynamodb = boto3.resource('dynamodb')
repos_table = dynamodb.Table(os.environ.get('REPOSITORIES_TABLE', 'BloomWay-Repositories'))
cache_table = dynamodb.Table(os.environ.get('CACHE_TABLE', 'BloomWay-Cache'))

# Constants
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
}
CACHE_TTL_HOURS = 24


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Generate multi-level explanation for a code file.
    
    Path parameters:
        id: Repository ID
        path: File path (URL encoded)
    
    Query parameters:
        level: Explanation level (beginner/intermediate/advanced), default: intermediate
    
    Returns:
        {
            "repo_id": "uuid",
            "file_path": "src/core/api.js",
            "explanation": {
                "purpose": "string",
                "key_functions": [{"name": "string", "description": "string", "line": int}],
                "patterns": ["pattern1", "pattern2"],
                "dependencies": ["dep1", "dep2"],
                "complexity": {"lines": int, "functions": int}
            },
            "related_files": ["file1.py", "file2.py"],
            "level": "intermediate",
            "generated_at": "timestamp"
        }
    """
    try:
        # Extract parameters
        repo_id = event.get('pathParameters', {}).get('id')
        encoded_path = event.get('pathParameters', {}).get('path', '')
        file_path = unquote(encoded_path) if encoded_path else None
        
        query_params = event.get('queryStringParameters') or {}
        level = query_params.get('level', 'intermediate')
        
        if not repo_id:
            return _error_response(400, "Repository ID is required")
        
        if not file_path:
            return _error_response(400, "File path is required")
        
        if level not in ['beginner', 'intermediate', 'advanced']:
            return _error_response(400, f"Invalid level: {level}. Must be 'beginner', 'intermediate', or 'advanced'")
        
        print(f"Explaining file: {file_path} for repo_id: {repo_id}, level: {level}")
        
        # Step 1: Check cache
        cached_result = _get_cached_explanation(repo_id, file_path, level)
        if cached_result:
            print("Returning cached explanation")
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(cached_result)
            }
        
        # Step 2: Verify repository exists
        try:
            response = repos_table.get_item(Key={'repo_id': repo_id})
            if 'Item' not in response:
                return _error_response(404, f"Repository {repo_id} not found")
        except ClientError as e:
            print(f"DynamoDB error: {str(e)}")
            return _error_response(500, "Failed to retrieve repository metadata")
        
        # Step 3: Retrieve file chunks from vector store
        print(f"Retrieving chunks for file: {file_path}")
        file_chunks = vector_store.get_file_chunks(repo_id, file_path)
        
        if not file_chunks:
            return _error_response(404, f"File {file_path} not found in repository")
        
        # Step 4: Reconstruct file content from chunks
        file_content = _reconstruct_file_content(file_chunks)
        
        # Step 5: Extract file metadata
        file_metadata = _extract_file_metadata(file_content, file_path)
        
        # Step 6: Generate explanation with Bedrock
        print(f"Generating {level} explanation with Bedrock...")
        try:
            explanation = _generate_explanation(file_path, file_content, file_metadata, level)
        except Exception as e:
            print(f"Failed to generate explanation: {str(e)}")
            explanation = _generate_fallback_explanation(file_path, file_content, file_metadata)
        
        # Step 7: Identify related files
        related_files = _identify_related_files(file_path, file_content, repo_id)
        
        # Step 8: Build response
        timestamp = datetime.utcnow().isoformat() + 'Z'
        result = {
            'repo_id': repo_id,
            'file_path': file_path,
            'explanation': explanation,
            'related_files': related_files,
            'level': level,
            'generated_at': timestamp
        }
        
        # Step 9: Cache result
        _cache_explanation(repo_id, file_path, level, result)
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        print(f"Unexpected error in explain_file handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error_response(500, f"Internal server error: {str(e)}")


def _get_cached_explanation(repo_id: str, file_path: str, level: str) -> Optional[Dict[str, Any]]:
    """Retrieve cached explanation from DynamoDB."""
    try:
        cache_key = f"{repo_id}#{file_path}#{level}"
        response = cache_table.get_item(Key={'cache_key': cache_key})
        
        if 'Item' in response:
            item = response['Item']
            if 'ttl' in item and item['ttl'] > int(datetime.utcnow().timestamp()):
                return item.get('data')
        
        return None
    except Exception as e:
        print(f"Cache retrieval error: {str(e)}")
        return None


def _cache_explanation(repo_id: str, file_path: str, level: str, data: Dict[str, Any]) -> None:
    """Cache explanation result in DynamoDB."""
    try:
        cache_key = f"{repo_id}#{file_path}#{level}"
        ttl = int((datetime.utcnow() + timedelta(hours=CACHE_TTL_HOURS)).timestamp())
        
        cache_table.put_item(Item={
            'cache_key': cache_key,
            'repo_id': repo_id,
            'file_path': file_path,
            'level': level,
            'data': data,
            'ttl': ttl,
            'created_at': datetime.utcnow().isoformat() + 'Z'
        })
        
        print(f"Cached explanation for {cache_key}")
    except Exception as e:
        print(f"Cache storage error: {str(e)}")


def _reconstruct_file_content(chunks: List[Dict[str, Any]]) -> str:
    """Reconstruct file content from chunks."""
    # Sort chunks by start_line if available
    sorted_chunks = sorted(chunks, key=lambda c: c.get('metadata', {}).get('start_line', 0))
    
    # Combine content
    content_parts = [chunk['content'] for chunk in sorted_chunks]
    return '\n'.join(content_parts)


def _extract_file_metadata(content: str, file_path: str) -> Dict[str, Any]:
    """Extract metadata from file content."""
    lines = content.split('\n')
    
    # Count lines
    total_lines = len(lines)
    code_lines = sum(1 for line in lines if line.strip() and not line.strip().startswith('#') and not line.strip().startswith('//'))
    
    # Detect language
    extension = file_path.split('.')[-1] if '.' in file_path else ''
    language_map = {
        'py': 'Python',
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'jsx': 'JavaScript',
        'tsx': 'TypeScript',
        'java': 'Java',
        'go': 'Go',
        'rb': 'Ruby',
        'php': 'PHP',
        'cpp': 'C++',
        'c': 'C',
        'cs': 'C#',
        'rs': 'Rust'
    }
    language = language_map.get(extension, 'Unknown')
    
    # Extract functions/methods
    functions = _extract_functions(content, language)
    
    # Extract imports/dependencies
    dependencies = _extract_dependencies(content, language)
    
    return {
        'lines': total_lines,
        'code_lines': code_lines,
        'functions': len(functions),
        'function_list': functions,
        'language': language,
        'dependencies': dependencies
    }


def _extract_functions(content: str, language: str) -> List[Dict[str, Any]]:
    """Extract function definitions from code."""
    functions = []
    lines = content.split('\n')
    
    patterns = {
        'Python': r'^\s*def\s+(\w+)\s*\(',
        'JavaScript': r'^\s*(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()',
        'TypeScript': r'^\s*(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()',
        'Java': r'^\s*(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(',
        'Go': r'^\s*func\s+(\w+)\s*\(',
    }
    
    pattern = patterns.get(language)
    if not pattern:
        return functions
    
    for i, line in enumerate(lines, 1):
        match = re.search(pattern, line)
        if match:
            func_name = match.group(1) or match.group(2) if match.lastindex >= 2 else match.group(1)
            if func_name:
                functions.append({
                    'name': func_name,
                    'line': i,
                    'description': ''  # Will be filled by AI
                })
    
    return functions[:10]  # Limit to first 10


def _extract_dependencies(content: str, language: str) -> List[str]:
    """Extract import statements and dependencies."""
    dependencies = []
    lines = content.split('\n')
    
    patterns = {
        'Python': [r'^\s*import\s+([\w.]+)', r'^\s*from\s+([\w.]+)\s+import'],
        'JavaScript': [r'^\s*import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', r'^\s*require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'],
        'TypeScript': [r'^\s*import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', r'^\s*require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'],
        'Java': [r'^\s*import\s+([\w.]+);'],
        'Go': [r'^\s*import\s+"([^"]+)"'],
    }
    
    pattern_list = patterns.get(language, [])
    
    for line in lines:
        for pattern in pattern_list:
            match = re.search(pattern, line)
            if match:
                dep = match.group(1)
                if dep and dep not in dependencies:
                    dependencies.append(dep)
    
    return dependencies[:20]  # Limit to first 20


def _generate_explanation(file_path: str, content: str, metadata: Dict[str, Any], level: str) -> Dict[str, Any]:
    """Generate explanation using Bedrock."""
    # Build level-specific prompt
    level_prompts = {
        'beginner': """Explain this code file as if teaching a CS freshman who is just learning to program.
- Use simple terminology and avoid jargon
- Explain what the code does at a high level
- Describe the main purpose and functionality
- Keep explanations clear and accessible""",
        
        'intermediate': """Explain this code file assuming familiarity with common frameworks and programming patterns.
- Include implementation details and design patterns
- Explain how it fits into the larger system
- Describe key functions and their interactions
- Mention important dependencies and their roles""",
        
        'advanced': """Explain this code file focusing on design trade-offs, patterns, and architectural decisions.
- Analyze optimization techniques and performance considerations
- Discuss edge cases and error handling strategies
- Evaluate architectural implications and scalability
- Critique design choices and suggest alternatives"""
    }
    
    level_instruction = level_prompts.get(level, level_prompts['intermediate'])
    
    # Build context
    func_list = '\n'.join([f"- Line {f['line']}: {f['name']}()" for f in metadata['function_list'][:5]])
    dep_list = ', '.join(metadata['dependencies'][:10])
    
    prompt = f"""Analyze this {metadata['language']} file and provide a structured explanation.

File: {file_path}
Language: {metadata['language']}
Lines of code: {metadata['code_lines']}
Functions: {metadata['functions']}

Key Functions:
{func_list if func_list else 'None detected'}

Dependencies: {dep_list if dep_list else 'None detected'}

Code:
```
{content[:3000]}  
```

{level_instruction}

Respond with a JSON object with this structure:
{{
    "purpose": "Brief description of file's main purpose",
    "key_functions": [
        {{"name": "function_name", "description": "what it does", "line": line_number}}
    ],
    "patterns": ["Pattern1", "Pattern2"],
    "dependencies": ["dep1", "dep2"],
    "complexity": {{"lines": {metadata['lines']}, "functions": {metadata['functions']}}}
}}

Respond with ONLY valid JSON, no markdown formatting."""
    
    response = bedrock_client.invoke_claude(
        prompt=prompt,
        max_tokens=2048,
        temperature=0.3
    )
    
    # Parse JSON response
    try:
        if '```json' in response:
            start = response.find('```json') + 7
            end = response.find('```', start)
            json_str = response[start:end].strip()
        elif '```' in response:
            start = response.find('```') + 3
            end = response.find('```', start)
            json_str = response[start:end].strip()
        else:
            json_str = response.strip()
        
        explanation = json.loads(json_str)
        
        # Ensure all required fields
        if 'purpose' not in explanation:
            explanation['purpose'] = 'Purpose not available'
        if 'key_functions' not in explanation:
            explanation['key_functions'] = []
        if 'patterns' not in explanation:
            explanation['patterns'] = []
        if 'dependencies' not in explanation:
            explanation['dependencies'] = metadata['dependencies']
        if 'complexity' not in explanation:
            explanation['complexity'] = {'lines': metadata['lines'], 'functions': metadata['functions']}
        
        return explanation
        
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Failed to parse explanation JSON: {str(e)}")
        print(f"Response was: {response[:500]}")
        raise


def _generate_fallback_explanation(file_path: str, content: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Generate basic explanation as fallback."""
    return {
        'purpose': f"This {metadata['language']} file contains {metadata['functions']} functions across {metadata['lines']} lines.",
        'key_functions': metadata['function_list'][:5],
        'patterns': ['Standard' if metadata['language'] else 'Unknown'],
        'dependencies': metadata['dependencies'],
        'complexity': {
            'lines': metadata['lines'],
            'functions': metadata['functions']
        }
    }


def _identify_related_files(file_path: str, content: str, repo_id: str) -> List[str]:
    """Identify related files based on imports and directory."""
    related = []
    
    # Extract imported modules
    dependencies = _extract_dependencies(content, 'Python')  # Simplified
    
    # Get files in same directory
    directory = '/'.join(file_path.split('/')[:-1])
    
    # Query vector store for related files (simplified - would need better implementation)
    try:
        # Get a sample of chunks to find related files
        dummy_embedding = [0.0] * 1024
        chunks = vector_store.search(repo_id, dummy_embedding, top_k=50)
        
        seen_files = set()
        for chunk in chunks:
            chunk_file = chunk['file_path']
            if chunk_file != file_path and chunk_file not in seen_files:
                # Check if in same directory
                chunk_dir = '/'.join(chunk_file.split('/')[:-1])
                if chunk_dir == directory:
                    related.append(chunk_file)
                    seen_files.add(chunk_file)
                    if len(related) >= 5:
                        break
    except Exception as e:
        print(f"Error finding related files: {str(e)}")
    
    return related[:5]


def _error_response(status_code: int, message: str) -> Dict[str, Any]:
    """Create standardized error response."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'error': message,
            'status_code': status_code
        })
    }
