import json
from pathlib import Path

import pytest
from gltest.direct.loader import deploy_contract
from gltest.direct.sdk_loader import setup_sdk_paths
from gltest.direct.vm import VMContext

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "grant_review_recusal_graph.py"
setup_sdk_paths(CONTRACT_PATH)

from genlayer import gl
from genlayer.py.types import Address


def _address(value: int) -> Address:
    return Address(value.to_bytes(20, "big"))


def test_pinned_runtime_constructor_and_deterministic_lifecycle() -> None:
    upgrader = _address(0x9999)
    admin = _address(0x1000)
    applicant = _address(0x2000)
    primary = _address(0x3000)
    second_primary = _address(0x3500)
    backup = _address(0x4000)
    vm = VMContext()

    with vm.activate():
        with vm.prank(admin):
            contract = deploy_contract(CONTRACT_PATH, vm, upgrader)
            round_id = contract.create_round(
                "runtime-smoke",
                "Runtime smoke round",
                2,
                4_102_444_800,
                4_102_444_800,
            )
            # genlayer-js submits Address arguments as canonical hex strings.
            contract.add_applicant(round_id, applicant.as_hex, "0000-0001-5109-3700", "Alpha Research")
            contract.add_reviewer(round_id, primary.as_hex, "0000-0002-1825-0097", "Beta Labs", False)
            contract.add_reviewer(round_id, second_primary, "0000-0002-1825-0011", "Gamma Center", False)
            contract.add_reviewer(round_id, backup, "0000-0002-1694-233X", "Delta Group", True)
            contract.set_assignment(round_id, 0, 0, "2")
            contract.freeze_round(round_id)

        vm.mock_web("https://.*", {"status": 404, "body": "", "method": "GET"})
        vm.mock_web("https://.*", {"status": 404, "body": "", "method": "POST"})
        with vm.prank(admin):
            contract.screen_pair(round_id, 0, 0)
        assert vm.run_validator() is True

        assert contract.get_upgrader() == upgrader
        assert contract.get_round(round_id)["admin"] == admin.as_hex
        assert contract.get_participant(round_id, 0)["wallet"] == applicant.as_hex
        assert contract.get_participant(round_id, 0, True)["wallet"] == primary.as_hex
        assert contract.get_participant(round_id, 1, True)["wallet"] == second_primary.as_hex
        assert contract.get_participant(round_id, 2, True)["wallet"] == backup.as_hex
        assert contract.get_assignment(round_id, 0)["backup_indexes_csv"] == "2"
        assert contract.get_round_id_by_nonce(admin, "runtime-smoke") == round_id
        assert contract.get_round(round_id)["lifecycle"] == "SCREENING"
        assessment = contract.get_pair_assessment(round_id, 0, 0)
        assert assessment["outcome"] == "UNRESOLVED"
        assert assessment["consequence"] == "EVIDENCE_HOLD"

        vm.clear_mocks()
        for orcid in ("0000-0001-5109-3700", "0000-0002-1825-0097", "0000-0002-1694-233X"):
            vm.mock_web(
                f"https://pub\\.orcid\\.org/v3\\.0/{orcid}/record",
                {
                    "status": 200,
                    "body": json.dumps(
                        {
                            "orcid-identifier": {"path": orcid},
                            "history": {"last-modified-date": {"value": 1_700_000_000}},
                            "activities-summary": {"employments": {"affiliation-group": []}},
                        }
                    ),
                    "method": "GET",
                },
            )
        vm.mock_web(
            "https://eutils\\.ncbi\\.nlm\\.nih\\.gov/entrez/eutils/esearch\\.fcgi.*",
            {"status": 200, "body": json.dumps({"esearchresult": {"idlist": []}}), "method": "GET"},
        )
        vm.mock_web(
            "https://api\\.reporter\\.nih\\.gov/v2/projects/search",
            {"status": 200, "body": json.dumps({"results": []}), "method": "POST"},
        )
        vm.mock_llm(
            ".*",
            json.dumps(
                {
                    "outcome": "NO_PUBLIC_CONFLICT_FOUND",
                    "consequence": "ELIGIBLE",
                    "reason_code": "NO_CONFLICT_DETECTED",
                    "relationship_band": "NONE",
                    "temporal_band": "NONE",
                }
            ),
        )
        assert gl.nondet.exec_prompt("probe", response_format="json")["outcome"] == "NO_PUBLIC_CONFLICT_FOUND"
        with vm.prank(admin):
            contract.screen_pair(round_id, 0, 0)
        assert vm.run_validator() is True
        retried = contract.get_pair_assessment(round_id, 0, 0)
        assert retried["attempt"] == 2
        assert retried["source_statuses"] == {
            "orcid_applicant": 200,
            "orcid_reviewer": 200,
            "pubmed": 200,
            "nih_reporter": 200,
        }, retried
        assert retried["reason_code"] == "NO_CONFLICT_DETECTED", retried["reason_code"]
        assert retried["outcome"] == "NO_PUBLIC_CONFLICT_FOUND", retried
        assert retried["consequence"] == "ELIGIBLE"

        with vm.prank(admin):
            contract.screen_pair(round_id, 0, 2)
        assert vm.run_validator() is True
        assert contract.get_pair_assessment(round_id, 0, 2)["consequence"] == "ELIGIBLE"

        for participant in (applicant, primary, backup):
            with vm.prank(participant):
                contract.acknowledge_identity(round_id)
        with vm.prank(admin):
            contract.finalize_screening(round_id)
        assert contract.get_round(round_id)["lifecycle"] == "HOLD"

        with vm.prank(admin), pytest.raises(Exception, match="Unauthorized: only upgrader"):
            contract.upgrade(CONTRACT_PATH.read_bytes())
        with vm.prank(upgrader):
            contract.upgrade(CONTRACT_PATH.read_bytes())
