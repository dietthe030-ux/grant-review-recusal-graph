import json

import pytest

from tests.direct.conftest import (
    MockWebResponse,
    UserError,
    make_test_address,
    web_manager,
)


def test_freeze_immutability(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    r_id = contract.create_round("nonce-freeze-immut", "Immutability Round", 2, 2000000000, 2000001000)
    app0 = "0000-0002-1825-0097"
    rev0 = "0000-0001-5109-3700"
    rev1 = "0000-0003-0902-4386"

    contract.add_applicant(r_id, make_test_address(0x2000), app0, "Stanford")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0, "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1, "Oxford", False)
    contract.set_assignment(r_id, 0, 0, "")
    contract.freeze_round(r_id)

    # After freeze, admin cannot add applicant
    with pytest.raises(UserError, match="Cannot add applicant: round is not in DRAFT"):
        contract.add_applicant(r_id, make_test_address(0x2002), "0000-0002-1694-233X", "Harvard")

    # After freeze, admin cannot add reviewer
    with pytest.raises(UserError, match="Cannot add reviewer: round is not in DRAFT"):
        contract.add_reviewer(r_id, make_test_address(0x3002), "0000-0002-1694-233X", "Harvard", False)

    # After freeze, admin cannot modify assignment
    with pytest.raises(UserError, match="Cannot set assignment: round is not in DRAFT"):
        contract.set_assignment(r_id, 0, 1, "")

    # After freeze, admin cannot cancel round
    with pytest.raises(UserError, match="Cannot cancel: round is not in DRAFT"):
        contract.cancel_round(r_id)


def test_unauthorized_activation(contract, gl):
    admin = make_test_address(0x1000)
    attacker = make_test_address(0x1337)
    gl.message.sender_address = admin

    r_id = contract.create_round("nonce-unauth-act", "Unauth Act Round", 2, 2000000000, 2000001000)
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

    # Attacker tries to activate
    gl.message.sender_address = attacker
    with pytest.raises(UserError, match="Unauthorized: only round admin can activate"):
        contract.activate_panel(r_id)


def test_status_404_vs_599_policy_distinction(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    r_id = contract.create_round("nonce-status-codes", "Status Codes Round", 2, 2000000000, 2000001000)
    app_orcid = "0000-0002-1825-0097"
    rev0_orcid = "0000-0001-5109-3700"
    rev1_orcid = "0000-0003-0902-4386"

    contract.add_applicant(r_id, make_test_address(0x2000), app_orcid, "Stanford")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0_orcid, "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1_orcid, "Oxford", False)
    contract.set_assignment(r_id, 0, 0, "")
    contract.freeze_round(r_id)

    # 1. ORCID 404 Not Found -> valid_id False -> fails closed to UNRESOLVED / EVIDENCE_HOLD
    web_manager.register("GET", f"pub.orcid.org/v3.0/{app_orcid}/record", MockWebResponse(404, b"Not Found"))
    web_manager.register("GET", f"pub.orcid.org/v3.0/{rev0_orcid}/record", MockWebResponse(200, json.dumps({"orcid-identifier": {"path": rev0_orcid}})))
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": []}})))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(200, json.dumps({"results": []})))

    contract.screen_pair(r_id, 0, 0)
    pa_404 = contract.get_pair_assessment(r_id, 0, 0)
    assert pa_404["outcome"] == "UNRESOLVED"
    assert pa_404["consequence"] == "EVIDENCE_HOLD"

    # 2. HTTP 599 Network Gateway Timeout on NIH -> fails closed to UNRESOLVED / EVIDENCE_HOLD
    app_data = {"orcid-identifier": {"path": app_orcid}, "activities-summary": {"employments": {"affiliation-group": []}}}
    web_manager.register("GET", f"pub.orcid.org/v3.0/{app_orcid}/record", MockWebResponse(200, json.dumps(app_data)))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(599, b"Network Gateway Timeout"))

    contract.screen_pair(r_id, 0, 0)
    pa_599 = contract.get_pair_assessment(r_id, 0, 0)
    assert pa_599["outcome"] == "UNRESOLVED"
    assert pa_599["consequence"] == "EVIDENCE_HOLD"
    assert pa_599["attempt"] == 2


@pytest.mark.parametrize(
    "failure_case",
    [
        "pubmed_search_404",
        "pubmed_summary_404",
        "nih_404",
        "malformed_pubmed_200",
        "nih_missing_project_id",
        "nih_wrong_item_type",
        "nih_unusable_fields",
    ],
)
def test_required_source_failure_never_clears_pair(contract, gl, failure_case):
    gl.message.sender_address = make_test_address(0x1000)
    app_orcid = "0000-0002-1825-0097"
    rev0_orcid = "0000-0001-5109-3700"
    rev1_orcid = "0000-0003-0902-4386"
    r_id = contract.create_round(f"nonce-{failure_case}", "Source Failure", 2, 2000000000, 2000001000)
    contract.add_applicant(r_id, make_test_address(0x2000), app_orcid, "Stanford")
    contract.add_reviewer(r_id, make_test_address(0x3000), rev0_orcid, "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x3001), rev1_orcid, "Oxford", False)
    contract.set_assignment(r_id, 0, 0, "")
    contract.freeze_round(r_id)

    for orcid in (app_orcid, rev0_orcid):
        record = {
            "orcid-identifier": {"path": orcid},
            "history": {"last-modified-date": {"value": 1700000000000}},
            "activities-summary": {"employments": {"affiliation-group": []}},
        }
        web_manager.register(
            "GET",
            f"pub.orcid.org/v3.0/{orcid}/record",
            MockWebResponse(200, json.dumps(record)),
        )

    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": []}})))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(200, json.dumps({"results": []})))
    if failure_case == "pubmed_search_404":
        web_manager.register("GET", "esearch.fcgi", MockWebResponse(404, "Not found"))
    elif failure_case == "pubmed_summary_404":
        web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": ["1"]}})))
        web_manager.register("GET", "esummary.fcgi", MockWebResponse(404, "Not found"))
    elif failure_case == "nih_404":
        web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(404, "Not found"))
    elif failure_case == "nih_missing_project_id":
        web_manager.register(
            "POST",
            "reporter.nih.gov/v2/projects/search",
            MockWebResponse(200, json.dumps({"results": [{"is_active": True}]})),
        )
    elif failure_case == "nih_wrong_item_type":
        web_manager.register(
            "POST",
            "reporter.nih.gov/v2/projects/search",
            MockWebResponse(200, json.dumps({"results": ["not-an-object"]})),
        )
    elif failure_case == "nih_unusable_fields":
        web_manager.register(
            "POST",
            "reporter.nih.gov/v2/projects/search",
            MockWebResponse(
                200,
                json.dumps({"results": [{"project_num": "P1", "is_active": "yes", "project_end_date": "unknown"}]}),
            ),
        )
    else:
        web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({})))

    contract.screen_pair(r_id, 0, 0)
    assessment = contract.get_pair_assessment(r_id, 0, 0)
    assert assessment["outcome"] == "UNRESOLVED"
    assert assessment["consequence"] == "EVIDENCE_HOLD"


def test_assignment_validation_and_duplicate_backups(contract, gl):
    admin = make_test_address(0x1000)
    gl.message.sender_address = admin

    r_id = contract.create_round("nonce-ass-val", "Assignment Validation", 2, 2000000000, 2000001000)
    contract.add_applicant(r_id, make_test_address(0x2000), "0000-0002-1825-0097", "Stanford")
    contract.add_reviewer(r_id, make_test_address(0x3000), "0000-0001-5109-3700", "MIT", False)
    contract.add_reviewer(r_id, make_test_address(0x4000), "0000-0002-1694-233X", "Oxford", True)
    contract.add_reviewer(r_id, make_test_address(0x4001), "0000-0003-0902-4386", "Harvard", True)

    # Primary reviewer as backup fails
    with pytest.raises(UserError, match="Primary reviewer cannot also be a backup"):
        contract.set_assignment(r_id, 0, 0, "0")

    # Duplicate backup indices fail
    with pytest.raises(UserError, match="Duplicate backup reviewer indices"):
        contract.set_assignment(r_id, 0, 0, "1,1")

    # Non-backup role as backup fails
    contract.add_reviewer(r_id, make_test_address(0x3001), "0000-0002-1825-0046", "Yale", False)
    with pytest.raises(UserError, match="is not a BACKUP_REVIEWER"):
        contract.set_assignment(r_id, 0, 0, "3")
