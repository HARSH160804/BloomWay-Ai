"""
Lambda handler for architecture summary generation.
Implements FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-3.6 from requirements.
"""
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import boto3
from botocore.exceptions import ClientError

# Import custom libraries
import sys
sys.path.append('/opt/python')  # Lambda layer path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lib'))

from bedrock_client import BedrockClient
from vector_store import DynamoDBVectorStore


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
    Generate architecture summary and Mermaid diagram for a repository.
    
    Path parameters:
        id: Repository ID
    
    Query parameters:
        level: Analysis level (basic/intermediate/advanced), default: intermediate
    
    Returns:
        {
            "repo_id": "uuid",
            "architecture": {
                "overview": "string",
                "components": [{"name": "string", "description": "string", "files": []}],
                "patterns": ["MVC", "Microservices"],
                "data_flow": "string description",
                "entry_points": ["src/app.py", "src/index.js"]
            },
            "diagram": "flowchart TD...",
            "generated_at": "timestamp"
        }
    """
    try:
        # Extract parameters
        repo_id = event.get('pathParameters', {}).get('id')
        query_params = event.get('queryStringParameters') or {}
        level = query_params.get('level', 'intermediate')
        
        if not repo_id:
            return _error_response(400, "Repository ID is required")
        
        if level not in ['basic', 'intermediate', 'advanced']:
            return _error_response(400, f"Invalid level: {level}. Must be 'basic', 'intermediate', or 'advanced'")
        
        print(f"Generating architecture for repo_id: {repo_id}, level: {level}")
        
        # Step 1: Check cache first
        cached_result = _get_cached_architecture(repo_id, level)
        if cached_result:
            print("Returning cached architecture")
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(cached_result)
            }
        
        # Step 2: Fetch repo metadata from DynamoDB
        try:
            response = repos_table.get_item(Key={'repo_id': repo_id})
            
            if 'Item' not in response:
                return _error_response(404, f"Repository {repo_id} not found")
            
            repo_metadata = response['Item']
            
        except ClientError as e:
            print(f"DynamoDB error: {str(e)}")
            return _error_response(500, "Failed to retrieve repository metadata")
        
        # Step 3: Retrieve file summaries from vector store
        print("Retrieving file chunks from vector store...")
        file_summaries = _get_file_summaries(repo_id)
        
        # Step 4: Build context for architecture analysis
        context = _build_architecture_context(repo_metadata, file_summaries, level)
        
        # Step 5: Generate architecture analysis with Bedrock
        print("Generating architecture analysis with Bedrock...")
        try:
            architecture_json = _generate_architecture_analysis(context, level)
        except Exception as e:
            print(f"Failed to generate architecture analysis: {str(e)}")
            # Fallback to basic structure analysis
            architecture_json = _generate_fallback_architecture(repo_metadata, file_summaries)
        
        # Step 6: Generate Mermaid diagram
        print("Generating Mermaid diagram...")
        try:
            diagram = _generate_mermaid_diagram(architecture_json)
        except Exception as e:
            print(f"Failed to generate Mermaid diagram: {str(e)}")
            # Fallback to basic diagram
            diagram = _generate_fallback_diagram(repo_metadata)
        
        # Step 7: Build response
        timestamp = datetime.utcnow().isoformat() + 'Z'
        result = {
            'repo_id': repo_id,
            'architecture': architecture_json,
            'diagram': diagram,
            'generated_at': timestamp
        }
        
        # Step 8: Cache result in DynamoDB
        _cache_architecture(repo_id, level, result)
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        print(f"Unexpected error in architecture handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error_response(500, f"Internal server error: {str(e)}")


def _get_cached_architecture(repo_id: str, level: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached architecture from DynamoDB.
    
    Args:
        repo_id: Repository identifier
        level: Analysis level
        
    Returns:
        Cached result or None if not found/expired
    """
    try:
        cache_key = f"{repo_id}#{level}"
        response = cache_table.get_item(Key={'cache_key': cache_key})
        
        if 'Item' in response:
            item = response['Item']
            # Check if cache is still valid (TTL not expired)
            if 'ttl' in item and item['ttl'] > int(datetime.utcnow().timestamp()):
                return item.get('data')
        
        return None
        
    except Exception as e:
        print(f"Cache retrieval error: {str(e)}")
        return None


def _cache_architecture(repo_id: str, level: str, data: Dict[str, Any]) -> None:
    """
    Cache architecture result in DynamoDB.
    
    Args:
        repo_id: Repository identifier
        level: Analysis level
        data: Architecture data to cache
    """
    try:
        cache_key = f"{repo_id}#{level}"
        ttl = int((datetime.utcnow() + timedelta(hours=CACHE_TTL_HOURS)).timestamp())
        
        cache_table.put_item(Item={
            'cache_key': cache_key,
            'repo_id': repo_id,
            'level': level,
            'data': data,
            'ttl': ttl,
            'created_at': datetime.utcnow().isoformat() + 'Z'
        })
        
        print(f"Cached architecture for {cache_key}")
        
    except Exception as e:
        print(f"Cache storage error: {str(e)}")
        # Non-critical, continue without caching


def _get_file_summaries(repo_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve top-level file summaries from vector store.
    
    Args:
        repo_id: Repository identifier
        
    Returns:
        List of file summaries with paths and content snippets
    """
    file_summaries = []
    
    try:
        # Get all chunks for the repo (limited by vector store max)
        # Group by file_path and take first chunk of each file
        seen_files = set()
        
        # Use a dummy query to get all chunks (not ideal, but works for MVP)
        # In production, vector store should have a get_all_files method
        dummy_embedding = [0.0] * 1024  # Titan v2 dimension
        all_chunks = vector_store.search(repo_id, dummy_embedding, top_k=100)
        
        for chunk in all_chunks:
            file_path = chunk['file_path']
            if file_path not in seen_files:
                seen_files.add(file_path)
                file_summaries.append({
                    'file_path': file_path,
                    'content_preview': chunk['content'][:500],  # First 500 chars
                    'metadata': chunk.get('metadata', {})
                })
        
        print(f"Retrieved {len(file_summaries)} file summaries")
        
    except Exception as e:
        print(f"Error retrieving file summaries: {str(e)}")
    
    return file_summaries


def _build_architecture_context(
    repo_metadata: Dict[str, Any],
    file_summaries: List[Dict[str, Any]],
    level: str
) -> str:
    """
    Build context string for architecture analysis.
    
    Args:
        repo_metadata: Repository metadata from DynamoDB
        file_summaries: List of file summaries
        level: Analysis level
        
    Returns:
        Context string for Bedrock prompt
    """
    tech_stack = repo_metadata.get('tech_stack', {})
    file_count = repo_metadata.get('file_count', 0)
    
    # Build file list
    file_list = "\n".join([
        f"- {f['file_path']}: {f['content_preview'][:200]}..."
        for f in file_summaries[:30]  # Limit to 30 files
    ])
    
    context = f"""Repository Analysis Request

Level: {level}
Total Files: {file_count}
Tech Stack: {json.dumps(tech_stack, indent=2)}

Key Files and Content Previews:
{file_list}

Please analyze this repository and provide a structured architecture summary."""
    
    return context


def _generate_architecture_analysis(context: str, level: str) -> Dict[str, Any]:
    """
    Generate architecture analysis using Bedrock.
    
    Args:
        context: Context string with repo information
        level: Analysis level
        
    Returns:
        Architecture JSON structure
    """
    # Adjust system prompt based on level
    if level == 'basic':
        system_prompt = bedrock_client.ARCHITECTURE_SYSTEM_PROMPT + "\n\nProvide a high-level overview suitable for beginners. Focus on main components and simple relationships."
    elif level == 'advanced':
        system_prompt = bedrock_client.ARCHITECTURE_SYSTEM_PROMPT + "\n\nProvide an in-depth analysis including design patterns, architectural trade-offs, scalability considerations, and technical debt."
    else:
        system_prompt = bedrock_client.ARCHITECTURE_SYSTEM_PROMPT
    
    prompt = f"""{context}

Return a JSON object with this exact structure:
{{
    "overview": "Brief description of the architecture",
    "components": [
        {{
            "name": "Component name",
            "description": "What this component does",
            "files": ["file1.py", "file2.js"]
        }}
    ],
    "patterns": ["Pattern1", "Pattern2"],
    "data_flow": "Description of how data flows through the system",
    "entry_points": ["main.py", "index.js"]
}}

Respond with ONLY valid JSON, no markdown formatting."""
    
    response = bedrock_client.invoke_claude(
        prompt=prompt,
        system_prompt=system_prompt,
        max_tokens=3000,
        temperature=0.3
    )
    
    # Parse JSON from response
    try:
        # Try to extract JSON if wrapped in markdown
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
        
        architecture_json = json.loads(json_str)
        
        # Validate structure
        required_keys = ['overview', 'components', 'patterns', 'data_flow', 'entry_points']
        for key in required_keys:
            if key not in architecture_json:
                raise ValueError(f"Missing required key: {key}")
        
        return architecture_json
        
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Failed to parse architecture JSON: {str(e)}")
        print(f"Response was: {response[:500]}")
        raise


def _generate_fallback_architecture(
    repo_metadata: Dict[str, Any],
    file_summaries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generate basic architecture structure as fallback.
    
    Args:
        repo_metadata: Repository metadata
        file_summaries: List of file summaries
        
    Returns:
        Basic architecture JSON structure
    """
    tech_stack = repo_metadata.get('tech_stack', {})
    languages = tech_stack.get('languages', [])
    frameworks = tech_stack.get('frameworks', [])
    
    # Identify entry points from file names
    entry_points = []
    for f in file_summaries:
        path = f['file_path']
        if any(name in path.lower() for name in ['main', 'app', 'index', 'server']):
            entry_points.append(path)
    
    return {
        'overview': f"This repository uses {', '.join(languages)} with {', '.join(frameworks) if frameworks else 'standard libraries'}. Architecture analysis unavailable.",
        'components': [
            {
                'name': 'Core Application',
                'description': 'Main application logic',
                'files': [f['file_path'] for f in file_summaries[:5]]
            }
        ],
        'patterns': ['Standard' if not frameworks else frameworks[0]],
        'data_flow': 'Data flow analysis unavailable. Please review the codebase manually.',
        'entry_points': entry_points[:5] if entry_points else ['Unknown']
    }


def _generate_mermaid_diagram(architecture_json: Dict[str, Any]) -> str:
    """
    Generate Mermaid diagram from architecture JSON.
    
    Args:
        architecture_json: Architecture structure
        
    Returns:
        Mermaid diagram code
    """
    prompt = f"""Based on this architecture analysis, generate a Mermaid.js flowchart diagram:

{json.dumps(architecture_json, indent=2)}

Requirements:
1. Use flowchart TD (top-down) syntax
2. Show major components as nodes
3. Show relationships and data flow as edges
4. Keep it clear and readable
5. Use appropriate node shapes (rectangles for components, cylinders for databases, etc.)

Return ONLY the Mermaid code, starting with 'flowchart TD' and no markdown formatting."""
    
    response = bedrock_client.invoke_claude(
        prompt=prompt,
        max_tokens=1024,
        temperature=0.3
    )
    
    # Extract mermaid code
    if '```mermaid' in response:
        start = response.find('```mermaid') + 10
        end = response.find('```', start)
        diagram = response[start:end].strip()
    elif '```' in response:
        start = response.find('```') + 3
        end = response.find('```', start)
        diagram = response[start:end].strip()
    else:
        diagram = response.strip()
    
    # Ensure it starts with flowchart
    if not diagram.startswith('flowchart') and not diagram.startswith('graph'):
        diagram = 'flowchart TD\n' + diagram
    
    return diagram


def _generate_fallback_diagram(repo_metadata: Dict[str, Any]) -> str:
    """
    Generate basic Mermaid diagram as fallback.
    
    Args:
        repo_metadata: Repository metadata
        
    Returns:
        Basic Mermaid diagram code
    """
    tech_stack = repo_metadata.get('tech_stack', {})
    languages = tech_stack.get('languages', [])
    frameworks = tech_stack.get('frameworks', [])
    
    diagram = "flowchart TD\n"
    diagram += "    A[Application Entry Point]\n"
    
    if languages:
        for i, lang in enumerate(languages[:3]):
            diagram += f"    A --> B{i}[{lang} Components]\n"
    
    if frameworks:
        for i, fw in enumerate(frameworks[:3]):
            diagram += f"    A --> C{i}[{fw} Layer]\n"
    
    diagram += "    A --> D[Data Layer]\n"
    diagram += "    D --> E[(Storage)]\n"
    
    return diagram


def _error_response(status_code: int, message: str) -> Dict[str, Any]:
    """
    Create standardized error response.
    
    Args:
        status_code: HTTP status code
        message: Error message
        
    Returns:
        API Gateway response dict
    """
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'error': message,
            'status_code': status_code
        })
    }
