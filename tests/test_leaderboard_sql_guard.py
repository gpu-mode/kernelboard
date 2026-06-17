import ast
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _function_body(module_path: str, function_name: str):
    tree = ast.parse((PROJECT_ROOT / module_path).read_text())
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == function_name:
            return node
    raise AssertionError(f"{function_name} not found in {module_path}")


def _called_name(node: ast.Call) -> str:
    func = node.func
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        return func.attr
    return ""


def _string_constants(node: ast.AST):
    for child in ast.walk(node):
        if isinstance(child, ast.Constant) and isinstance(child.value, str):
            yield child.value.upper()


def assert_no_local_ranking_sql(module_path: str, function_name: str):
    function = _function_body(module_path, function_name)
    forbidden_calls = {"execute", "executemany", "get_db_connection"}
    sql_tokens = ("SELECT ", "INSERT ", "UPDATE ", "DELETE ", "WITH ")

    calls = [
        _called_name(node)
        for node in ast.walk(function)
        if isinstance(node, ast.Call)
    ]
    assert not (set(calls) & forbidden_calls)

    sql_strings = [
        value
        for value in _string_constants(function)
        if any(value.lstrip().startswith(token) for token in sql_tokens)
    ]
    assert sql_strings == []


def test_api_leaderboard_route_delegates_rankings_to_kernelbot():
    assert_no_local_ranking_sql("kernelboard/api/leaderboard.py", "leaderboard")


def test_legacy_leaderboard_route_delegates_rankings_to_kernelbot():
    assert_no_local_ranking_sql("kernelboard/leaderboard.py", "leaderboard")
