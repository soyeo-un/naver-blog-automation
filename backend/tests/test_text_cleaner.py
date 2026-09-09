import pytest
from app.services.text_cleaner import TextCleaner


def test_removes_zero_width_space():
    dirty = "안녕\u200b하세요"
    result = TextCleaner.clean(dirty)
    assert result == "안녕하세요"


def test_removes_all_invisible_chars():
    dirty = "테\u200b스\u200c트\u200d문\u2060자\ufeff열\u00ad끝"
    result = TextCleaner.clean(dirty)
    assert result == "테스트문자열끝"


def test_preserves_normal_whitespace():
    text = "안녕하세요\n줄바꿈\t탭 공백"
    result = TextCleaner.clean(text)
    assert result == text


def test_scan_reports_positions():
    dirty = "안녕\u200b하세요\u200c끝"
    report = TextCleaner.scan(dirty)
    assert report["total_hidden"] == 2
    assert len(report["positions"]) == 2
    assert report["positions"][0]["index"] == 2
    assert report["positions"][0]["char_name"] == "ZERO WIDTH SPACE"


def test_clean_text_is_safe():
    clean = "완전히 깨끗한 텍스트입니다."
    report = TextCleaner.scan(clean)
    assert report["is_clean"] is True
    assert report["total_hidden"] == 0


def test_clean_html_preserves_tags():
    html = '<p>안녕\u200b하세요</p><a href="test\u200b">링크</a>'
    result = TextCleaner.clean_html(html)
    assert result == '<p>안녕하세요</p><a href="test\u200b">링크</a>'


def test_clean_html_removes_from_text_nodes_only():
    html = '<div class="test">텍\u200b스트</div>'
    result = TextCleaner.clean_html(html)
    assert "텍스트" in result
    assert "\u200b" not in result.split(">")[1].split("<")[0]
