import json

import pytest

from tests.direct.conftest import (
    MockWebResponse,
    UserError,
    make_test_address,
    web_manager,
)


def _setup_clean_sources_for_all(orcids: list[str]):
    for orcid in orcids:
        data = {
            "orcid-identifier": {"path": orcid},
            "history": {"last-modified-date": {"value": 1700000000000}},
            "activities-summary": {"employments": {"affiliation-group": []}},
        }
        web_manager.register("GET", f"pub.orcid.org/v3.0/{orcid}/record", MockWebResponse(200, json.dumps(data)))
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": []}})))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(200, json.dumps({"results": []})))


def _acknowledge_all(contract, gl, wallets):
    for wallet in wallets:
        gl.message.sender_address = wallet
        contract.acknowledge_identity(0)
    gl.message.sender_address = make_test_address(0x1000)


def test_finalize_and_activate_happy_path(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    # Create round: Quorum 2, 2 applicants, 2 primaries
    r_id = contract.create_round("nonce-fin-1", "Cancer Panel 2026", 2, 2000000000, 2000001000)

    app0 = "0000-0002-1825-0097"
    app1 = "0000-0001-5109-3700"
    rev0 = "0000-0002-1694-233X"
    rev1 = "0000-0003-0902-4386"

    contract.add_applicant(r_id, make_test_address(0x2000), app0, "Stanford")
    contract.add_applicant(r_id, make_test_address(0x2001), app1, "Harvard")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0, "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1, "Oxford", False)

    contract.set_assignment(r_id, 0, 0, "")
    contract.set_assignment(r_id, 1, 1, "")
    contract.freeze_round(r_id)
    _acknowledge_all(
        contract,
        gl,
        [make_test_address(0x2000), make_test_address(0x2001), make_test_address(0x3000), make_test_address(0x3001)],
    )

    _setup_clean_sources_for_all([app0, app1, rev0, rev1])

    # Screen both pairs
    contract.screen_pair(r_id, 0, 0)
    contract.screen_pair(r_id, 1, 1)

    # Finalize screening -> derives READY
    contract.finalize_screening(r_id)
    assert contract.get_round(r_id)["lifecycle"] == "READY"

    # Activate panel
    contract.activate_panel(r_id)
    r = contract.get_round(r_id)
    assert r["lifecycle"] == "ACTIVE"
    assert len(r["active_panel_fingerprint"]) == 64

    eff = contract.get_effective_panel(r_id)
    assert eff["lifecycle"] == "ACTIVE"
    assert len(eff["assignments"]) == 2
    assert eff["assignments"][0]["assigned_reviewer_index"] == 0
    assert eff["assignments"][0]["status"] == "PRIMARY_ACTIVE"
    assert eff["assignments"][1]["assigned_reviewer_index"] == 1
    assert eff["assignments"][1]["status"] == "PRIMARY_ACTIVE"


def test_backup_promotion_when_primary_recused(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    # Quorum 2, 2 applicants, 2 primaries (idx 0, 1), 1 backup (idx 2)
    r_id = contract.create_round("nonce-backup-promo", "Promo Round", 2, 2000000000, 2000001000)

    app0 = "0000-0002-1825-0097"
    app1 = "0000-0001-5109-3700"
    rev0 = "0000-0002-1694-233X"
    rev1 = "0000-0003-0902-4386"
    rev_backup = "0000-0002-1825-0003"

    contract.add_applicant(r_id, make_test_address(0x2000), app0, "Stanford")
    contract.add_applicant(r_id, make_test_address(0x2001), app1, "Harvard")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0, "Stanford", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1, "Oxford", False)
    contract.add_reviewer(r_id, make_test_address(0x4000), rev_backup, "MIT", True)

    contract.set_assignment(r_id, 0, 0, "2")
    contract.set_assignment(r_id, 1, 1, "2")
    contract.freeze_round(r_id)
    _acknowledge_all(
        contract,
        gl,
        [
            make_test_address(0x2000),
            make_test_address(0x2001),
            make_test_address(0x3000),
            make_test_address(0x3001),
            make_test_address(0x4000),
        ],
    )

    # Setup ORCID with verified employment for app0 and rev0 at Stanford
    app0_data = {
        "orcid-identifier": {"path": app0},
        "history": {"last-modified-date": {"value": 1700000000000}},
        "activities-summary": {"employments": {"affiliation-group": [{"summaries": [{"employment-summary": {"organization": {"name": "Stanford University"}, "end-date": None}}]}]}},
    }
    rev0_data = {
        "orcid-identifier": {"path": rev0},
        "history": {"last-modified-date": {"value": 1700000000000}},
        "activities-summary": {"employments": {"affiliation-group": [{"summaries": [{"employment-summary": {"organization": {"name": "Stanford University"}, "end-date": None}}]}]}},
    }
    web_manager.register("GET", f"pub.orcid.org/v3.0/{app0}/record", MockWebResponse(200, json.dumps(app0_data)))
    web_manager.register("GET", f"pub.orcid.org/v3.0/{rev0}/record", MockWebResponse(200, json.dumps(rev0_data)))

    for orcid in [app1, rev1, rev_backup]:
        d = {"orcid-identifier": {"path": orcid}, "history": {"last-modified-date": {"value": 1700000000000}}, "activities-summary": {"employments": {"affiliation-group": []}}}
        web_manager.register("GET", f"pub.orcid.org/v3.0/{orcid}/record", MockWebResponse(200, json.dumps(d)))
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": []}})))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(200, json.dumps({"results": []})))

    # Screen pairs
    contract.screen_pair(r_id, 0, 0)
    assert contract.get_pair_assessment(r_id, 0, 0)["consequence"] == "RECUSED"

    contract.screen_pair(r_id, 0, 2)
    assert contract.get_pair_assessment(r_id, 0, 2)["consequence"] == "ELIGIBLE"

    contract.screen_pair(r_id, 1, 1)
    assert contract.get_pair_assessment(r_id, 1, 1)["consequence"] == "ELIGIBLE"

    contract.screen_pair(r_id, 1, 2)
    assert contract.get_pair_assessment(r_id, 1, 2)["consequence"] == "ELIGIBLE"

    # Finalize -> READY
    contract.finalize_screening(r_id)
    assert contract.get_round(r_id)["lifecycle"] == "READY"

    # Activate
    contract.activate_panel(r_id)
    eff = contract.get_effective_panel(r_id)
    assert eff["assignments"][0]["assigned_reviewer_index"] == 2
    assert eff["assignments"][0]["status"] == "BACKUP_ACTIVE"
    assert eff["assignments"][1]["assigned_reviewer_index"] == 1
    assert eff["assignments"][1]["status"] == "PRIMARY_ACTIVE"


def test_insufficient_backups_yields_hold_and_blocks_activation(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    # Quorum 2, 2 applicants, 2 primaries, NO backups
    r_id = contract.create_round("nonce-no-backup", "No Backup Round", 2, 2000000000, 2000001000)

    app0 = "0000-0002-1825-0097"
    app1 = "0000-0001-5109-3700"
    rev0 = "0000-0002-1694-233X"
    rev1 = "0000-0003-0902-4386"

    contract.add_applicant(r_id, make_test_address(0x2000), app0, "Stanford")
    contract.add_applicant(r_id, make_test_address(0x2001), app1, "Harvard")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0, "Stanford", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1, "Oxford", False)

    contract.set_assignment(r_id, 0, 0, "")
    contract.set_assignment(r_id, 1, 1, "")
    contract.freeze_round(r_id)
    _acknowledge_all(
        contract,
        gl,
        [make_test_address(0x2000), make_test_address(0x2001), make_test_address(0x3000), make_test_address(0x3001)],
    )

    app0_data = {
        "orcid-identifier": {"path": app0},
        "history": {"last-modified-date": {"value": 1700000000000}},
        "activities-summary": {"employments": {"affiliation-group": [{"summaries": [{"employment-summary": {"organization": {"name": "Stanford University"}, "end-date": None}}]}]}},
    }
    rev0_data = {
        "orcid-identifier": {"path": rev0},
        "history": {"last-modified-date": {"value": 1700000000000}},
        "activities-summary": {"employments": {"affiliation-group": [{"summaries": [{"employment-summary": {"organization": {"name": "Stanford University"}, "end-date": None}}]}]}},
    }
    web_manager.register("GET", f"pub.orcid.org/v3.0/{app0}/record", MockWebResponse(200, json.dumps(app0_data)))
    web_manager.register("GET", f"pub.orcid.org/v3.0/{rev0}/record", MockWebResponse(200, json.dumps(rev0_data)))

    for orcid in [app1, rev1]:
        d = {"orcid-identifier": {"path": orcid}, "history": {"last-modified-date": {"value": 1700000000000}}, "activities-summary": {"employments": {"affiliation-group": []}}}
        web_manager.register("GET", f"pub.orcid.org/v3.0/{orcid}/record", MockWebResponse(200, json.dumps(d)))
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": []}})))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(200, json.dumps({"results": []})))

    contract.screen_pair(r_id, 0, 0)  # RECUSED
    contract.screen_pair(r_id, 1, 1)  # ELIGIBLE

    # Finalize -> HOLD (app0 has no eligible candidate)
    contract.finalize_screening(r_id)
    assert contract.get_round(r_id)["lifecycle"] == "HOLD"

    # Activation from HOLD must fail
    with pytest.raises(UserError, match="Cannot activate panel: round must be in READY state"):
        contract.activate_panel(r_id)


def test_unscreened_pair_blocks_finalize(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    r_id = contract.create_round("nonce-unscreened", "Unscreened Round", 2, 2000000000, 2000001000)
    app0 = "0000-0002-1825-0097"
    app1 = "0000-0001-5109-3700"
    rev0 = "0000-0002-1694-233X"
    rev1 = "0000-0003-0902-4386"

    contract.add_applicant(r_id, make_test_address(0x2000), app0, "Stanford")
    contract.add_applicant(r_id, make_test_address(0x2001), app1, "Harvard")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0, "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1, "Oxford", False)

    contract.set_assignment(r_id, 0, 0, "")
    contract.set_assignment(r_id, 1, 1, "")
    contract.freeze_round(r_id)
    _acknowledge_all(
        contract,
        gl,
        [make_test_address(0x2000), make_test_address(0x2001), make_test_address(0x3000), make_test_address(0x3001)],
    )

    _setup_clean_sources_for_all([app0, app1, rev0, rev1])

    # Screen only pair (0, 0); pair (1, 1) remains unscreened
    contract.screen_pair(r_id, 0, 0)

    with pytest.raises(UserError, match="Primary pair .* unscreened"):
        contract.finalize_screening(r_id)


def test_missing_frozen_acknowledgement_blocks_finalize(contract, gl):
    gl.message.sender_address = make_test_address(0x1000)
    r_id = contract.create_round("nonce-missing-ack", "Missing Ack", 2, 2000000000, 2000001000)
    app0 = "0000-0002-1825-0097"
    rev0 = "0000-0001-5109-3700"
    rev1 = "0000-0003-0902-4386"
    contract.add_applicant(r_id, make_test_address(0x2000), app0, "Stanford")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0, "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1, "Oxford", False)
    contract.set_assignment(r_id, 0, 0, "")
    contract.freeze_round(r_id)
    _setup_clean_sources_for_all([app0, rev0, rev1])
    contract.screen_pair(r_id, 0, 0)

    with pytest.raises(UserError, match="Applicant 0 has not acknowledged"):
        contract.finalize_screening(r_id)

    gl.message.sender_address = make_test_address(0x2000)
    contract.acknowledge_identity(r_id)
    gl.message.sender_address = make_test_address(0x1000)
    with pytest.raises(UserError, match="Reviewer 0 has not acknowledged"):
        contract.finalize_screening(r_id)
