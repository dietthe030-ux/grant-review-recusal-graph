import sys
import types
from pathlib import Path

import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
sys.modules["tests.direct.conftest"] = sys.modules[__name__]

# -----------------------------------------------------------------------------
# Deterministic GenLayer / GenVM Test Doubles
# -----------------------------------------------------------------------------


class MockAddress:
    def __init__(self, val: str | bytes | None = None):
        if isinstance(val, MockAddress):
            self._val = val._val
        elif isinstance(val, str):
            clean = val.lower().strip()
            if not clean.startswith("0x"):
                clean = f"0x{clean}"
            if len(clean) != 42:
                raise ValueError(f"Invalid Address hex length: {len(clean)} (expected 42)")
            # verify hex chars
            int(clean, 0)
            self._val = clean
        elif isinstance(val, bytes):
            if len(val) != 20:
                raise ValueError(f"Invalid Address bytes length: {len(val)} (expected 20)")
            self._val = "0x" + val.hex()
        else:
            raise TypeError(f"Address cannot be constructed from {type(val).__name__}; hex string required")

    def to_hex(self) -> str:
        return self._val

    @property
    def as_hex(self):
        return self._val

    def __eq__(self, other):
        if other is None:
            return False
        if hasattr(other, "as_hex"):
            return self._val == other.as_hex
        if isinstance(other, str):
            clean = other.lower().strip()
            if not clean.startswith("0x"):
                clean = f"0x{clean}"
            return self._val == clean
        return False

    def __hash__(self):
        return hash(self._val)

    def __repr__(self):
        return f"Address({self._val})"


class MockU8(int):
    def __new__(cls, val):
        v = int(val)
        if not (0 <= v <= 255):
            raise ValueError(f"u8 overflow: {v}")
        return super().__new__(cls, v)


class MockU32(int):
    def __new__(cls, val):
        v = int(val)
        if not (0 <= v <= 4294967295):
            raise ValueError(f"u32 overflow: {v}")
        return super().__new__(cls, v)


class MockU64(int):
    def __new__(cls, val):
        v = int(val)
        if not (0 <= v <= 18446744073709551615):
            raise ValueError(f"u64 overflow: {v}")
        return super().__new__(cls, v)


class MockU256(int):
    def __new__(cls, val):
        v = int(val)
        if v < 0:
            raise ValueError(f"u256 underflow: {v}")
        return super().__new__(cls, v)


class MockTreeMap(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class MockDynArray(list):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class UserError(Exception):
    pass


class MockResult:
    pass


class MockReturn(MockResult):
    def __init__(self, calldata):
        self.calldata = calldata


class MockMessage:
    def __init__(self):
        self.sender_address = MockAddress("0x" + "1000".zfill(40))


class MockWebResponse:
    def __init__(self, status: int, body: bytes | str | None = None, headers: dict | None = None):
        self.status = status
        if isinstance(body, str):
            self.body = body.encode("utf-8")
        elif isinstance(body, bytes):
            self.body = body
        else:
            self.body = b""
        self.headers = headers or {}


class MockWebManager:
    def __init__(self):
        self.requests_log = []
        self.responses_map = {}
        self.default_response = MockWebResponse(200, b"{}")

    def register(self, method: str, url_prefix: str, response: MockWebResponse):
        self.responses_map[(method.upper(), url_prefix)] = response

    def clear(self):
        self.requests_log.clear()
        self.responses_map.clear()

    def request(self, url: str, method: str = "GET", body: str | bytes | None = None, headers: dict | None = None):
        record = {
            "method": method.upper(),
            "url": url,
            "body": body,
            "headers": headers or {},
        }
        self.requests_log.append(record)

        # Match exact or prefix
        for (m, prefix), resp in self.responses_map.items():
            if m == method.upper() and prefix in url:
                return resp
        return self.default_response


web_manager = MockWebManager()


class MockNondetWeb:
    def request(self, url: str, method: str = "GET", body: str | bytes | None = None, headers: dict | None = None):
        return web_manager.request(url, method, body, headers)


class MockNondet:
    def __init__(self):
        self.web = MockNondetWeb()
        self.prompts_log = []
        self.prompt_response = None

    def exec_prompt(self, prompt: str, response_format: str = "json") -> str:
        self.prompts_log.append({"prompt": prompt, "response_format": response_format})
        if self.prompt_response is not None:
            return self.prompt_response
        payload = prompt.split("<<<UNTRUSTED_EVIDENCE>>>", 1)[1].split("<<<END_UNTRUSTED_EVIDENCE>>>", 1)[0]
        evidence = __import__("json").loads(payload)
        keys = ("outcome", "consequence", "reason_code", "relationship_band", "temporal_band")
        return __import__("json").dumps({key: evidence[key] for key in keys})


class MockVM:
    def __init__(self):
        self.UserError = UserError
        self.Result = MockResult
        self.Return = MockReturn

    def run_nondet_unsafe(self, leader_fn, validator_fn=None):
        leader_output = leader_fn()
        if validator_fn is not None:
            wrapped_res = MockReturn(leader_output)
            is_valid = validator_fn(wrapped_res)
            if not is_valid:
                raise UserError("Validator rejected leader screening output")
        return leader_output


class MockContract:
    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        # Initialize storage collections from class annotations
        for base in reversed(cls.__mro__):
            if hasattr(base, "__annotations__"):
                for name, type_hint in base.__annotations__.items():
                    type_str = str(type_hint)
                    if "TreeMap" in type_str:
                        setattr(instance, name, MockTreeMap())
                    elif "DynArray" in type_str:
                        setattr(instance, name, MockDynArray())
        return instance


class MockRootCode:
    def __init__(self):
        self._bytes = bytearray()

    def clear(self):
        self._bytes.clear()

    def truncate(self):
        self._bytes.clear()

    def append(self, b):
        self._bytes.append(int(b))

    def extend(self, b_arr):
        self._bytes.extend(b_arr)

    def get_bytes(self) -> bytes:
        return bytes(self._bytes)


class MockRoot:
    _instance = None

    def __init__(self):
        self.code_holder = MockRootCode()
        self._upgraders = []

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = MockRoot()
        return cls._instance

    @property
    def code(self):
        class CodeAccessor:
            def __init__(self, holder):
                self.holder = holder

            def get(self):
                return self.holder

        return CodeAccessor(self.code_holder)

    @property
    def upgraders(self):
        class UpgradersAccessor:
            def __init__(self, holder):
                self.holder = holder

            def get(self):
                return self.holder

        return UpgradersAccessor(self._upgraders)


class MockGL:
    def __init__(self):
        self.message = MockMessage()
        self.nondet = MockNondet()
        self.vm = MockVM()
        self.storage = types.SimpleNamespace(Root=MockRoot)
        self.Contract = MockContract
        self.public = types.SimpleNamespace(
            write=lambda fn: fn,
            view=lambda fn: fn,
        )


def allow_storage(cls):
    return cls


# Setup simulated genlayer module
genlayer_mod = types.ModuleType("genlayer")
genlayer_mod.Address = MockAddress
genlayer_mod.u8 = MockU8
genlayer_mod.u32 = MockU32
genlayer_mod.u64 = MockU64
genlayer_mod.u256 = MockU256
genlayer_mod.TreeMap = MockTreeMap
genlayer_mod.DynArray = MockDynArray
genlayer_mod.allow_storage = allow_storage
genlayer_mod.gl = MockGL()

sys.modules["genlayer"] = genlayer_mod

storage_root_mod = types.ModuleType("genlayer.py.storage.root")
storage_root_mod.Root = MockRoot
sys.modules["genlayer.py.storage.root"] = storage_root_mod

# Import contract after mock injection
from contracts.grant_review_recusal_graph import (
    GrantReviewRecusalGraph,
)


def make_test_address(val: int) -> MockAddress:
    return MockAddress("0x" + f"{val:x}".zfill(40))


@pytest.fixture(autouse=True)
def reset_environment():
    web_manager.clear()
    MockRoot._instance = MockRoot()
    genlayer_mod.gl.message.sender_address = make_test_address(0x1000)
    genlayer_mod.gl.nondet.prompts_log.clear()
    genlayer_mod.gl.nondet.prompt_response = None
    yield
    web_manager.clear()


@pytest.fixture
def gl():
    return genlayer_mod.gl


@pytest.fixture
def contract(gl):
    upgrader = make_test_address(0x9999)
    gl.message.sender_address = make_test_address(0x1000)
    c = GrantReviewRecusalGraph(upgrader)
    return c
