import pytest

from contracts.grant_review_recusal_graph import GrantReviewRecusalGraph, _as_address
from tests.direct.conftest import MockAddress, MockRoot, UserError, make_test_address


def test_constructor_and_upgrader(contract, gl):
    upgrader_addr = make_test_address(0x9999)
    assert contract.get_upgrader() == upgrader_addr
    assert contract.rounds_count == 0

    # Constructor with zero address must fail
    with pytest.raises(UserError, match="Upgrader cannot be zero address"):
        GrantReviewRecusalGraph(MockAddress("0x" + "0" * 40))


def test_create_round_and_authorization(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    # Valid round creation: freeze deadline 2000000000, acknowledge deadline 2000001000
    r_id = contract.create_round("nonce-1", "Cancer Research 2026", 2, 2000000000, 2000001000)
    assert r_id == 0
    assert contract.rounds_count == 1

    # Nonce lookup
    found_id = contract.get_round_id_by_nonce(admin, "nonce-1")
    assert found_id == 0

    # Nonce lookup failure for other admin or wrong nonce
    with pytest.raises(UserError, match="Round not found"):
        contract.get_round_id_by_nonce(make_test_address(0x2000), "nonce-1")

    # Readback round view
    r = contract.get_round(r_id)
    assert r["round_id"] == 0
    assert r["admin"] == admin.as_hex
    assert r["client_nonce"] == "nonce-1"
    assert len(r["title_hash"]) == 64  # SHA-256 hash
    assert r["policy_version"] == "GRRG-V1"
    assert r["quorum"] == 2
    assert r["lifecycle"] == "DRAFT"


def test_unauthorized_admin_writes(contract, gl):
    admin = make_test_address(0x1000)
    attacker = make_test_address(0x1337)
    gl.message.sender_address = admin

    r_id = contract.create_round("nonce-1", "Round 1", 2, 2000000000, 2000001000)

    # Attacker tries to add applicant
    gl.message.sender_address = attacker
    with pytest.raises(UserError, match="Unauthorized: only round admin"):
        contract.add_applicant(r_id, make_test_address(0x2000), "0000-0002-1825-0097", "Stanford")

    # Attacker tries to add reviewer
    with pytest.raises(UserError, match="Unauthorized: only round admin"):
        contract.add_reviewer(r_id, make_test_address(0x3000), "0000-0001-5109-3700", "Harvard", False)

    # Attacker tries to set assignment
    with pytest.raises(UserError, match="Unauthorized: only round admin"):
        contract.set_assignment(r_id, 0, 0, "")

    # Attacker tries to freeze round
    with pytest.raises(UserError, match="Unauthorized: only round admin"):
        contract.freeze_round(r_id)

    # Attacker tries to cancel round
    with pytest.raises(UserError, match="Unauthorized: only round admin"):
        contract.cancel_round(r_id)


def test_acknowledge_and_decline_workflow(contract, gl):
    admin = make_test_address(0x1000)
    app_wallet = make_test_address(0x2000)
    rev_wallet = make_test_address(0x3000)
    rev2_wallet = make_test_address(0x3001)
    backup_wallet = make_test_address(0x4000)

    gl.message.sender_address = admin
    r_id = contract.create_round("nonce-1", "Round 1", 2, 2000000000, 2000001000)
    contract.add_applicant(r_id, app_wallet, "0000-0002-1825-0097", "Stanford")
    contract.add_reviewer(r_id, rev_wallet, "0000-0001-5109-3700", "MIT", False)
    contract.add_reviewer(r_id, rev2_wallet, "0000-0003-0902-4386", "Harvard", False)
    contract.add_reviewer(r_id, backup_wallet, "0000-0002-1694-233X", "Oxford", True)
    contract.set_assignment(r_id, 0, 0, "2")

    # Acknowledgement cannot precede the frozen cohort/assignment.
    gl.message.sender_address = app_wallet
    with pytest.raises(UserError, match="only after the round is frozen"):
        contract.acknowledge_identity(r_id)

    # Decline before freeze fails.
    gl.message.sender_address = rev_wallet
    with pytest.raises(UserError, match="Reviewer may decline only in allowed pre-activation state"):
        contract.decline_assignment(r_id)

    # Freeze round
    gl.message.sender_address = admin
    contract.freeze_round(r_id)
    assert contract.get_round(r_id)["lifecycle"] == "FROZEN"

    # Applicant acknowledges the frozen identity.
    gl.message.sender_address = app_wallet
    contract.acknowledge_identity(r_id)
    app_part = contract.get_participant(r_id, 0, False)
    assert app_part["is_acknowledged"] is True

    # Duplicate acknowledge fails
    with pytest.raises(UserError, match="already acknowledged"):
        contract.acknowledge_identity(r_id)

    # Non-participant acknowledge fails
    gl.message.sender_address = make_test_address(0x9999)
    with pytest.raises(UserError, match="not a registered participant"):
        contract.acknowledge_identity(r_id)

    # Decline post-freeze succeeds
    gl.message.sender_address = rev_wallet
    contract.decline_assignment(r_id)
    rev_part = contract.get_participant(r_id, 0, True)
    assert rev_part["is_declined"] is True

    # Duplicate decline fails
    with pytest.raises(UserError, match="already declined"):
        contract.decline_assignment(r_id)

    # Applicant cannot decline reviewer assignment
    gl.message.sender_address = app_wallet
    with pytest.raises(UserError, match="Only registered reviewers can decline"):
        contract.decline_assignment(r_id)


def test_cancel_round_lifecycle(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin
    r_id = contract.create_round("nonce-1", "Draft Round", 2, 2000000000, 2000001000)

    # Cancel in DRAFT succeeds
    contract.cancel_round(r_id)
    assert contract.get_round(r_id)["lifecycle"] == "CANCELLED"

    # Cannot cancel already cancelled round
    with pytest.raises(UserError, match="Cannot cancel: round is not in DRAFT"):
        contract.cancel_round(r_id)


def test_close_round_lifecycle(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin
    r_id = contract.create_round("nonce-close", "Active Round", 2, 2000000000, 2000001000)

    # Closing before ACTIVE must fail
    with pytest.raises(UserError, match="Cannot close round: lifecycle must be ACTIVE"):
        contract.close_round(r_id)

    # Manually transition round to ACTIVE for state test
    r = contract.rounds[r_id]
    r.lifecycle = "ACTIVE"
    contract.rounds[r_id] = r

    # Non-admin close fails
    gl.message.sender_address = make_test_address(0x1337)
    with pytest.raises(UserError, match="Unauthorized: only round admin can close"):
        contract.close_round(r_id)

    # Admin close succeeds
    gl.message.sender_address = admin
    contract.close_round(r_id)
    assert contract.get_round(r_id)["lifecycle"] == "CLOSED"


def test_upgrade_lifecycle_and_root_code_replacement(contract, gl):
    upgrader = make_test_address(0x9999)
    attacker = make_test_address(0x1337)

    # Unauthorized caller fails
    gl.message.sender_address = attacker
    with pytest.raises(UserError, match="Unauthorized: only upgrader"):
        contract.upgrade(b"new_wasm_bytecode_v2")

    # Empty code fails
    gl.message.sender_address = upgrader
    with pytest.raises(UserError, match="New code cannot be empty"):
        contract.upgrade(b"")

    # Upgrader succeeds and modifies root code storage
    new_bytecode = b"\x00\x61\x73\x6d\x01\x00\x00\x00_test_v2"
    contract.upgrade(new_bytecode)
    root = MockRoot.get()
    assert root.code.get().get_bytes() == new_bytecode


def test_runtime_integer_address_arguments_are_normalized(gl):
    upgrader_int = 0x9999
    contract = GrantReviewRecusalGraph(upgrader_int)
    assert contract.get_upgrader() == make_test_address(upgrader_int).as_hex

    gl.message.sender_address = make_test_address(0x1000)
    round_id = contract.create_round("int-addresses", "Integer ABI Address", 2, 2000000000, 2000001000)
    contract.add_applicant(round_id, 0x2000, "0000-0002-1825-0097", "Stanford")
    contract.add_reviewer(round_id, 0x3000, "0000-0001-5109-3700", "MIT", False)
    assert contract.get_participant(round_id, 0)["wallet"] == make_test_address(0x2000).as_hex
    assert contract.get_participant(round_id, 0, True)["wallet"] == make_test_address(0x3000).as_hex


@pytest.mark.parametrize("invalid", [True, False, -1, 2**160, "not-an-address", None])
def test_invalid_runtime_address_values_fail_closed(invalid):
    with pytest.raises(UserError, match="Invalid address value"):
        _as_address(invalid)


def test_runtime_integer_address_boundaries():
    assert _as_address(0).as_hex == "0x" + "0" * 40
    assert _as_address(1).as_hex == "0x" + "0" * 39 + "1"
    assert _as_address(2**160 - 1).as_hex == "0x" + "f" * 40
    assert _as_address("0x" + "aB" * 20).as_hex == "0x" + "ab" * 20
