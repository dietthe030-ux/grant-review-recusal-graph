import json

from contracts.grant_review_recusal_graph import (
    _compute_fingerprint,
    _derive_screening_result,
    _validator_screen,
)
from tests.direct.conftest import MockReturn, MockWebResponse, genlayer_mod, web_manager


def _setup_clean_sources(app_orcid: str, rev_orcid: str):
    app_data = {
        "orcid-identifier": {"path": app_orcid},
        "history": {"last-modified-date": {"value": 1700000000000}},
        "activities-summary": {"employments": {"affiliation-group": []}},
    }
    rev_data = {
        "orcid-identifier": {"path": rev_orcid},
        "history": {"last-modified-date": {"value": 1700000000000}},
        "activities-summary": {"employments": {"affiliation-group": []}},
    }
    web_manager.register("GET", f"pub.orcid.org/v3.0/{app_orcid}/record", MockWebResponse(200, json.dumps(app_data)))
    web_manager.register("GET", f"pub.orcid.org/v3.0/{rev_orcid}/record", MockWebResponse(200, json.dumps(rev_data)))
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": []}})))
    web_manager.register("POST", "reporter.nih.gov/v2/projects/search", MockWebResponse(200, json.dumps({"results": []})))


def test_validator_accepts_honest_consensus():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"
    _setup_clean_sources(app_orcid, rev_orcid)

    now_ts = 1771977600
    expected = _derive_screening_result(app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts)
    expected["fingerprint"] = _compute_fingerprint(expected, app_orcid, rev_orcid)

    res = _validator_screen(
        MockReturn(expected),
        app_orcid,
        rev_orcid,
        "Stanford",
        "MIT",
        0,
        0,
        now_ts,
    )
    assert res is True


def test_validator_rejects_false_eligible_claim():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"

    # Evidence actually has recent conflict
    _setup_clean_sources(app_orcid, rev_orcid)
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": ["38501234"]}})))
    web_manager.register("GET", "esummary.fcgi", MockWebResponse(200, json.dumps({
        "result": {"38501234": {"pubdate": "2024 May 12", "sortpubdate": "2024/05/12"}}
    })))

    now_ts = 1771977600
    # Dishonest leader claims NO_PUBLIC_CONFLICT_FOUND / ELIGIBLE
    false_leader_payload = {
        "schema_version": "1.0",
        "policy_version": "GRRG-V1",
        "applicant_index": 0,
        "reviewer_index": 0,
        "app_orcid": app_orcid,
        "rev_orcid": rev_orcid,
        "source_statuses": {"orcid_applicant": 200, "orcid_reviewer": 200, "pubmed": 200, "nih_reporter": 200},
        "relationship_band": "NONE",
        "shared_pmids": [],
        "shared_projects": [],
        "temporal_band": "NONE",
        "outcome": "NO_PUBLIC_CONFLICT_FOUND",
        "consequence": "ELIGIBLE",
        "reason_code": "NO_CONFLICT_DETECTED",
        "observed_at": now_ts,
        "explanation": "Full coverage across ORCID, PubMed, and NIH RePORTER; no public conflict found",
    }
    false_leader_payload["fingerprint"] = _compute_fingerprint(false_leader_payload, app_orcid, rev_orcid)

    # Validator must reject because independent re-derivation shows RECUSED
    res = _validator_screen(
        MockReturn(false_leader_payload),
        app_orcid,
        rev_orcid,
        "Stanford",
        "MIT",
        0,
        0,
        now_ts,
    )
    assert res is False


def test_validator_accepts_recusal_with_validator_local_evidence_variance():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"
    _setup_clean_sources(app_orcid, rev_orcid)
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({
        "esearchresult": {"idlist": ["38501234"]}
    })))
    web_manager.register("GET", "esummary.fcgi", MockWebResponse(200, json.dumps({
        "result": {"38501234": {"pubdate": "2024 May 12", "sortpubdate": "2024/05/12"}}
    })))

    now_ts = 1771977600
    leader = _derive_screening_result(app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts)
    leader["shared_pmids"] = ["38501234", "validator-local-extra"]
    leader["explanation"] = "Leader-local verified recusal evidence"
    leader["fingerprint"] = _compute_fingerprint(leader, app_orcid, rev_orcid)

    assert _validator_screen(MockReturn(leader), app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts) is True


def test_validator_rejects_cross_outcome_substitution_with_same_consequence():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"
    _setup_clean_sources(app_orcid, rev_orcid)
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({
        "esearchresult": {"idlist": ["38501234"]}
    })))
    web_manager.register("GET", "esummary.fcgi", MockWebResponse(200, json.dumps({
        "result": {"38501234": {"pubdate": "2024 May 12", "sortpubdate": "2024/05/12"}}
    })))

    now_ts = 1771977600
    leader = _derive_screening_result(app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts)
    assert leader["outcome"] == "DIRECT_RECENT_COLLABORATION"
    leader["outcome"] = "CURRENT_INSTITUTIONAL_OVERLAP"
    leader["fingerprint"] = _compute_fingerprint(leader, app_orcid, rev_orcid)

    assert _validator_screen(MockReturn(leader), app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts) is False


def test_validator_rejects_tampered_fingerprint_or_schema():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"
    _setup_clean_sources(app_orcid, rev_orcid)

    now_ts = 1771977600
    base_payload = _derive_screening_result(app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts)
    base_payload["fingerprint"] = "bad_hash_00000000000000000000000000000000000000000000000000000000"

    # Bad fingerprint rejected
    assert _validator_screen(MockReturn(base_payload), app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts) is False

    # Wrong schema version rejected
    base_payload["schema_version"] = "2.0"
    assert _validator_screen(MockReturn(base_payload), app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts) is False

    # Non-Return result rejected
    assert _validator_screen("not a return", app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts) is False


def test_missing_pubdate_yields_unresolved():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"
    _setup_clean_sources(app_orcid, rev_orcid)

    # PubMed returns PMID with missing/unparseable date
    web_manager.register("GET", "esearch.fcgi", MockWebResponse(200, json.dumps({"esearchresult": {"idlist": ["12345678"]}})))
    web_manager.register("GET", "esummary.fcgi", MockWebResponse(200, json.dumps({
        "result": {"12345678": {"pubdate": "No Date Available", "sortpubdate": ""}}
    })))

    now_ts = 1771977600
    res = _derive_screening_result(app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, now_ts)
    assert res["outcome"] == "UNRESOLVED"
    assert res["consequence"] == "EVIDENCE_HOLD"
    assert res["reason_code"] == "MISSING_DATE"


def test_malformed_ai_interpretation_fails_closed():
    app_orcid = "0000-0002-1825-0097"
    rev_orcid = "0000-0001-5109-3700"
    _setup_clean_sources(app_orcid, rev_orcid)
    genlayer_mod.gl.nondet.prompt_response = "not-json"

    res = _derive_screening_result(app_orcid, rev_orcid, "Stanford", "MIT", 0, 0, 1771977600)

    assert res["outcome"] == "UNRESOLVED"
    assert res["consequence"] == "EVIDENCE_HOLD"
    assert res["reason_code"] == "AI_INTERPRETATION_DISAGREEMENT"
