import pytest

from tests.direct.conftest import UserError, make_test_address


def test_max_rounds_cap(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    for i in range(32):
        contract.create_round(f"nonce-{i}", f"Round {i}", 2, 2000000000 + i, 2000001000 + i)

    assert contract.rounds_count == 32

    # 33rd round must fail
    with pytest.raises(UserError, match="Max rounds limit reached"):
        contract.create_round("nonce-33", "Round 33", 2, 2000000000, 2000001000)


def test_nonce_idempotency(contract, gl):
    admin1 = make_test_address(0x1000)
    admin2 = make_test_address(0x2000)

    gl.message.sender_address = admin1
    contract.create_round("nonce-abc", "Round A", 2, 2000000000, 2000001000)

    # Same admin cannot reuse client nonce
    with pytest.raises(UserError, match="Duplicate client nonce for sender"):
        contract.create_round("nonce-abc", "Round A Duplicate", 2, 2000000000, 2000001000)

    # Different admin can use the same nonce string without collision
    gl.message.sender_address = admin2
    r2 = contract.create_round("nonce-abc", "Round B", 2, 2000000000, 2000001000)
    assert r2 == 1


def test_participant_caps_and_duplicates(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin
    r_id = contract.create_round("nonce-1", "Round 1", 2, 2000000000, 2000001000)

    app_orcids = [
        "0000-0002-1825-0003",
        "0000-0002-1825-0011",
        "0000-0002-1825-002X",
        "0000-0002-1825-0038",
    ]
    prim_orcids = [
        "0000-0002-1825-0046",
        "0000-0002-1825-0054",
        "0000-0002-1825-0062",
        "0000-0002-1825-0070",
        "0000-0002-1825-0089",
    ]
    backup_orcids = [
        "0000-0002-1825-0097",
        "0000-0002-1825-010X",
        "0000-0002-1825-0118",
    ]

    # Add 4 applicants (Max applicants = 4)
    for i in range(4):
        contract.add_applicant(
            r_id,
            make_test_address(0x2000 + i),
            app_orcids[i],
            f"Univ {i}",
        )

    # 5th applicant fails
    with pytest.raises(UserError, match="Max applicants"):
        contract.add_applicant(
            r_id,
            make_test_address(0x2009),
            "0000-0002-1825-0126",
            "Univ Extra",
        )

    # Duplicate wallet in round
    with pytest.raises(UserError, match="Wallet already registered"):
        contract.add_reviewer(
            r_id,
            make_test_address(0x2000),  # wallet already used for applicant 0
            "0000-0002-1825-0134",
            "Harvard",
            False,
        )

    # Duplicate ORCID in round
    with pytest.raises(UserError, match="ORCID already registered"):
        contract.add_reviewer(
            r_id,
            make_test_address(0x3000),
            app_orcids[0],  # ORCID already used
            "Harvard",
            False,
        )

    # Add 5 primaries (Max primaries = 5)
    for i in range(5):
        contract.add_reviewer(
            r_id,
            make_test_address(0x3000 + i),
            prim_orcids[i],
            f"Primary Univ {i}",
            False,
        )

    # 6th primary fails
    with pytest.raises(UserError, match="Max primary reviewers"):
        contract.add_reviewer(
            r_id,
            make_test_address(0x3099),
            "0000-0002-1825-0126",
            "Primary Univ Extra",
            False,
        )

    # Add 3 backups (Max backups = 3; total = 4 + 5 + 3 = 12 participants max)
    for i in range(3):
        contract.add_reviewer(
            r_id,
            make_test_address(0x4000 + i),
            backup_orcids[i],
            f"Backup Univ {i}",
            True,
        )

    # 4th backup fails
    with pytest.raises(UserError, match="Max backup reviewers"):
        contract.add_reviewer(
            r_id,
            make_test_address(0x4099),
            "0000-0002-1825-0142",
            "Backup Extra",
            True,
        )


def test_event_pagination_and_views(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin
    r_id = contract.create_round("nonce-events", "Event Test Round", 2, 2000000000, 2000001000)

    orcids = [
        "0000-0002-1825-0003",
        "0000-0002-1825-0011",
        "0000-0002-1825-002X",
        "0000-0002-1825-0038",
        "0000-0002-1825-0046",
        "0000-0002-1825-0054",
    ]

    # Adding participants generates events
    for i in range(3):
        contract.add_applicant(r_id, make_test_address(0x2000 + i), orcids[i], f"Inst {i}")
        contract.add_reviewer(r_id, make_test_address(0x3000 + i), orcids[3 + i], f"Inst Rev {i}", False)

    # Total events: 1 (ROUND_CREATED) + 3 (APPLICANT_ADDED) + 3 (REVIEWER_ADDED) = 7
    page0 = contract.get_event_page(r_id, 0, 4)
    assert page0["total_events"] == 7
    assert len(page0["events"]) == 4
    assert page0["offset"] == 0
    assert page0["limit"] == 4
    assert page0["events"][0]["event_type"] == "ROUND_CREATED"
    assert page0["events"][0]["timestamp"] > 0

    page1 = contract.get_event_page(r_id, 4, 4)
    assert len(page1["events"]) == 3
    assert page1["offset"] == 4

    # Max page size bound
    page_oversized = contract.get_event_page(r_id, 0, 100)
    assert page_oversized["limit"] == 20
    assert len(page_oversized["events"]) == 7


def test_effective_panel_view(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin
    r_id = contract.create_round("nonce-panel-view", "Panel View Round", 2, 2000000000, 2000001000)
    contract.add_applicant(r_id, make_test_address(0x2000), "0000-0002-1825-0097", "Stanford")
    contract.add_reviewer(r_id, make_test_address(0x3000), "0000-0001-5109-3700", "MIT", False)
    contract.set_assignment(r_id, 0, 0, "")

    panel = contract.get_effective_panel(r_id)
    assert panel["round_id"] == 0
    assert panel["lifecycle"] == "DRAFT"
    assert panel["quorum"] == 2
    assert len(panel["assignments"]) == 1
    assert panel["assignments"][0]["assigned_reviewer_index"] == 255
    assert panel["assignments"][0]["status"] == "PLANNED"
