from contracts.grant_review_recusal_graph import (
    _institutions_overlap,
    _normalize_institution,
    _validate_orcid,
)


def test_valid_orcid_checksums():
    # Canonical valid ORCIDs with numeric check digits
    assert _validate_orcid("0000-0002-1825-0097") is True
    assert _validate_orcid("0000-0001-5109-3700") is True
    assert _validate_orcid("0000-0002-1694-233X") is True  # 'X' check digit
    assert _validate_orcid("0000-0003-0902-4386") is True


def test_invalid_orcid_formats_and_checksums():
    # Bad lengths and delimiters
    assert _validate_orcid("") is False
    assert _validate_orcid("0000000218250097") is False
    assert _validate_orcid("0000-0002-1825-009") is False
    assert _validate_orcid("0000-0002-1825-00970") is False
    assert _validate_orcid("0000/0002/1825/0097") is False
    assert _validate_orcid("0000-0002-1825-009a") is False
    assert _validate_orcid("abcd-0002-1825-0097") is False

    # Checksum failure (modified last digit)
    assert _validate_orcid("0000-0002-1825-0098") is False
    assert _validate_orcid("0000-0002-1825-0090") is False
    assert _validate_orcid("0000-0002-1694-2330") is False
    assert _validate_orcid("0000-0002-1694-2339") is False

    # Non-string types
    assert _validate_orcid(None) is False
    assert _validate_orcid(1234567890123456) is False


def test_institution_normalization_and_overlap():
    assert _normalize_institution("Stanford University, CA") == "stanford university ca"
    assert _normalize_institution("  Harvard   Medical   School!  ") == "harvard medical school"
    assert _normalize_institution("") == ""

    # Exact overlap
    assert _institutions_overlap("Stanford University", "Stanford University") is True
    assert _institutions_overlap("Stanford University", "stanford university") is True
    assert _institutions_overlap("Stanford University, School of Medicine", "Stanford University") is True
    assert _institutions_overlap("MIT", "Massachusetts Institute of Technology") is False
    assert _institutions_overlap("University of Oxford", "Oxford University") is True

    # Empty institution returns False
    assert _institutions_overlap("", "Stanford University") is False
    assert _institutions_overlap("Stanford University", "") is False
